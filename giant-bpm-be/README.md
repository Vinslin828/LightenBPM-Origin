# Giant BPM Backend

A progressive [Node.js](http://nodejs.org) framework for building efficient and scalable server-side applications.

## Description

This repository contains the backend API for the Giant BPM project, built with the [NestJS](https://nestjs.com/) framework. It uses Prisma as the ORM and provides a local development environment using Docker.

## Core Technologies

This project is built with a modern, robust stack:

-   **Framework**: [NestJS](https://nestjs.com/)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Database**: [PostgreSQL](https://www.postgresql.org/)
-   **ORM**: [Prisma](https://www.prisma.io/)
-   **Package Manager**: [pnpm](https://pnpm.io/)
-   **Containerization**: [Docker](https://www.docker.com/)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (v22 or higher)
- [pnpm](https://pnpm.io/installation)
- [Docker](https://www.docker.com/products/docker-desktop/)
- [make](https://www.gnu.org/software/make/)

### Installation

1.  Clone the repository:
    ```bash
    git clone https://gitlab.com/bct-taipei/giant-bpm-be.git
    cd giant-bpm-be
    ```

2.  Install the dependencies:
    ```bash
    make install
    ```

## Local Development

To start the local development environment, which includes the PostgreSQL database container and the NestJS application in watch mode, run:

```bash
make dev
```

This command will:
1.  Start the PostgreSQL database in a Docker container.
2.  Generate the Prisma client.
3.  Apply any pending database migrations.
4.  Start the NestJS application with file watching enabled.

The application will be available at `http://localhost:3000`.

## API Overview

The backend provides a RESTful API for managing various resources. The main modules are:

-   **User Management**: Handles users, authentication, and authorization.
-   **Form Management**: Manages dynamic forms, including creating, reading, updating, and deleting forms and their versions.
-   **Workflow Management**: Manages workflow definitions that can be attached to forms.
-   **Flow Engine | Application Life Cycle**: Handles the lifecycle of form submissions, including approvals, rejections, and tracking the application status.
-   **System Healthy API**: Provides endpoints to check the health of the application.

## Database Management

The local PostgreSQL database is managed via `docker-compose` through the `Makefile`.

-   **Start the development database:**
    ```bash
    make db-dev-up
    ```
-   **Stop the development database:**
    ```bash
    make db-dev-down
    ```
-   **Check the database status:**
    ```bash
    make db-status
    ```
-   **Apply pending migrations to the development database:**
    ```bash
    make migrate-pending-migration-file
    ```
-   **Create a new migration file:**
    ```bash
    make migrate-dev name=<migration_name>
    ```
-   **Check the status of migrations:**
    ```bash
    make migrate-status
    ```
-   **Reset the development database:(development only)**
    ```bash
    make migrate-reset
    ```

## Deployment Architecture

This project uses a **dual-tag deployment strategy** with separate containers for application and database migrations, providing safer and more reliable deployments.

### Deployment Components

- **Server Container**: Runs the NestJS application
- **Migration Container**: Handles database schema changes
- **Infrastructure**: AWS ECS Fargate with Aurora PostgreSQL Serverless v2
- **CI/CD**: GitLab CI with 5-stage pipeline

### GitLab CI Pipeline Stages

1. **test** - Run unit tests and E2E tests
2. **build** - Build and push Docker images to ECR
3. **infrastructure_deploy** - Deploy CloudFormation infrastructure
4. **migration** - Run database migrations (only when schema changes)
5. **service_update** - Update ECS service to latest application image

### Local Deployment Commands

#### Infrastructure Deployment
```bash
# Deploy infrastructure only
make infrastructure-deploy

# Environment variables required:
export DEPLOYMENT_TYPE=dev  # dev, staging, uat, prod
export SERVER_IMAGE_TAG=dev
export MIGRATION_IMAGE_TAG=dev-123
```

#### Service Management
```bash
# Update ECS service to latest image
make service-update

# Run database migration
./scripts/migration.sh
```

### Docker Image Management

The project uses dual Docker images with different tagging strategies:

#### Server Images
```bash
# Build server image
make docker-server-upload SERVER_IMAGE_TAG=dev

# Tags: dev, staging, uat, prod (environment-based)
```

#### Migration Images
```bash
# Build migration image
make docker-migration-upload MIGRATION_IMAGE_TAG=dev-123

# Tags: dev-{pipeline_id}, staging-{pipeline_id} (unique per deployment)
```

### Environment-Specific Deployment

Each environment has its own configuration and follows the same deployment pattern:

- **dev**: Deploys on `main` branch
- **staging**: Deploys on `staging` branch
- **uat**: Deploys on `uat` branch
- **prod**: Deploys on `prod` branch

## Testing and Code Style

This project uses Jest for testing, ESLint for linting, and Prettier for formatting.

**Important for AI Agents**: Refer to `GEMINI.md` for specific architectural mandates, formatting rules, and the **Spec-Driven Development (OpenSpec)** flow.

-   **Run all tests:**
    ```bash
    make test
    ```
-   **Run tests in watch mode:**
    ```bash
    make test-watch
    ```
-   **Run local end-to-end tests:**
    ```bash
    make test-local-e2e
    ```
-   **Lint the code:**
    ```bash
    make lint
    ```
-   **Format the code:**
    ```bash
    make format
    ```

## Docker

The project uses separate Docker containers for different purposes:

### Server Container
-   **Build server Docker image:**
    ```bash
    make docker-build SERVER_IMAGE_TAG=latest
    ```
-   **Build and push server image to ECR:**
    ```bash
    make docker-server-upload SERVER_IMAGE_TAG=dev
    ```

### Migration Container
-   **Build migration Docker image:**
    ```bash
    make docker-build-migration MIGRATION_IMAGE_TAG=latest
    ```
-   **Build and push migration image to ECR:**
    ```bash
    make docker-migration-upload MIGRATION_IMAGE_TAG=dev-123
    ```

### ECR Repository Management
-   **Setup ECR repositories:**
    ```bash
    make ecr-setup              # Server repository
    make ecr-setup-migration    # Migration repository
    ```

## API Documentation

This project uses OpenAPI (Swagger) to provide interactive API documentation.

When the application is running in development mode (`make dev`), you can access the Swagger UI at `http://localhost:3000/api`.

The OpenAPI specification file (`openapi.yaml`) is generated from the source code using `@nestjs/swagger`. To manually generate or update this file, run:

```bash
make openapi-doc
```
