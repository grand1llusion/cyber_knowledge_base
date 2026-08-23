#!/usr/bin/env bash
#
# Removes everything deploy.sh created. Use if you want to tear the project
# down after the challenge (or before redeploying from scratch).
#
# Usage: cd deploy && ./teardown.sh

set -euo pipefail

AWS_REGION="${AWS_REGION:-us-east-1}"
FUNCTION_NAME="${FUNCTION_NAME:-otics-threat-storyteller}"
ROLE_NAME="${ROLE_NAME:-otics-threat-storyteller-role}"
RULE_NAME="${RULE_NAME:-otics-threat-storyteller-daily}"

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text --region "$AWS_REGION")"
BUCKET_NAME="${BUCKET_NAME:-otics-storyteller-$ACCOUNT_ID}"

echo "This will delete:"
echo "  - Lambda function:   $FUNCTION_NAME"
echo "  - EventBridge rule:  $RULE_NAME"
echo "  - IAM role:          $ROLE_NAME"
echo "  - S3 bucket + ALL CONTENTS: $BUCKET_NAME"
read -r -p "Type 'delete' to confirm: " CONFIRM
[ "$CONFIRM" = "delete" ] || { echo "Aborted."; exit 1; }

aws events remove-targets --rule "$RULE_NAME" --region "$AWS_REGION" --ids 1 2>/dev/null || true
aws events delete-rule --name "$RULE_NAME" --region "$AWS_REGION" 2>/dev/null || true
aws lambda delete-function --function-name "$FUNCTION_NAME" --region "$AWS_REGION" 2>/dev/null || true
aws iam delete-role-policy --role-name "$ROLE_NAME" --policy-name "otics-storyteller-permissions" 2>/dev/null || true
aws iam delete-role --role-name "$ROLE_NAME" 2>/dev/null || true
aws s3 rm "s3://$BUCKET_NAME" --recursive 2>/dev/null || true
aws s3api delete-bucket --bucket "$BUCKET_NAME" --region "$AWS_REGION" 2>/dev/null || true

echo "Torn down."
