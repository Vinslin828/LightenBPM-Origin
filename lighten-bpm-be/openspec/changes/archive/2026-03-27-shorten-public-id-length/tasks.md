# Tasks: Shorten Public ID Length

## Phase 1: Preparation
- [x] Install `nanoid` dependency.
- [x] Add `PUBLIC_ID_PREFIX` to `.env.example` and `.env` files.
- [x] Create `src/common/utils/id-generator.ts` with prefix support.

## Phase 2: Schema Change
- [x] Update `prisma/schema.prisma` for all models using `public_id`.
- [x] Run `prisma migrate dev --name shorten_public_id_type` to generate migration.

## Phase 3: Code Implementation (Backend)
- [x] Update repositories to use `generatePublicId()` on creation.
- [x] Update DTOs to relax validation from UUID to general string/regex.
- [x] Update OpenAPI documentation in DTOs (remove `format: 'uuid'`).
- [x] Update any test mocks that rely on UUID format.

## Phase 4: E2E Test Suite (Python)
- [x] Create `e2e_tester/utils/id_generator.py` (compatible with backend).
- [x] Replace `uuid.uuid4()` with the new generator in `e2e_tester/tests/conftest.py`.
- [x] Replace `uuid.uuid4()` in `e2e_tester/tests/test_auth_race_condition.py`.
- [x] Replace `uuid.uuid4()` in `e2e_tester/tests/test_tag_management.py`.
- [x] Replace `uuid.uuid4()` in `e2e_tester/tests/test_validation_registry.py`.
- [x] Replace `uuid.uuid4()` in other test files where used for public IDs.

## Phase 5: Verification
- [x] Run unit tests: `make test`.
- [x] Run E2E tests: `make test-local-e2e`.

