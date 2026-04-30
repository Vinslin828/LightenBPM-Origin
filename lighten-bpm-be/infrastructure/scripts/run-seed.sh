#!/bin/bash

set -e

# =============================================================================
# Database Seed Script
# Runs Prisma seed as an ECS Fargate task using migration image
#
# Uses environment variables set by GitLab CI or sourced from environments/*.env
# =============================================================================

echo "=================================================="
echo "Database Seed Runner"
echo "=================================================="

# Read from environment variables (set by GitLab CI or source environments/*.env)
if [ -z "$STAGE" ]; then
  echo "Error: STAGE environment variable is required"
  echo "Example: STAGE=dev ./run-seed.sh"
  exit 1
fi

# Set defaults for AWS region if not provided
AWS_REGION=${AWS_DEFAULT_REGION:-ap-northeast-1}

echo "Stage: $STAGE"
echo "Region: $AWS_REGION"
echo ""

# Stack names
APP_STACK_NAME="${STAGE}-bpm"
SHARED_INFRA_STACK_NAME="${SHARED_INFRA_STACK_NAME:-bpm-shared}"

# Get cluster name (auto-generated in application.yaml)
CLUSTER_NAME="${APP_STACK_NAME}-cluster"

# Get task definition name (auto-generated in application.yaml)
TASK_DEFINITION="${APP_STACK_NAME}-migrate"

# Get container name (from task definition)
CONTAINER_NAME="${APP_STACK_NAME}-migration-container"

# Get shared ECS security group by name tag
echo "Looking for shared ECS security group..."
SHARED_STAGE="${SHARED_STAGE:-dev}"
ECS_SECURITY_GROUP=$(aws ec2 describe-security-groups \
  --filters "Name=tag:Name,Values=${SHARED_STAGE}-${SHARED_INFRA_STACK_NAME}-ecs-sg" \
  --query "SecurityGroups[0].GroupId" \
  --output text \
  --region $AWS_REGION 2>/dev/null)

if [ -z "$ECS_SECURITY_GROUP" ] || [ "$ECS_SECURITY_GROUP" = "None" ]; then
  echo "Error: Could not find shared ECS security group '${SHARED_STAGE}-${SHARED_INFRA_STACK_NAME}-ecs-sg'"
  echo "Please ensure shared-resources.yaml has been deployed"
  exit 1
fi

echo "✓ ECS Security Group: $ECS_SECURITY_GROUP"

# Validate subnet is provided
if [ -z "$SUBNET_PRIVATE" ]; then
  echo "Error: SUBNET_PRIVATE environment variable is required"
  echo "Example: SUBNET_PRIVATE=subnet-xxxxx"
  exit 1
fi

echo "✓ Subnet: $SUBNET_PRIVATE"
echo ""

# Run seed as ECS Fargate task (using migration image but overriding command)
echo "Starting seed task..."
echo "  Cluster: $CLUSTER_NAME"
echo "  Task Definition: $TASK_DEFINITION"
echo "  Container: $CONTAINER_NAME"
echo "  Command: pnpm prisma db seed"
echo ""

TASK_ARN=$(aws ecs run-task \
  --cluster "$CLUSTER_NAME" \
  --task-definition "$TASK_DEFINITION" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_PRIVATE],securityGroups=[$ECS_SECURITY_GROUP],assignPublicIp=DISABLED}" \
  --overrides "{\"containerOverrides\":[{\"name\":\"$CONTAINER_NAME\",\"command\":[\"/bin/bash\",\"-c\",\"echo 'Constructing DATABASE_URL from environment variables...'; ENCODED_USERNAME=\$(echo -n \\\"\$DB_USER\\\" | jq -sRr @uri); ENCODED_PASSWORD=\$(echo -n \\\"\$DB_PASSWORD\\\" | jq -sRr @uri); export DATABASE_URL=\\\"postgresql://\${ENCODED_USERNAME}:\${ENCODED_PASSWORD}@\${DB_HOST}:\${DB_PORT:-5432}/\${DB_NAME}?schema=\${DB_SCHEMA}\\\"; echo '✓ DATABASE_URL constructed'; echo \\\"Connection: \${DB_USER}@\${DB_HOST}:\${DB_PORT:-5432}/\${DB_NAME}?schema=\${DB_SCHEMA}\\\"; pnpm prisma db seed\"]}]}" \
  --region $AWS_REGION \
  --query 'tasks[0].taskArn' \
  --output text)

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" = "None" ]; then
  echo "✗ Failed to start seed task"
  exit 1
fi

echo "✓ Seed task started: $TASK_ARN"
echo ""
echo "Waiting for seed to complete..."

# Wait for task completion
aws ecs wait tasks-stopped \
  --cluster "$CLUSTER_NAME" \
  --tasks "$TASK_ARN" \
  --region $AWS_REGION

echo "Waiting for logs to propagate..."
sleep 5

echo ""
echo "Seed task stopped. Checking result..."

# Check if seed succeeded
EXIT_CODE=$(aws ecs describe-tasks \
  --cluster "$CLUSTER_NAME" \
  --tasks "$TASK_ARN" \
  --region $AWS_REGION \
  --query 'tasks[0].containers[0].exitCode' \
  --output text)

STOPPED_REASON=$(aws ecs describe-tasks \
  --cluster "$CLUSTER_NAME" \
  --tasks "$TASK_ARN" \
  --region $AWS_REGION \
  --query 'tasks[0].stoppedReason' \
  --output text)

# Get task log stream name
TASK_ID=$(echo $TASK_ARN | awk -F/ '{print $NF}')
echo "Locating log stream for Task ID: $TASK_ID..."

# Get log stream
LOG_GROUP_NAME="/ecs/${APP_STACK_NAME}-migration"
LOG_STREAM=$(aws logs describe-log-streams \
  --log-group-name "$LOG_GROUP_NAME" \
  --query "logStreams[?contains(logStreamName, '$TASK_ID')].logStreamName | [0]" \
  --output text \
  --region $AWS_REGION)

if [ "$LOG_STREAM" = "None" ] || [ -z "$LOG_STREAM" ]; then
  echo "⚠️ Could not find log stream for Task $TASK_ID"
else
  echo "✓ Found log stream: $LOG_STREAM"
fi

echo ""
echo "Seed Logs:"
echo "=================================================="

aws logs tail "$LOG_GROUP_NAME" \
  --log-stream-names "$LOG_STREAM" \
  --region $AWS_REGION \
  --since 1h \
  --color off || echo "(No logs available at this moment)"

echo "=================================================="
echo ""

if [ "$EXIT_CODE" = "0" ]; then
  echo "=================================================="
  echo "✓ Seed completed successfully!"
  echo "=================================================="
  exit 0
else
  echo "=================================================="
  echo "✗ Seed failed!"
  echo "=================================================="
  echo "Exit Code: $EXIT_CODE"
  echo "Stopped Reason: $STOPPED_REASON"
  echo ""
  echo "To view full logs:"
  echo "  aws logs get-log-events \\"
  echo "    --log-group-name '/aws/ecs/bpm-migrate-${STAGE}' \\"
  echo "    --log-stream-name '$LOG_STREAM' \\"
  echo "    --region $AWS_REGION"
  exit 1
fi
