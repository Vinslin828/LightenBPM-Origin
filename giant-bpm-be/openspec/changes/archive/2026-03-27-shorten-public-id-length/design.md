# Design: Shorten Public ID Length

## Target Format
-   **Library:** [NanoID](https://github.com/ai/nanoid) is recommended.
-   **Length:** 12 characters (excluding prefix).
-   **Alphabet:** `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz` (URL-safe).
-   **Prefix:** A configurable string (e.g., "U") prepended to the ID.
    -   Format: `{PREFIX}{NANOID}` (e.g., `U1234567890ab`)

## Affected Tables
The following tables use `public_id`:
- `Form`
- `FormRevision`
- `Workflow`
- `WorkflowRevisions`
- `FormInstance`
- `WorkflowInstance`
- `WorkflowNode`
- `ApprovalTask`
- `ValidationRegistry`
- `ValidationComponentMapping`

## Implementation Details

### 1. Configuration
Add `PUBLIC_ID_PREFIX` to environment variables (e.g., `.env`).
- Default: Empty string (or "L" for local).
- Example: `PUBLIC_ID_PREFIX=U` for UAT.

### 2. Prisma Schema Updates
Remove `@db.Uuid` and `@default(uuid())` from all `public_id` fields.
Update the type to `String`.

Example:
```prisma
// Before
public_id String @unique @default(uuid()) @db.Uuid

// After
public_id String @unique
```

### 3. ID Generation Utility (Backend)
Create a centralized utility `src/common/utils/id-generator.ts`.
- It should read `PUBLIC_ID_PREFIX` from `ConfigService` or `process.env`.
- It should use `nanoid` to generate the random part.

### 4. Repository Layer
Update repository methods to generate the `public_id` before calling Prisma `create` if it's not provided.

### 5. Validation Update
Replace `@IsUUID()` with `@IsString()` in DTOs.
Add validation to check for the correct format if necessary, or just length checks (e.g., 12-20 chars).

### 6. E2E Test Suite (Python)
The E2E tester is written in Python. We must implement a compatible generator in `e2e_tester`.
- **New Utility:** Create `e2e_tester/utils/id_generator.py`.
- **Implementation:** Use Python's `secrets` or `nanoid` library to match the backend's alphabet and length.
- **Updates:** Replace `uuid.uuid4()` calls in test files (`conftest.py`, etc.) with this new utility.

## Data Migration
PostgreSQL handles the transition from `UUID` to `VARCHAR` gracefully. Existing UUIDs will be stored as their string representation.
