#!/usr/bin/env bash
#
# Deploys the OT/ICS Threat Storyteller agent:
#   S3 bucket (static site) + IAM role + Lambda function + EventBridge daily rule
#
# Prereqs: AWS CLI v2 installed and configured (`aws configure`), Python 3
# and pip available locally, and Bedrock model access enabled for the two
# Nova models below in your target region (see ../docs/SETUP_GUIDE.md).
#
# Usage:
#   cd deploy
#   ./deploy.sh
#
# Safe to re-run: it updates resources in place if they already exist.

set -euo pipefail

# ---- Configuration (edit if you like, sensible defaults otherwise) --------

AWS_REGION="${AWS_REGION:-us-east-1}"
FUNCTION_NAME="${FUNCTION_NAME:-otics-threat-storyteller}"
ROLE_NAME="${ROLE_NAME:-otics-threat-storyteller-role}"
RULE_NAME="${RULE_NAME:-otics-threat-storyteller-daily}"
TEXT_MODEL_ID="${TEXT_MODEL_ID:-amazon.nova-lite-v1:0}"
IMAGE_MODEL_ID="${IMAGE_MODEL_ID:-amazon.nova-canvas-v1:0}"
# 13:00 UTC = 7:00 AM MDT (Denver, daylight time) / 6:00 AM MST (standard time)
SCHEDULE_EXPRESSION="${SCHEDULE_EXPRESSION:-cron(0 13 * * ? *)}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LAMBDA_SRC_DIR="$SCRIPT_DIR/../lambda"
BUILD_DIR="$SCRIPT_DIR/build"
ZIP_PATH="$SCRIPT_DIR/function.zip"

echo "==> Checking AWS CLI credentials..."
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text --region "$AWS_REGION")"
echo "    Account: $ACCOUNT_ID   Region: $AWS_REGION"

BUCKET_NAME="${BUCKET_NAME:-otics-storyteller-$ACCOUNT_ID}"
echo "    Bucket:  $BUCKET_NAME"

# ---- 1. S3 bucket -----------------------------------------------------------

echo "==> Creating/verifying S3 bucket..."
if ! aws s3api head-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION" 2>/dev/null; then
  if [ "$AWS_REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION"
  else
    aws s3api create-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION" \
      --create-bucket-configuration LocationConstraint="$AWS_REGION"
  fi
else
  echo "    Bucket already exists, reusing it."
fi

echo "==> Allowing a public bucket policy (site content is meant to be public)..."
aws s3api put-public-access-block --bucket "$BUCKET_NAME" --region "$AWS_REGION" --public-access-block-configuration \
  '{"BlockPublicAcls":true,"IgnorePublicAcls":true,"BlockPublicPolicy":false,"RestrictPublicBuckets":false}'

cat > "$SCRIPT_DIR/bucket-policy.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET_NAME/*"
    }
  ]
}
EOF
aws s3api put-bucket-policy --bucket "$BUCKET_NAME" --region "$AWS_REGION" --policy "file://$SCRIPT_DIR/bucket-policy.json"

echo "==> Enabling static website hosting..."
aws s3api put-bucket-website --bucket "$BUCKET_NAME" --region "$AWS_REGION" --website-configuration \
  '{"IndexDocument":{"Suffix":"index.html"}}'

echo "==> Seeding a placeholder index.html (overwritten on first run)..."
cat > "$SCRIPT_DIR/placeholder.html" <<'EOF'
<!doctype html><html><head><meta charset="utf-8">
<title>OT/ICS Threat Storyteller</title></head>
<body style="font-family:sans-serif;background:#0b0f14;color:#d7e1e8;padding:3rem;">
<h1>OT/ICS Threat Storyteller</h1>
<p>First story is generating on the daily schedule (or run the Lambda once manually) — check back soon.</p>
</body></html>
EOF
aws s3 cp "$SCRIPT_DIR/placeholder.html" "s3://$BUCKET_NAME/index.html" --content-type "text/html" --region "$AWS_REGION"

# ---- 2. IAM role for the Lambda ---------------------------------------------

echo "==> Creating/verifying IAM role..."
cat > "$SCRIPT_DIR/trust-policy.json" <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {"Service": "lambda.amazonaws.com"},
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

if ! aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws iam create-role --role-name "$ROLE_NAME" \
    --assume-role-policy-document "file://$SCRIPT_DIR/trust-policy.json" >/dev/null
  ROLE_IS_NEW=1
else
  echo "    Role already exists, reusing it."
  ROLE_IS_NEW=0
fi

cat > "$SCRIPT_DIR/permissions-policy.json" <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "Logs",
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:$AWS_REGION:$ACCOUNT_ID:*"
    },
    {
      "Sid": "BedrockInvoke",
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel"],
      "Resource": [
        "arn:aws:bedrock:$AWS_REGION::foundation-model/$TEXT_MODEL_ID",
        "arn:aws:bedrock:$AWS_REGION::foundation-model/$IMAGE_MODEL_ID"
      ]
    },
    {
      "Sid": "SiteBucket",
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::$BUCKET_NAME",
        "arn:aws:s3:::$BUCKET_NAME/*"
      ]
    }
  ]
}
EOF
aws iam put-role-policy --role-name "$ROLE_NAME" --policy-name "otics-storyteller-permissions" \
  --policy-document "file://$SCRIPT_DIR/permissions-policy.json"

ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"

if [ "${ROLE_IS_NEW:-0}" = "1" ]; then
  echo "==> Waiting ~10s for IAM role propagation..."
  sleep 10
fi

# ---- 3. Package and deploy the Lambda function -------------------------------

echo "==> Packaging Lambda function (vendoring a current boto3 for Nova/Bedrock support)..."
rm -rf "$BUILD_DIR" "$ZIP_PATH"
mkdir -p "$BUILD_DIR"
# python3 -m pip works whether the system exposes `pip`, `pip3`, or neither;
# newer Ubuntu needs --break-system-packages, older versions reject the flag.
python3 -m pip install --quiet --upgrade -t "$BUILD_DIR" boto3 --break-system-packages 2>/dev/null \
  || python3 -m pip install --quiet --upgrade -t "$BUILD_DIR" boto3
cp "$LAMBDA_SRC_DIR"/*.py "$BUILD_DIR/"

( cd "$BUILD_DIR" && zip -q -r "$ZIP_PATH" . )
echo "    Package size: $(du -h "$ZIP_PATH" | cut -f1)"

ENV_VARS="Variables={BUCKET_NAME=$BUCKET_NAME,TEXT_MODEL_ID=$TEXT_MODEL_ID,IMAGE_MODEL_ID=$IMAGE_MODEL_ID,BEDROCK_REGION=$AWS_REGION}"

if aws lambda get-function --function-name "$FUNCTION_NAME" --region "$AWS_REGION" >/dev/null 2>&1; then
  echo "==> Updating existing Lambda function code..."
  aws lambda update-function-code --function-name "$FUNCTION_NAME" --region "$AWS_REGION" \
    --zip-file "fileb://$ZIP_PATH" >/dev/null
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$AWS_REGION"
  echo "==> Updating configuration..."
  aws lambda update-function-configuration --function-name "$FUNCTION_NAME" --region "$AWS_REGION" \
    --timeout 180 --memory-size 512 --environment "$ENV_VARS" >/dev/null
  aws lambda wait function-updated --function-name "$FUNCTION_NAME" --region "$AWS_REGION"
else
  echo "==> Creating Lambda function..."
  aws lambda create-function --function-name "$FUNCTION_NAME" --region "$AWS_REGION" \
    --runtime python3.12 --handler lambda_function.handler --role "$ROLE_ARN" \
    --timeout 180 --memory-size 512 --environment "$ENV_VARS" \
    --zip-file "fileb://$ZIP_PATH" >/dev/null
  aws lambda wait function-active --function-name "$FUNCTION_NAME" --region "$AWS_REGION"
fi

# ---- 4. EventBridge daily schedule -------------------------------------------

echo "==> Creating/updating EventBridge daily schedule..."
RULE_ARN="$(aws events put-rule --name "$RULE_NAME" --region "$AWS_REGION" \
  --schedule-expression "$SCHEDULE_EXPRESSION" --state ENABLED \
  --query RuleArn --output text)"

FUNCTION_ARN="$(aws lambda get-function --function-name "$FUNCTION_NAME" --region "$AWS_REGION" \
  --query Configuration.FunctionArn --output text)"

aws lambda add-permission --function-name "$FUNCTION_NAME" --region "$AWS_REGION" \
  --statement-id "AllowEventBridge-$RULE_NAME" --action "lambda:InvokeFunction" \
  --principal events.amazonaws.com --source-arn "$RULE_ARN" >/dev/null 2>&1 || true

aws events put-targets --rule "$RULE_NAME" --region "$AWS_REGION" \
  --targets "Id=1,Arn=$FUNCTION_ARN" >/dev/null

# ---- 5. Smoke test: invoke once now so there's real content immediately -----

echo "==> Invoking once now to generate the first story (this calls Bedrock, ~20-40s)..."
set +e
aws lambda invoke --function-name "$FUNCTION_NAME" --region "$AWS_REGION" \
  --cli-read-timeout 200 "$SCRIPT_DIR/invoke-result.json" >/dev/null
INVOKE_STATUS=$?
set -e

if [ $INVOKE_STATUS -eq 0 ]; then
  echo "    Result: $(cat "$SCRIPT_DIR/invoke-result.json")"
else
  echo "    WARNING: first invoke failed to complete — check CloudWatch Logs for"
  echo "    /aws/lambda/$FUNCTION_NAME. The daily schedule is still set up correctly."
fi

echo ""
echo "=========================================================================="
echo " Done. Your site (public, no login needed):"
if [ "$AWS_REGION" = "us-east-1" ]; then
  echo "   http://$BUCKET_NAME.s3-website-us-east-1.amazonaws.com"
else
  echo "   http://$BUCKET_NAME.s3-website-$AWS_REGION.amazonaws.com"
  echo "   (if that 404s, check the exact endpoint under S3 console > bucket >"
  echo "    Properties > Static website hosting for your region's URL format)"
fi
echo ""
echo " Daily schedule: $SCHEDULE_EXPRESSION (UTC) via EventBridge rule '$RULE_NAME'"
echo " Lambda function: $FUNCTION_NAME"
echo " Logs: aws logs tail /aws/lambda/$FUNCTION_NAME --follow --region $AWS_REGION"
echo "=========================================================================="
