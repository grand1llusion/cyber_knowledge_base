# Setup Guide — OT/ICS Threat Storyteller

Deadline reminder: **Monday, Aug 24, 2026, 1:00 PM PT (2:00 PM your time, Denver)**.
Budget roughly 45-60 minutes for this if everything goes smoothly. Read the
whole guide once before starting so nothing surprises you mid-deploy.

---

## 0. What you're about to stand up

- An **S3 bucket** serving a small public website (the "app")
- A **Lambda function** (Python) that calls **Amazon Bedrock** (Nova Lite for
  the story, Nova Canvas for the image) and writes results to that bucket
- An **EventBridge** rule that invokes the Lambda once a day, unattended

Everything below is scripted in `deploy/deploy.sh`. You're mainly doing
account setup and running one command.

---

## 1. Prerequisites

You'll need, on your machine:

- **AWS CLI v2**
- **Python 3 + pip**
- **zip** (usually preinstalled on macOS/Linux; on Windows use WSL or Git
  Bash, since `deploy.sh` is a bash script)

> **Callout — Windows users:** the deploy script is bash. Easiest path is
> **WSL** (Windows Subsystem for Linux) or **Git Bash**. If you have WSL
> already, just run everything from an Ubuntu/WSL terminal.

Check what you already have:

```bash
aws --version      # want 2.x
python3 --version
pip3 --version
zip --version
```

Install AWS CLI v2 if missing:
- **Windows:** download and run the MSI installer from the official AWS CLI
  page (search "AWS CLI install" — the current link changes over time, so
  don't rely on a hardcoded URL here).
- **macOS:** `brew install awscli` (or the official `.pkg` installer)
- **Linux:** see the official "Install/Update the AWS CLI" instructions for
  your distro (curl + unzip + install, typically)

---

## 2. Create an IAM user for this weekend

Don't use your root account credentials for CLI work. Create a dedicated IAM
user instead:

1. AWS Console → **IAM** → **Users** → **Create user**
2. Name it something like `otics-hackathon`
3. **Attach policies directly** → for speed this weekend, attach
   **`AdministratorAccess`**.

   > **Callout — security tradeoff:** Administrator access is the fast path
   > for a weekend build, and it's what most people reach for in a
   > time-boxed hackathon. Since you're the one who'll actually care about
   > this: if you'd rather scope it down, see **Appendix A** below for a
   > tighter custom policy that covers exactly what `deploy.sh` does.
   > Either way, **delete this IAM user (or its access key) once you're
   > done** — treat it as temporary.

4. After creating the user, go to it → **Security credentials** tab →
   **Create access key** → choose **"Command Line Interface (CLI)"** →
   confirm → **save the Access Key ID and Secret Access Key somewhere safe**
   (you only see the secret once).

---

## 3. Bedrock model access — no longer a manual step

AWS retired the manual "Model access" console page. Serverless foundation
models — which includes both **Amazon Nova Lite** and **Amazon Nova
Canvas** — now enable automatically the first time your account invokes
them. Since neither is an AWS Marketplace model or an Anthropic model (the
two cases that still need something — Marketplace models need one
permissioned invoke, Anthropic models need a use-case form on first use),
there's nothing to click here. Skip straight to step 4.

> **Callout:** the very first Bedrock call your account ever makes may be
> the one that triggers this auto-enablement, which can occasionally cause
> that *first* invoke to fail (e.g. `AccessDeniedException` or a validation
> error) even though everything is configured correctly. `deploy.sh`'s
> automatic smoke-test invoke (step 5 below) could hit this. If it does,
> just re-run `./deploy.sh` once — the second invoke should go through.
>
> Confirm your region is still **US East (N. Virginia) `us-east-1`** in the
> console's top-right region selector regardless — that's the region this
> project deploys to by default.

---

## 4. Configure the AWS CLI with your new credentials

```bash
aws configure
```

Enter:
- **AWS Access Key ID:** (from step 2)
- **AWS Secret Access Key:** (from step 2)
- **Default region name:** `us-east-1`
- **Default output format:** `json`

Verify it works:

```bash
aws sts get-caller-identity
```

You should see your account ID and the `otics-hackathon` user ARN printed back.

---

## 5. Unzip the project and deploy

```bash
unzip otics-storyteller.zip
cd otics-storyteller/deploy
./deploy.sh
```

What happens (all scripted, ~2-5 minutes total including the first Bedrock
calls):
1. Creates an S3 bucket (`otics-storyteller-<your-account-id>`), makes it a
   public static website
2. Creates an IAM role scoped to just this Lambda's needs (Bedrock invoke on
   the two Nova model IDs, read/write on this one bucket, CloudWatch Logs)
3. Zips and deploys the Lambda function (vendors a current `boto3` into the
   package so the Bedrock Nova APIs are guaranteed to work regardless of
   what's built into the Lambda runtime by default)
4. Creates the daily EventBridge schedule (13:00 UTC = 7:00 AM Denver time)
5. **Invokes the Lambda once immediately**, so you get a real story + image
   without waiting for tomorrow's schedule

At the end it prints your site URL, something like:

```
http://otics-storyteller-123456789012.s3-website-us-east-1.amazonaws.com
```

Open it. You should see today's OT/ICS story with its generated image.

> **Callout — re-running:** `deploy.sh` is idempotent. If something fails
> partway through, fix the issue and just run it again — it updates
> in-place rather than erroring on "already exists."

---

## 6. Troubleshooting

**`AccessDeniedException` calling Bedrock** → Model access isn't enabled yet
for one of the two Nova models in `us-east-1` (see step 3), or your IAM
user's credentials haven't propagated yet (wait ~30s and retry).

**Bucket creation fails: "BucketAlreadyExists"** → S3 bucket names are
globally unique across *all* AWS accounts. Re-run with a custom name:
`BUCKET_NAME=your-unique-name ./deploy.sh`

**IAM role errors on first Lambda create** → IAM changes can take a few
seconds to propagate. The script already sleeps 10s for this; if it still
fails, just run `./deploy.sh` again.

**Want to watch it run / debug an invocation:**
```bash
aws logs tail /aws/lambda/otics-threat-storyteller --follow --region us-east-1
```

---

## 7. Cost expectations

This runs once a day. A Nova Lite story (roughly 1,500-2,000 tokens
combined) plus one standard Nova Canvas image comes out to a small fraction
of a dollar per run — check current Bedrock pricing on the AWS pricing page
for exact per-token/per-image rates, since they do change. As a safety net,
set a **Billing → Budgets** alert (e.g., $5) so you get an email if anything
runs away.

---

## 8. Before you submit

- [ ] Site is live and shows at least one real story + image
- [ ] `deploy/teardown.sh` exists if you want to tear it down later (don't
      run it before judging/spotlighting is done!)
- [ ] Take a screenshot of the live site for the article
- [ ] Publish the Builder Center article (draft provided separately) —
      remember the exact title format and the `#agents` tag are both
      requirements, not suggestions

---

## Appendix A — tighter IAM policy for the deploying user (optional)

If you'd rather not use `AdministratorAccess` even temporarily, attach this
custom policy to the `otics-hackathon` IAM user instead. It covers exactly
what `deploy.sh` needs to create/update/tear down this project's resources
(replace `<ACCOUNT_ID>` and `<BUCKET_NAME>` — the default bucket name is
`otics-storyteller-<ACCOUNT_ID>`):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3Site",
      "Effect": "Allow",
      "Action": [
        "s3:CreateBucket", "s3:DeleteBucket", "s3:PutBucketPolicy",
        "s3:PutBucketWebsite", "s3:PutBucketPublicAccessBlock",
        "s3:PutObject", "s3:GetObject", "s3:DeleteObject", "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::otics-storyteller-<ACCOUNT_ID>",
        "arn:aws:s3:::otics-storyteller-<ACCOUNT_ID>/*"
      ]
    },
    {
      "Sid": "IamRoleForLambda",
      "Effect": "Allow",
      "Action": [
        "iam:CreateRole", "iam:GetRole", "iam:DeleteRole",
        "iam:PutRolePolicy", "iam:DeleteRolePolicy", "iam:PassRole"
      ],
      "Resource": "arn:aws:iam::<ACCOUNT_ID>:role/otics-threat-storyteller-role"
    },
    {
      "Sid": "LambdaFunction",
      "Effect": "Allow",
      "Action": [
        "lambda:CreateFunction", "lambda:UpdateFunctionCode",
        "lambda:UpdateFunctionConfiguration", "lambda:GetFunction",
        "lambda:DeleteFunction", "lambda:AddPermission", "lambda:InvokeFunction"
      ],
      "Resource": "arn:aws:lambda:us-east-1:<ACCOUNT_ID>:function:otics-threat-storyteller"
    },
    {
      "Sid": "EventBridgeSchedule",
      "Effect": "Allow",
      "Action": ["events:PutRule", "events:PutTargets", "events:RemoveTargets", "events:DeleteRule"],
      "Resource": "arn:aws:events:us-east-1:<ACCOUNT_ID>:rule/otics-threat-storyteller-daily"
    },
    {
      "Sid": "LogsAndAccountId",
      "Effect": "Allow",
      "Action": ["logs:GetLogEvents", "logs:DescribeLogStreams", "logs:DescribeLogGroups", "sts:GetCallerIdentity"],
      "Resource": "*"
    },
    {
      "Sid": "BedrockModelAccessConsole",
      "Effect": "Allow",
      "Action": ["bedrock:ListFoundationModels", "bedrock:GetFoundationModelAvailability"],
      "Resource": "*"
    }
  ]
}
```

Note: the one-time "enable model access" click in step 3 may still need
broader Bedrock console permissions the first time — if you hit a
permissions wall there specifically, do that one step logged in as an
admin/root, then switch back to this scoped user for everything else.
