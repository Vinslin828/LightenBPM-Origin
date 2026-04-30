#!/usr/bin/env bash

# AWS Credentials
export AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
export AWS_ACCOUNT_ID=YOUR_AWS_ACCOUNT_ID
export AWS_DEFAULT_REGION=ap-northeast-1

# Make deploy.sh executable
chmod +x ./scripts/deploy.sh

# Configure AWS CLI
aws configure set aws_access_key_id $AWS_ACCESS_KEY_ID
aws configure set aws_secret_access_key $AWS_SECRET_ACCESS_KEY
aws configure set default.region $AWS_DEFAULT_REGION

echo "AWS environment configured successfully!"
