# Gemini Development Guidelines

> [!IMPORTANT]
> **Agent Mandates (AI/LLM Guidelines)**
> To maintain architectural integrity, all AI-driven development MUST follow these mandates:
>
> 1. **Spec-Driven Development (OpenSpec)**:
>    - **OpenSpec Flow**: ALWAYS follow the `proposal -> design -> tasks` flow for any non-trivial change.
>    - **Changes Directory**: Store all change-related documents in `openspec/changes/<change-id>/`.
>    - **Implementation**: NEVER start implementation before a `tasks.md` is created and the user provides a direct instruction to act.
>    - **Task Updates**: Keep `tasks.md` updated as work progresses (mark `[x]` for completed tasks).
>
> 2. **Architectural Boundaries**:
>    - **Service-First Access**: A service in Module A MUST inject the *Service* of Module B, NEVER its *Repository*.
>    - **Data Providers**: Logic cores (e.g., `flow-engine`) MUST use a dedicated Data Service (e.g., `InstanceDataService`) for persistence instead of raw Repositories.
>
> 3. **Formatting & Cleanliness**:
>    - **Trailing Spaces**: NEVER leave trailing whitespace in any file (especially Python, Markdown, and SQL).
>    - **Prettier**: ALWAYS run `make format` (Prettier) after modifying TypeScript, JSON, YAML, or Markdown files.
>    - **Python Linting**: Manually ensure no trailing spaces in `.py` files.
>
> 4. **Transaction Management**:
>    - Always use `TransactionService.runTransaction` for multi-step database writes.
>    - **Context Passing**: Methods involved in a transaction MUST accept an optional `tx: PrismaTransactionClient` and pass it down the call stack.
>
> 5. **Data Modeling (Identity vs. State)**:
>    - Separate **Identity** (immutable metadata) from **State** (snapshots/history).
>    - Use `[Entity]Data` for snapshots and `[Entity]Event` for lifecycle transitions.
>    - **Read-Cache**: Keep current `status` in the main table for performance, but sync it atomically with an event record.
>
> 6. **Verification & Testing**:
>    - **Bug Fixes**: Reproduce the issue with a script in `dev-utils/ts-node/reproduce_issue.ts` before fixing.
>    - **Validation**: Run the Python E2E suite (`make test-local-e2e`) for changes to `flow-engine`, `instance`, or `workflow` modules.
>
> 7. **Prisma Migrations**:
>    - Manually remove the `public.` schema prefix from generated SQL files to support remote schemas.
>    - Use custom SQL for data transformations during "Expand and Contract" phases within migrations.
>
> 8. **Type Safety & Prisma Conventions**:
- **Zero-Tolerance for `any` (Mandatory)**: NEVER use `any` or generic payload types (e.g., `Prisma.[Model]GetPayload<any>`) in Repository or Service signatures. Defining precise types (e.g., `UserWithOrg`) is required for all data structures.
- **Validated Relation Types (Mandatory)**: When fetching entities with relations (using `include` or `select`), ALWAYS use the `Prisma.validator` pattern to define and export a specific type in the Repository.
- **Mandatory Service Typing**: In Services, always explicitly type variables receiving data from a Repository (e.g., `const result: MyTypedEntity | null = await ...`).
- **Immediate Linting (Mandatory)**: ALWAYS run `make lint` after modifying TypeScript files to catch `@typescript-eslint/no-unsafe-*` violations before finalizing a task. Verification is not complete until linting passes.


This document outlines the basic rules and conventions to follow when developing in this NestJS project.

## Commit Messages

Please follow the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification. This helps in automating changelog generation and semantic versioning.

The basic format is:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

- **types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`.
- **scope**: The module or part of the codebase the commit affects (e.g., `auth`, `users`, `demo`).

**Example:**

```
feat(demo): add new endpoint for demo module
```

**Note:** To enforce this convention, consider using a tool like [commitlint](https://commitlint.js.org/).

## Code Style

- **Formatting**: This project uses Prettier for automatic code formatting. Please run `make format` before committing.
- **Linting**: This project uses ESLint for identifying and fixing problems in the code. Please run `make lint` before committing.

## Branching Strategy

- All new development should happen in a feature branch.
- Branch names should be descriptive, e.g., `feat/add-user-authentication`, `fix/resolve-login-bug`.
- Create pull requests to merge feature branches into `main`.
- Do not push directly to `main`.

## Testing

- Write unit tests for new services, controllers, and other logic.
- Write end-to-end (e2e) tests for new features to ensure they work as expected from a user's perspective.
- Run all tests using `make test` and `make test-local-e2e` before creating a pull request.

### E2E Testing with Docker

To run the full Python-based E2E test suite in a Docker container (recommended for consistency), use the following command from the `e2e_tester` directory:

```bash
docker-compose -f docker-compose.e2e.yml run --build --rm e2e-tester
```

**Available Skill:** You can activate the `run-e2e-tests` skill to get expert guidance on running these tests, including options for targeting different environments or keep test data for debugging.

## API Design

- Follow RESTful principles for API design.
- Use nouns for resource URLs (e.g., `/users`, `/products`).
- Use appropriate HTTP verbs for actions (e.g., `GET`, `POST`, `PUT`, `DELETE`).
- Use DTOs (Data Transfer Objects) for request and response validation and typing.

## OpenAPI Specification

This project uses `@nestjs/swagger` to generate an OpenAPI (formerly Swagger) specification from the source code. This specification provides a detailed and interactive documentation of the API.

### Generating the Specification

To generate or update the `openapi.yaml` file, run:

```bash
make openapi-doc
```

The generated file will be located at the root of the project.

### Viewing the Documentation

When the application is running (`make dev`), the interactive Swagger UI is available at `http://localhost:3000/bpm/openapi`.

### API Modules

The API is organized into the following modules, which are reflected as tags in the OpenAPI specification:

-   **User Management**: Endpoints for managing users.
-   **Form Management**: Endpoints for creating and managing forms and their versions.
-   **Form Labels Management**: Endpoints for managing multi-language labels for forms.
-   **Workflow Management**: Endpoints for managing workflow definitions.
-   **Flow Engine | Application Life Cycle**: Endpoints for managing the lifecycle of form submissions and approvals.
-   **System Healthy API**: Endpoints for health checks.

## Database Schema Documentation

This project uses `prisma-dbml-generator` to generate a DBML file from the Prisma schema.

- The DBML file is automatically generated at `prisma/dbml/schema.dbml` whenever you run `make dev`, `make build`, or `make prisma`.
- You can visualize the DBML file using an online tool like [dbdiagram.io](https://dbdiagram.io).

## Database Migrations

This project uses Prisma Migrate for database migrations.

-   **Create a new migration:**
    ```bash
    make migrate-dev name=<migration_name>
    ```
-   **Check migration status:**
    ```bash
    make migrate-status
    ```
-   **Reset the database:**
    ```bash
    make migrate-reset
    ```

## Deployment

To deploy the application, use the `deploy` command:

```bash
make deploy DEPLOYMENT_TYPE=<env>
```
