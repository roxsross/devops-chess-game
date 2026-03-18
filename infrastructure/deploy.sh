#!/usr/bin/env bash
# deploy.sh — Full deployment: infrastructure + frontend
# Usage: bash infrastructure/deploy.sh [--skip-infra]
#
# Workflow:
#   1. CDK bootstrap (idempotent)
#   2. cdk deploy --all  →  App Runner + DynamoDB + S3 + CloudFront
#   3. Build frontend with App Runner URL injected via VITE_* env vars
#   4. Sync frontend dist/ → S3
#   5. Invalidate CloudFront
#   6. Update App Runner FRONTEND_URL to actual CloudFront URL

set -euo pipefail

REGION="us-east-1"
APP_STACK="ChessGameApp"
OUTPUTS_FILE="$(mktemp /tmp/cdk-outputs.XXXXXX.json)"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
FRONTEND_DIR="$REPO_ROOT/frontend"

SKIP_INFRA=false
for arg in "$@"; do [[ "$arg" == "--skip-infra" ]] && SKIP_INFRA=true; done

# ── Helpers ───────────────────────────────────────────────────────────
log()  { echo "▶  $*"; }
ok()   { echo "✔  $*"; }
err()  { echo "✘  $*" >&2; exit 1; }
need() { command -v "$1" &>/dev/null || err "Required tool not found: $1 — please install it first"; }

# ── Prerequisites ─────────────────────────────────────────────────────
need node
need npm
need aws
need docker
need jq

log "Checking AWS identity..."
ACCOUNT=$(aws sts get-caller-identity --query 'Account' --output text 2>/dev/null) \
  || err "Not authenticated with AWS. Run: aws configure  or  aws sso login"
ok "AWS account: $ACCOUNT  |  region: $REGION"

# ── CDK install + bootstrap ───────────────────────────────────────────
if [[ "$SKIP_INFRA" == false ]]; then
  log "Installing CDK dependencies..."
  cd "$SCRIPT_DIR" && npm install --silent

  log "Bootstrapping CDK environment (idempotent)..."
  npx cdk bootstrap "aws://$ACCOUNT/$REGION" --quiet

  # ── Deploy infrastructure ──────────────────────────────────────────
  log "Deploying stacks: ChessGameDatabase + ChessGameApp..."
  log "(This builds the Docker image, pushes to ECR, and creates all AWS resources)"
  npx cdk deploy --all \
    --require-approval never \
    --outputs-file "$OUTPUTS_FILE"
  ok "CDK stacks deployed"
else
  log "--skip-infra: loading existing outputs..."
  aws cloudformation describe-stacks \
    --stack-name "$APP_STACK" \
    --region "$REGION" \
    --query 'Stacks[0].Outputs' \
    --output json \
  | python3 -c "
import json, sys
outputs = json.load(sys.stdin)
result = {'$APP_STACK': {o['OutputKey']: o['OutputValue'] for o in outputs}}
print(json.dumps(result))
" > "$OUTPUTS_FILE"
fi

# ── Extract CDK outputs ───────────────────────────────────────────────
get_output() { jq -r ".\"$APP_STACK\".\"$1\"" "$OUTPUTS_FILE"; }

APPRUNNER_URL=$(get_output "AppRunnerServiceUrl")
APPRUNNER_ARN=$(get_output "AppRunnerServiceArn")
BUCKET_NAME=$(get_output "FrontendBucketName")
CLOUDFRONT_URL=$(get_output "CloudFrontUrl")
DISTRIBUTION_ID=$(get_output "CloudFrontDistributionId")

[[ "$APPRUNNER_URL" == "null" || -z "$APPRUNNER_URL" ]] \
  && err "Could not read AppRunnerServiceUrl from CDK outputs. Check $OUTPUTS_FILE"

log "App Runner: $APPRUNNER_URL"
log "CloudFront: $CLOUDFRONT_URL"
log "S3 bucket:  $BUCKET_NAME"

# ── Build frontend ────────────────────────────────────────────────────
log "Installing frontend dependencies..."
cd "$FRONTEND_DIR" && npm install --silent

log "Building frontend..."
VITE_API_URL="${APPRUNNER_URL}/api/v1" \
VITE_WS_URL="$APPRUNNER_URL" \
  npm run build
ok "Frontend built in frontend/dist/"

# ── Upload to S3 ──────────────────────────────────────────────────────
log "Syncing frontend/dist/ → s3://$BUCKET_NAME/ ..."

# Hashed assets (JS/CSS bundles) — long-lived cache
aws s3 sync dist/ "s3://$BUCKET_NAME/" \
  --delete \
  --cache-control "public,max-age=31536000,immutable" \
  --exclude "index.html" \
  --region "$REGION" \
  --quiet

# index.html — no cache (always fetch latest)
aws s3 cp dist/index.html "s3://$BUCKET_NAME/index.html" \
  --cache-control "no-cache,no-store,must-revalidate" \
  --region "$REGION"

ok "Frontend deployed to S3"

# ── Invalidate CloudFront ─────────────────────────────────────────────
log "Creating CloudFront invalidation..."
INV_ID=$(aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*" \
  --query 'Invalidation.Id' \
  --output text)
ok "Invalidation created: $INV_ID (propagates in ~1 min)"

# ── Tighten CORS: set FRONTEND_URL = CloudFront URL ──────────────────
log "Updating App Runner FRONTEND_URL → $CLOUDFRONT_URL ..."

# Read DynamoDB table names from the Database stack (not the App stack)
DB_STACK="ChessGameDatabase"
GAMES_TABLE=$(aws cloudformation describe-stacks \
  --stack-name "$DB_STACK" --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`GamesTableName`].OutputValue' \
  --output text)
PLAYERS_TABLE=$(aws cloudformation describe-stacks \
  --stack-name "$DB_STACK" --region "$REGION" \
  --query 'Stacks[0].Outputs[?OutputKey==`PlayersTableName`].OutputValue' \
  --output text)

[[ -z "$GAMES_TABLE" || "$GAMES_TABLE" == "None" ]] && err "Could not read GamesTableName from $DB_STACK"
[[ -z "$PLAYERS_TABLE" || "$PLAYERS_TABLE" == "None" ]] && err "Could not read PlayersTableName from $DB_STACK"

# Fetch current service config to preserve image URI and access role
IMAGE_URI=$(aws apprunner describe-service \
  --service-arn "$APPRUNNER_ARN" --region "$REGION" \
  --query 'Service.SourceConfiguration.ImageRepository.ImageIdentifier' \
  --output text)
ACCESS_ROLE=$(aws apprunner describe-service \
  --service-arn "$APPRUNNER_ARN" --region "$REGION" \
  --query 'Service.SourceConfiguration.AuthenticationConfiguration.AccessRoleArn' \
  --output text)

aws apprunner update-service \
  --service-arn "$APPRUNNER_ARN" \
  --region "$REGION" \
  --source-configuration "{
    \"AuthenticationConfiguration\": { \"AccessRoleArn\": \"$ACCESS_ROLE\" },
    \"ImageRepository\": {
      \"ImageIdentifier\": \"$IMAGE_URI\",
      \"ImageRepositoryType\": \"ECR\",
      \"ImageConfiguration\": {
        \"Port\": \"3001\",
        \"RuntimeEnvironmentVariables\": {
          \"NODE_ENV\": \"production\",
          \"PORT\": \"3001\",
          \"AWS_REGION\": \"$REGION\",
          \"DYNAMODB_TABLE_GAMES\": \"$GAMES_TABLE\",
          \"DYNAMODB_TABLE_PLAYERS\": \"$PLAYERS_TABLE\",
          \"FRONTEND_URL\": \"$CLOUDFRONT_URL\"
        }
      }
    }
  }" \
  --query 'Service.ServiceArn' --output text > /dev/null \
  && ok "App Runner updated — redeploying (~1–2 min)"

# ── Done ──────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Deployment complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Frontend  →  $CLOUDFRONT_URL"
echo "  Backend   →  $APPRUNNER_URL"
echo "  Health    →  ${APPRUNNER_URL}/health"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
