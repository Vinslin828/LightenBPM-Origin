# Project Context

## Purpose
The **Giant BPM Backend** (`giant-bpm-be`) is a robust API designed to support a Business Process Management (BPM) system. It manages the lifecycle of dynamic forms, complex workflows, organization structures, and the execution of approval processes. The goal is to provide a scalable and efficient backend for defining, submitting, and tracking business applications and approvals.

## Tech Stack
- **Framework:** [NestJS](https://nestjs.com/) (TypeScript)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (v5.7+)
- **Database:** [PostgreSQL](https://www.postgresql.org/) (Aurora PostgreSQL Serverless v2 in AWS)
- **ORM:** [Prisma](https://www.prisma.io/) (v6.2.0)
- **Package Manager:** [pnpm](https://pnpm.io/) (v10.15.1)
- **Containerization:** [Docker](https://www.docker.com/) (Dual-image: Server & Migration)
- **Infrastructure:** AWS (ECS Fargate, ECR, Secrets Manager, SQS)
- **Testing:** [Jest](https://jestjs.io/) (Unit & E2E)
- **Documentation:** OpenAPI (Swagger), DBML
- **Validation:** `class-validator`, `class-transformer`
- **Authentication:** JWT (via `@nestjs/jwt`)

## Project Conventions

### API Standards
- **Global Prefix:** `/bpm` (e.g., `http://localhost:3000/bpm/users`)
- **Documentation:** Swagger UI available at `http://localhost:3000/bpm/openapi`
- **Validation:** Global `ValidationPipe` is enabled with `whitelist: true` and `transform: true`. All DTOs should use `class-validator` decorators.
- **CORS:** Enabled for all origins (`*`) by default.
- **Public IDs:** External resources use UUIDs (`public_id`), while internal references use integer `id`s.

### Code Style
- **Formatting:** Prettier is used for automatic formatting (`make format`).
- **Linting:** ESLint is used for code quality (`make lint`).
- **Commits:** Follow [Conventional Commits](https://www.conventionalcommits.org/) (e.g., `feat(auth): add login`).

### Architecture Patterns
- **Modular Monolith:** Organized by NestJS modules (e.g., `AuthModule`, `FormModule`, `WorkflowModule`, `FlowEngineModule`).
- **Dual-Tag Deployment:** Separates application code (Server Container) from database schema changes (Migration Container) for safer deployments.
- **Validation Registry:** A centralized system for managing validation rules (Code & API based) for form components, stored in the database.

### Testing Strategy
- **Unit Tests:** `make test` (Jest) for services and controllers.
- **E2E Tests:** `make test-local-e2e` for full system integration testing using a dedicated test database container.
- **CI/CD:** Automated testing pipeline in GitLab CI.

### Git Workflow
- **Branching:** Feature branches (`feat/...`, `fix/...`) merged into `main` via Pull Requests.
- **No Direct Push:** Direct pushes to `main` are prohibited.

## Directory Structure
```
.
├── src/
│   ├── common/             # Shared utilities, decorators, middleware, guards
│   ├── config/             # Configuration files (e.g., database URL builder)
│   ├── [module]/           # Domain modules (e.g., user, form, workflow)
│   │   ├── dto/            # Data Transfer Objects
│   │   ├── [module].controller.ts
│   │   ├── [module].service.ts
│   │   └── [module].module.ts
│   ├── app.module.ts       # Root module
│   └── main.ts             # Application entry point
├── prisma/
│   ├── schema.prisma       # Database schema
│   ├── seed.ts             # Database seeding script
│   └── migrations/         # SQL migration files
├── docker/                 # Dockerfiles for server and migration images
├── infrastructure/         # Deployment scripts (AWS, etc.)
├── openspec/               # Project specifications and change proposals
└── test/                   # E2E test configuration and specs
```

## Domain Context
- **Forms & Workflows:** Support versioning with states: `DRAFT`, `ACTIVE`, `SCHEDULED`, `ARCHIVED`, `RETIRED`.
- **Flow Engine:** Manages application instance lifecycle: `DRAFT`, `RUNNING`, `COMPLETED`, `REJECTED`, `CANCELLED`.
- **Approval Logic:** Actions include `SUBMIT`, `APPROVE`, `REJECT`, `DELEGATE`, `ESCALATE`, `WITHDRAW`.
- **Organization:** `OrgUnit` (hierarchy) and `OrgMembership` (user assignments with roles).
- **Validation Registry:** Supports `CODE` (regex/logic) and `API` (external call) validation types mapped to UI components.

## Environment Variables
- `DATABASE_URL`: Connection string for PostgreSQL (constructed dynamically in AWS).
- `PORT`: Application port (default: 3000).
- `PUBLIC_ID_PREFIX`: Prefix for public IDs (optional).
- `DEPLOYMENT_TYPE`: Environment identifier (dev, staging, prod).
- `SERVER_IMAGE_TAG` / `MIGRATION_IMAGE_TAG`: Docker image tags for deployment.

## External Dependencies
- **AWS:** Secrets Manager (for DB creds), SQS, ECR.
- **Auth Provider:** Integrates with an identity provider (likely Auth0 based on schema `sub` field), verifying JWTs.
