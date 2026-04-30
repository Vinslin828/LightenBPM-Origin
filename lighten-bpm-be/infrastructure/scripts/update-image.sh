#!/bin/bash

set -e

# Read from environment variables (set by GitLab CI)
if [ -z "$STAGE" ]; then
  echo "Error: STAGE environment variable is required"
  exit 1
fi

if [ "$STAGE" != "dev" ] && [ "$STAGE" != "staging" ] && [ "$STAGE" != "uat" ] && [ "$STAGE" != "prod" ]; then
  echo "Error: STAGE must be one of: dev, staging, uat, prod"
  echo "Provided: $STAGE"
  exit 1
fi

echo "Forcing ECS service update for ${STAGE} environment..."

# Force ECS service update to pull latest server image
AWS_REGION=${AWS_DEFAULT_REGION:-ap-northeast-1}
APP_STACK_NAME="${STAGE}-bpm"

aws ecs update-service \
  --cluster "${APP_STACK_NAME}-cluster" \
  --service "${APP_STACK_NAME}-service" \
  --force-new-deployment \
  --region $AWS_REGION \
  --no-cli-pager

echo "Update image completed successfully!"