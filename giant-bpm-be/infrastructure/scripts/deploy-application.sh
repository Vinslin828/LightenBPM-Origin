#!/bin/bash

set -e

# =============================================================================
# Application Stack Deployment Script (with shared-resources)
# Deploys BPM application stack (API, ECS, Lambda, API Gateway)
# Uses shared ALB, VPC Link from shared-resources.yaml
#
# Stack name is automatically generated: ${STAGE}-bpm
# Uses environment variables set by GitLab CI or sourced from environments/*.env
# =============================================================================

echo "=================================================="
echo "Application Stack Deployment (with shared resources)"
echo "=================================================="

# Read from environment variables (set by GitLab CI or source environments/*.env)
if [ -z "$STAGE" ]; then
  echo "Error: STAGE environment variable is required"
  echo "Example: STAGE=dev ./deploy-application.sh"
  exit 1
fi

# Generate stack name based on stage
APP_STACK_NAME="${STAGE}-bpm"

# Set defaults for AWS region if not provided
AWS_REGION=${AWS_DEFAULT_REGION:-ap-northeast-1}

# Determine ListenerRulePriority based on stage
case $STAGE in
  dev)
    LISTENER_RULE_PRIORITY=100
    ;;
  staging)
    LISTENER_RULE_PRIORITY=200
    ;;
  uat)
    LISTENER_RULE_PRIORITY=300
    ;;
  prod)
    LISTENER_RULE_PRIORITY=400
    ;;
  *)
    echo "Error: Unknown stage: $STAGE"
    echo "Valid stages: dev, staging, uat, prod"
    exit 1
    ;;
esac

echo "Stage: $STAGE"
echo "Stack Name: $APP_STACK_NAME (auto-generated)"
echo "Shared Infra Stack: ${SHARED_INFRA_STACK_NAME:-bpm-shared}"
echo "Listener Rule Priority: $LISTENER_RULE_PRIORITY"
echo "Region: $AWS_REGION"
echo ""

# Check if stack is in a deployable state
echo "Checking stack status..."
if aws cloudformation describe-stacks \
  --stack-name $APP_STACK_NAME \
  --region $AWS_REGION &>/dev/null; then

  STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name $APP_STACK_NAME \
    --query 'Stacks[0].StackStatus' \
    --output text \
    --region $AWS_REGION)

  echo "Stack exists with status: $STACK_STATUS"

  # Check if stack is in a stable state
  if [[ "$STACK_STATUS" == *"IN_PROGRESS"* ]]; then
    echo "Error: Stack is currently being updated. Please wait for it to complete."
    exit 1
  fi

  if [[ "$STACK_STATUS" == "ROLLBACK_COMPLETE" ]] || [[ "$STACK_STATUS" == *"FAILED"* ]]; then
    echo "Error: Stack is in a failed state: $STACK_STATUS"
    echo "Please delete the stack manually before redeploying:"
    echo "  aws cloudformation delete-stack --stack-name $APP_STACK_NAME --region $AWS_REGION"
    exit 1
  fi
else
  echo "Stack does not exist. Will create new stack..."
fi

echo ""

# Build parameter overrides array
args=(
  Stage=${STAGE}
  SharedInfraStackName=${SHARED_INFRA_STACK_NAME:-bpm-shared}
  CustomDomainName=${CUSTOM_DOMAIN_NAME}
  ServerImageTag=${SERVER_IMAGE_TAG:-latest}
  MigrationImageTag=${MIGRATION_IMAGE_TAG:-latest}
  VpcId=${VPC_ID}
  SubnetPrivate=${SUBNET_PRIVATE}
  SubnetPrivate2=${SUBNET_PRIVATE2}
  ListenerRulePriority=${LISTENER_RULE_PRIORITY}
  DatabaseSchema=${DATABASE_SCHEMA}
  CognitoUserPoolId=${COGNITO_USER_POOL_ID}
  CognitoClientId=${COGNITO_CLIENT_ID}
  # Database credentials
  DBEndpoint=${DB_ENDPOINT}
  DatabaseName=${DATABASE_NAME}
  DatabaseUser=${DATABASE_USER}
  DatabasePassword=${DATABASE_PASSWORD}
  NotificationEnabled=${NOTIFICATION_ENABLED:-false}
  SenderEmail=${SENDER_EMAIL}
  SmtpHost=${SMTP_HOST:-email-smtp.ap-northeast-1.amazonaws.com}
  SmtpPort=${SMTP_PORT:-587}
  SmtpUser=${SMTP_USER:-}
  SmtpPassword=${SMTP_PASSWORD:-}
  FrontendBaseUrl=${FRONTEND_BASE_URL}
  PublicIdPrefix=${PUBLIC_ID_PREFIX}
  # IAM Roles (created by infra team)
  ECSExecutionRoleArn=${ECS_EXECUTION_ROLE_ARN}
  ECSTaskRoleArn=${ECS_TASK_ROLE_ARN}
  AutoScalingRoleArn=${AUTOSCALING_ROLE_ARN}
  LambdaRoleArn=${LAMBDA_ROLE_ARN}
)

echo "Parameters: ${args[@]}"
echo ""

# Validate template before deployment
echo "Validating CloudFormation template..."
aws cloudformation validate-template \
  --template-body file://infrastructure/application.yaml \
  --region $AWS_REGION > /dev/null

echo "✓ Template validation successful"
echo ""

# S3 bucket for deployment artifacts (shared across all environments, created by shared-resources.yaml)
S3_BUCKET="${SHARED_INFRA_STACK_NAME:-bpm-shared}-deployment-artifacts"

echo "Using S3 bucket: $S3_BUCKET"
echo ""

# Build Lambda dependencies
echo "Installing Lambda dependencies..."
(cd lambda/notification-processor && npm install --omit=dev)

# Build the SAM application (packages Lambda with node_modules)
echo "Running sam build..."
sam build \
  --template-file infrastructure/application.yaml

# Deploy the stack using SAM
echo "Starting SAM deployment..."
sam deploy \
  --stack-name $APP_STACK_NAME \
  --parameter-overrides "${args[@]}" \
  --region $AWS_REGION \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset \
  --s3-bucket $S3_BUCKET

DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
  echo ""
  echo "=================================================="
  echo "✓ Application stack deployment completed successfully!"
  echo "=================================================="
  echo ""

  # Display stack outputs
  echo "Stack Outputs:"
  aws cloudformation describe-stacks \
    --stack-name $APP_STACK_NAME \
    --query 'Stacks[0].Outputs[*].[OutputKey, OutputValue]' \
    --output table \
    --region $AWS_REGION

  exit 0
else
  echo ""
  echo "=================================================="
  echo "✗ Application stack deployment failed!"
  echo "=================================================="
  exit $DEPLOY_EXIT_CODE
fi
