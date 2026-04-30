#!/bin/bash

set -e

# =============================================================================
# Database Pre-Migration Script
# Runs pre-migration fix (e.g., moving md_* tables) as an ECS Fargate task
#
# Uses environment variables set by GitLab CI or sourced from environments/*.env
# =============================================================================

echo "=================================================="
echo "Database Pre-Migration Runner"
echo "=================================================="

# Read from environment variables (set by GitLab CI or source environments/*.env)
if [ -z "$STAGE" ]; then
  echo "Error: STAGE environment variable is required"
  echo "Example: STAGE=dev ./run-pre-migration.sh"
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

# Run pre-migration as ECS Fargate task
echo "Starting pre-migration task..."
echo "  Cluster: $CLUSTER_NAME"
echo "  Task Definition: $TASK_DEFINITION"
echo ""

# Build the command string without any JSON-layer escaping.
# Single-quoted heredoc: no expansion here — the container handles it at runtime.
PRE_MIGRATION_CMD=$(cat << 'EOCMD'
echo 'Running pre-migration fix (renaming and moving tables)...'; export OLD_SCHEMA="master_data${DB_SCHEMA:+_$DB_SCHEMA}"; export NEW_SCHEMA="${DB_SCHEMA:+${DB_SCHEMA}_}master_data"; (echo "SET custom.old_schema='$OLD_SCHEMA'; SET custom.new_schema='$NEW_SCHEMA';"; cat prisma/rename-master-data-schema.sql) | PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER -d $DB_NAME || echo 'Schema rename failed or already done, continuing...'; (echo "SET custom.source_schema='${DB_SCHEMA:-public}'; SET custom.target_schema='$NEW_SCHEMA';"; cat prisma/move-md-tables.sql) | PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p ${DB_PORT:-5432} -U $DB_USER -d $DB_NAME || echo 'Pre-migration fix failed or already run, continuing...'
EOCMD
)

# Use jq to produce valid JSON — it handles all escaping automatically.
OVERRIDES=$(jq -n \
  --arg name "${APP_STACK_NAME}-migration-container" \
  --arg cmd "$PRE_MIGRATION_CMD" \
  '{"containerOverrides":[{"name":$name,"command":["/bin/bash","-c",$cmd]}]}')

TASK_ARN=$(aws ecs run-task \
  --cluster "$CLUSTER_NAME" \
  --task-definition "$TASK_DEFINITION" \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_PRIVATE],securityGroups=[$ECS_SECURITY_GROUP],assignPublicIp=DISABLED}" \
  --overrides "$OVERRIDES" \
  --region $AWS_REGION \
  --query 'tasks[0].taskArn' \
  --output text)

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" = "None" ]; then
  echo "✗ Failed to start pre-migration task"
  exit 1
fi

echo "✓ Pre-migration task started: $TASK_ARN"
echo ""
echo "Waiting for pre-migration to complete..."

# Wait for task completion
aws ecs wait tasks-stopped \
  --cluster "$CLUSTER_NAME" \
  --tasks "$TASK_ARN" \
  --region $AWS_REGION

echo "Waiting for logs to propagate..."
sleep 5

echo ""
echo "Pre-migration task stopped. Checking result..."

# Check if pre-migration succeeded
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
echo "Pre-Migration Logs:"
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
  echo "✓ Pre-migration completed successfully!"
  echo "=================================================="
  exit 0
else
  echo "=================================================="
  echo "✗ Pre-migration failed!"
  echo "=================================================="
  echo "Exit Code: $EXIT_CODE"
  echo "Stopped Reason: $STOPPED_REASON"
  echo ""
  echo "To view full logs:"
  echo "  aws logs tail '$LOG_GROUP_NAME' \\"
  echo "    --log-stream-names '$LOG_STREAM' \\"
  echo "    --region $AWS_REGION"
  exit 1
fi
