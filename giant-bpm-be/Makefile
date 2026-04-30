.PHONY: build test test-watch test-local-e2e lint format docker-build docker-build-migration docker-server-upload docker-migration-upload ecr-check ecr-check-migration dev install clean-install prisma db-dev-up db-dev-down db-test-up db-test-down db-test-sync db-status migrate-dev migrate-pending-migration-file migrate-status migrate-reset infrastructure-deploy service-update start-dev start-prod openapi-doc

PNPM = pnpm

AWS_ACCOUNT_ID ?= $(shell aws sts get-caller-identity --query Account --output text)
SHARED_INFRA_STACK_NAME ?= bpm-shared
SERVER_IMAGE_TAG ?= latest
MIGRATION_IMAGE_TAG ?= latest
VERSION ?= dev
COMMIT_SHA ?= $(shell git rev-parse --short HEAD)
BUILD_DATE ?= $(shell date -u +'%Y-%m-%dT%H:%M:%SZ')
ECR_REGISTRY ?= $(AWS_ACCOUNT_ID).dkr.ecr.ap-northeast-1.amazonaws.com
ECR_REPOSITORY ?= $(SHARED_INFRA_STACK_NAME)/server
ECR_MIGRATION_REPOSITORY ?= $(SHARED_INFRA_STACK_NAME)/migration

install:
	$(PNPM) install

# Force install (clean install)
clean-install:
	rm -rf node_modules pnpm-lock.yaml
	$(PNPM) install

# Generate Prisma client
prisma:
	$(PNPM) prisma generate

# Build the application
build: prisma lint
	$(PNPM) run build

# Run tests
test: build
	$(PNPM) run test

# Run tests in watch mode
test-watch:
	$(PNPM) run test:watch

# Run end-to-end tests
test-local-e2e: db-test-up prisma db-test-sync
	$(PNPM) dotenv -e .env.test -- $(PNPM) run test:e2e

# Lint code
lint:
	$(PNPM) run lint

# Format code
format:
	$(PNPM) run format

# Build server Docker image locally
docker-build:
	@if [ -z "$(SERVER_IMAGE_TAG)" ]; then \
		echo "Error: SERVER_IMAGE_TAG is required"; \
		echo "Usage: make docker-build SERVER_IMAGE_TAG=<tag>"; \
		echo "Example: make docker-build SERVER_IMAGE_TAG=dev"; \
		exit 1; \
	fi
	docker build \
		--platform linux/amd64 \
		--build-arg VERSION=$(VERSION) \
		--build-arg COMMIT_SHA=$(COMMIT_SHA) \
		--build-arg BUILD_DATE=$(BUILD_DATE) \
		-f docker/Dockerfile.server \
		-t bpm-server:$(SERVER_IMAGE_TAG) .

# Build migration Docker image locally
docker-build-migration:
	@if [ -z "$(MIGRATION_IMAGE_TAG)" ]; then \
		echo "Error: MIGRATION_IMAGE_TAG is required"; \
		echo "Usage: make docker-build-migration MIGRATION_IMAGE_TAG=<tag>"; \
		echo "Example: make docker-build-migration MIGRATION_IMAGE_TAG=dev"; \
		exit 1; \
	fi
	docker build \
		--platform linux/amd64 \
		-f docker/Dockerfile.migration \
		-t bpm-migration:$(MIGRATION_IMAGE_TAG) .

# Check ECR repository exists (fail if not - ECR should be created by shared-resources.yaml)
ecr-check:
	@echo "Checking ECR repository: $(ECR_REPOSITORY)"
	@if ! aws ecr describe-repositories --repository-names $(ECR_REPOSITORY) --region ap-northeast-1 >/dev/null 2>&1; then \
		echo "Error: ECR repository $(ECR_REPOSITORY) does not exist"; \
		echo "Please deploy shared-resources.yaml first to create ECR repositories"; \
		exit 1; \
	else \
		echo "✓ ECR repository $(ECR_REPOSITORY) exists"; \
	fi

# Check migration ECR repository exists (fail if not - ECR should be created by shared-resources.yaml)
ecr-check-migration:
	@echo "Checking ECR repository: $(ECR_MIGRATION_REPOSITORY)"
	@if ! aws ecr describe-repositories --repository-names $(ECR_MIGRATION_REPOSITORY) --region ap-northeast-1 >/dev/null 2>&1; then \
		echo "Error: ECR repository $(ECR_MIGRATION_REPOSITORY) does not exist"; \
		echo "Please deploy shared-resources.yaml first to create ECR repositories"; \
		exit 1; \
	else \
		echo "✓ ECR repository $(ECR_MIGRATION_REPOSITORY) exists"; \
	fi

# Build and push server Docker image to ECR
docker-server-upload: docker-build ecr-check
	@echo "Building and uploading server Docker image with tag: $(SERVER_IMAGE_TAG)"
	# Login to ECR
	aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin $(ECR_REGISTRY)
	# Tag and push image
	docker tag bpm-server:$(SERVER_IMAGE_TAG) $(ECR_REGISTRY)/$(ECR_REPOSITORY):$(SERVER_IMAGE_TAG)
	docker push $(ECR_REGISTRY)/$(ECR_REPOSITORY):$(SERVER_IMAGE_TAG)
	@echo "Server image pushed successfully: $(ECR_REGISTRY)/$(ECR_REPOSITORY):$(SERVER_IMAGE_TAG)"

# Build and push migration Docker image to ECR
docker-migration-upload: docker-build-migration ecr-check-migration
	@echo "Building and uploading migration Docker image with tag: $(MIGRATION_IMAGE_TAG)"
	# Login to ECR
	aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin $(ECR_REGISTRY)
	# Tag and push image
	docker tag bpm-migration:$(MIGRATION_IMAGE_TAG) $(ECR_REGISTRY)/$(ECR_MIGRATION_REPOSITORY):$(MIGRATION_IMAGE_TAG)
	docker push $(ECR_REGISTRY)/$(ECR_MIGRATION_REPOSITORY):$(MIGRATION_IMAGE_TAG)
	@echo "Migration image pushed successfully: $(ECR_REGISTRY)/$(ECR_MIGRATION_REPOSITORY):$(MIGRATION_IMAGE_TAG)"

# Database management
db-dev-up:
	docker-compose up -d local-db

db-dev-down:
	docker-compose stop local-db

db-test-up:
	docker-compose up -d test-local-e2e-db

db-test-down:
	docker-compose stop test-local-e2e-db

db-test-sync:
	$(PNPM) dotenv -e .env.test -- prisma db push

db-status:
	docker-compose ps

# Local development helpers
dev: db-dev-up prisma move-md-tables migrate-pending-migration-file
	echo "{\"version\": -1, \"commitSha\": \"$(shell git rev-parse --short HEAD)\", \"buildDate\": \"$(shell date -u +'%Y-%m-%dT%H:%M:%SZ')\"}" > version.json
	$(PNPM) prisma db seed
	$(PNPM) run start:dev

# Create migration file and apply to development database
migrate-dev:
	@if [ -z "$(name)" ]; then \
		echo "Error: name is required"; \
		echo "Usage: make migrate-dev name=<migration_name>"; \
		echo "Example: make migrate-dev name=add_user_profile"; \
		exit 1; \
	fi
	$(PNPM) prisma migrate dev --name $(name)

# Apply pending migrations (for teammates after pulling new migrations)
migrate-pending-migration-file:
	$(PNPM) prisma migrate deploy

# Check migration status
migrate-status:
	$(PNPM) prisma migrate status

# Move md_* tables to master_data schema (local development only)
move-md-tables:
	@echo "Moving md_* tables to master_data schema in local-db container..."
	@(echo "SET custom.source_schema='public'; SET custom.target_schema='master_data';"; cat prisma/move-md-tables.sql) | docker-compose exec -T local-db psql -U postgres -d bpm-local-db -f - || echo "Pre-migration script already run or no tables to move."

# Reset database (development only)
migrate-reset:
	$(PNPM) prisma migrate reset --force

# Deploy infrastructure to environment (reads from environment variables)
infrastructure-deploy:
	./scripts/infrastructure-deploy.sh

# Update ECS service to latest image
service-update:
	./scripts/service-update.sh

# Start Nestjs Application
start-dev:
	$(PNPM) run start:dev
start-prod:
# TODO: add .env switching here?
	$(PNPM) run start:prod

# Generate OpenAPI spec
openapi-doc:
	$(PNPM) run generate-openapi-spec
