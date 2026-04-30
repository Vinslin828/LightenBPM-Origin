#!/usr/bin/env bash
set -e
env=$1

pwd

if [[ $env == "main" ]]; then
    env="dev"
fi

if [[ $env != 'staging' && $env != 'uat' && $env != 'prod' ]]; then
  env="dev"
  echo "default env to dev"
fi

echo env:${env}

# SAM build and deploy
sam build
echo "start deploy...."
sam deploy --config-env $env --no-confirm-changeset --no-fail-on-empty-changeset --capabilities CAPABILITY_NAMED_IAM CAPABILITY_IAM --resolve-s3

# export env variables from cloudformation
export CLOUDFRONT_DISTRIBUTION_ID=$(aws cloudformation describe-stacks --stack-name ${env}-bpm-web --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text)
export WEB_S3_BUCKET_NAME=$(aws cloudformation describe-stacks --stack-name ${env}-bpm-web --query "Stacks[0].Outputs[?OutputKey=='WebsiteBucketName'].OutputValue" --output text)

echo -e "\nVITE_PUBLIC_BUILD_VERSION=$(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> ./.env

# Build web
# rm -rf dist
# NODE_ENV=production pnpm build

# Deploy to S3 with specific content types and cache settings
echo "Uploading files to S3..."

# First, create a clean build
rm -rf dist
NODE_ENV=production pnpm build

# Verify the build output
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "Build failed or dist directory is missing"
    exit 1
fi

# Upload all static assets except index.html, css, and js with long cache duration
echo "Uploading static assets..."
aws s3 sync dist/ "s3://${WEB_S3_BUCKET_NAME}/" --delete \
    --exclude "index.html" --exclude "*.js" --exclude "*.css" \
    --cache-control "max-age=31536000"

# Upload all CSS files with correct MIME type
echo "Uploading CSS files..."
find dist -type f -name "*.css" | while read file; do
    relative_path=${file#dist/}
    aws s3 cp "$file" "s3://${WEB_S3_BUCKET_NAME}/$relative_path" \
        --content-type "text/css" \
        --cache-control "max-age=31536000"
done

# Upload all JS files with correct MIME type
echo "Uploading JavaScript files..."
find dist -type f -name "*.js" | while read file; do
    relative_path=${file#dist/}
    aws s3 cp "$file" "s3://${WEB_S3_BUCKET_NAME}/$relative_path" \
            --content-type "application/javascript" \
            --cache-control "max-age=31536000"
done
        
# Upload source maps if they exist
echo "Uploading source maps..."
find dist -type f -name "*.js.map" | while read file; do
    relative_path=${file#dist/}
    aws s3 cp "$file" "s3://${WEB_S3_BUCKET_NAME}/$relative_path" \
        --content-type "application/json" \
        --cache-control "max-age=31536000"
done

# Upload index.html last with no cache
echo "Uploading index.html..."
aws s3 cp dist/index.html "s3://${WEB_S3_BUCKET_NAME}/index.html" \
    --cache-control "no-cache" \
    --content-type "text/html"

# Create CloudFront invalidation
echo "Creating CloudFront invalidation..."
aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*"

# Print deployed URLs
CLOUDFRONT_URL=$(aws cloudformation describe-stacks --stack-name ${env}-bpm-web --query "Stacks[0].Outputs[?OutputKey=='WebsiteURL'].OutputValue" --output text)
CUSTOM_DOMAIN_URL=$(aws cloudformation describe-stacks --stack-name ${env}-bpm-web --query "Stacks[0].Outputs[?OutputKey=='CustomDomainURL'].OutputValue" --output text)
echo ""
echo "===== Deployment Complete ====="
echo "CloudFront URL: https://${CLOUDFRONT_URL}"
echo "Custom Domain:  ${CUSTOM_DOMAIN_URL}"
echo "==============================="