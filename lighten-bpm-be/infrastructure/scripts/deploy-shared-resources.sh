#!/bin/bash

set -e

# =============================================================================
# Shared Resources Deployment Script
# Deploys shared infrastructure (S3, ECR, ALB, VPC Link)
#
# IMPORTANT: This should only be deployed ONCE per account group
# - Deploy with SharedStage=dev for dev/staging/uat environments
# - Deploy with SharedStage=prod for production environment
# =============================================================================

echo "=================================================="
echo "Shared Resources Deployment"
echo "=================================================="

# Read from environment variables
if [ -z "$SHARED_STAGE" ]; then
  echo "Error: SHARED_STAGE environment variable is required"
  echo "Example: SHARED_STAGE=dev ./deploy-shared-resources.sh"
  echo ""
  echo "Valid values:"
  echo "  - dev: For dev/staging/uat environments"
  echo "  - prod: For production environment"
  exit 1
fi

# Validate SHARED_STAGE
if [[ "$SHARED_STAGE" != "dev" && "$SHARED_STAGE" != "prod" ]]; then
  echo "Error: SHARED_STAGE must be either 'dev' or 'prod'"
  echo "Current value: $SHARED_STAGE"
  exit 1
fi

# Check SHARED_INFRA_STACK_NAME
if [ -z "$SHARED_INFRA_STACK_NAME" ]; then
  echo "Error: SHARED_INFRA_STACK_NAME environment variable is required"
  echo "Example: SHARED_INFRA_STACK_NAME=bpm-shared ./deploy-shared-resources.sh"
  echo ""
  echo "This will be used as:"
  echo "  - Stack name: \$SHARED_INFRA_STACK_NAME"
  echo "  - S3 bucket: \$SHARED_INFRA_STACK_NAME-deployment-artifacts"
  echo "  - ECR repos: \$SHARED_INFRA_STACK_NAME/server, \$SHARED_INFRA_STACK_NAME/migration"
  exit 1
fi

# Stack name from environment variable
STACK_NAME="$SHARED_INFRA_STACK_NAME"

# Set defaults for AWS region if not provided
AWS_REGION=${AWS_DEFAULT_REGION:-ap-northeast-1}

echo "Shared Stage: $SHARED_STAGE"
echo "Stack Name: $STACK_NAME"
echo "Region: $AWS_REGION"
echo ""

# Check if stack exists
echo "Checking if stack exists..."
if aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --region $AWS_REGION &>/dev/null; then

  STACK_STATUS=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
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
    echo "  aws cloudformation delete-stack --stack-name $STACK_NAME --region $AWS_REGION"
    exit 1
  fi

  # Check if there are stacks importing from this stack
  echo ""
  echo "Checking for dependent stacks..."
  IMPORTS=$(aws cloudformation list-imports \
    --export-name ${STACK_NAME}-ApiGatewayVpcLink \
    --region $AWS_REGION \
    --query 'Imports' \
    --output text 2>/dev/null || echo "")

  if [ -n "$IMPORTS" ]; then
    echo "⚠️  Warning: The following stacks are importing from this shared stack:"
    echo "$IMPORTS"
    echo ""
    echo "If you modify exported values, those stacks may need to be updated."
    echo ""
    if [ -n "$CI" ]; then
      echo "Running in CI mode, skipping confirmation..."
    else
      read -p "Continue with deployment? (y/N): " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
      fi
    fi
  fi

  echo "Stack will be updated..."
  OPERATION="update"
else
  echo "Stack does not exist. Will create new stack..."
  OPERATION="create"
fi

echo ""

# Validate template before deployment
echo "Validating CloudFormation template..."
aws cloudformation validate-template \
  --template-body file://infrastructure/shared-resources.yaml \
  --region $AWS_REGION > /dev/null

echo "✓ Template validation successful"
echo ""

# Get VPC and Subnet information
VPC_ID=${VPC_ID:-vpc-089a52c9fb373309c}
SUBNET_PRIVATE=${SUBNET_PRIVATE:-subnet-0ac04f7e4bc36c1e6}
SUBNET_PRIVATE2=${SUBNET_PRIVATE2:-subnet-0b71f9769521b2a94}
APP_PORT=${APP_PORT:-3000}

echo "Parameters:"
echo "  SharedStage: $SHARED_STAGE"
echo "  VpcId: $VPC_ID"
echo "  SubnetPrivate: $SUBNET_PRIVATE"
echo "  SubnetPrivate2: $SUBNET_PRIVATE2"
echo "  AppPort: $APP_PORT"
echo ""

# Deploy the stack using SAM (better output than aws cloudformation deploy)
echo "Starting SAM deployment..."
sam deploy \
  --template-file infrastructure/shared-resources.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
    SharedStage=$SHARED_STAGE \
    VpcId=$VPC_ID \
    SubnetPrivate=$SUBNET_PRIVATE \
    SubnetPrivate2=$SUBNET_PRIVATE2 \
    AppPort=$APP_PORT \
  --region $AWS_REGION \
  --capabilities CAPABILITY_IAM \
  --no-confirm-changeset \
  --no-fail-on-empty-changeset

DEPLOY_EXIT_CODE=$?

if [ $DEPLOY_EXIT_CODE -eq 0 ]; then
  echo ""
  echo "=================================================="
  echo "✓ Shared resources deployment completed successfully!"
  echo "=================================================="
  echo ""

  # Display stack outputs
  echo "Stack Outputs:"
  aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --query 'Stacks[0].Outputs[*].[OutputKey, OutputValue, ExportName]' \
    --output table \
    --region $AWS_REGION

  echo ""
  echo "Exported values can be imported in application stacks using:"
  echo "  !ImportValue ${STACK_NAME}-<OutputKey>"
  echo ""

  if [ "$OPERATION" = "create" ]; then
    echo "⚠️  Important Notes:"
    echo "  1. These resources are shared across all stages (dev/staging/uat)"
    echo "  2. Do not delete this stack if application stacks are using it"
    echo "  3. S3 bucket name: ${STACK_NAME}-deployment-artifacts"
    echo "  4. ECR repositories: ${STACK_NAME}/server, ${STACK_NAME}/migration"
    echo ""
  fi

  exit 0
else
  echo ""
  echo "=================================================="
  echo "✗ Shared resources deployment failed!"
  echo "=================================================="
  exit $DEPLOY_EXIT_CODE
fi
