# Refactor Plan: Decoupling Prisma ORM from Service Layer

This document outlines the strategy for the remaining refactoring tasks to fully decouple the Service layer from `PrismaService`.

## Objective
To ensure all database interactions in the Service layer are mediated through specific **Repositories** and the `TransactionService`. Services should **not** import or inject `PrismaService` directly.

## Identified Targets

The following modules currently violate the architecture rules and require refactoring:

| Service File | Status | Action Required |
| :--- | :--- | :--- |
| `src/flow-engine/workflow-engine.service.ts` | **Critical** | Full extraction of DB logic to Repository. |
| `src/form-workflow-binding/form-workflow-binding.service.ts` | **Critical** | Full extraction of DB logic to Repository. |
| `src/instance/application.service.ts` | **Critical** | Full extraction of DB logic to Repository. |
| `src/tag/tag.service.ts` | **Critical** | Full extraction of DB logic to Repository. |
| `src/workflow/workflow.service.ts` | **Cleanup** | Replace `repository.Transaction` with `TransactionService`. |
| `src/workflow/repositories/workflow.repository.ts` | **Cleanup** | Remove `get Transaction()` getter (Anti-pattern). |
| `src/form/form.service.ts` | **Cleanup** | Remove unused `PrismaService` injection. |

## Architectural Standards

### 1. The Repository Pattern
*   **Location:** `src/<module>/repositories/<module>.repository.ts`
*   **Responsibility:** Pure data access (CRUD, simple queries, complex joins).
*   **Rule:** Repositories must **not** contain business logic.
*   **Transaction Support:** All write methods (and read methods used in locks) must accept an optional `tx: PrismaTransactionClient` parameter.

**Example:**
```typescript
async create(data: CreateDto, tx?: PrismaTransactionClient): Promise<Entity> {
  const client = tx || this.prisma;
  return client.entity.create({ data });
}
```

### 2. Transaction Management
*   **Location:** `src/database/transaction.service.ts`
*   **Usage:** Services must use `TransactionService` to orchestrate atomic operations across multiple repositories.
*   **Rule:** NEVER use `prisma.$transaction` directly in services.

**Example:**
```typescript
return this.transactionService.runTransaction(async (tx) => {
  const user = await this.userRepo.create(userData, tx);
  await this.profileRepo.create(profileData, user.id, tx);
  return user;
});
```

### 3. Data Transfer Objects (DTOs)
*   **Repositories** should return **Prisma Generated Types** (e.g., `User`, `FormWithRelations`).
*   **Services** are responsible for mapping these Prisma types to application DTOs (e.g., `UserDto`, `FormResponseDto`).

## Step-by-Step Execution Plan

### Phase 1: Easy Wins & Cleanup
1.  **Form Service:** Remove unused `PrismaService` from `src/form/form.service.ts`.
2.  **Workflow Service:**
    *   Inject `TransactionService` into `WorkflowService`.
    *   Replace `this.workflowRepository.Transaction.$transaction` with `this.transactionService.runTransaction`.
    *   Remove `get Transaction()` from `WorkflowRepository`.

### Phase 2: Tag Module
1.  Create `TagRepository` in `src/tag/repositories/tag.repository.ts`.
2.  Move DB logic from `TagService` to `TagRepository`.
3.  Inject `TagRepository` into `TagService` and remove `PrismaService`.

### Phase 3: Form-Workflow Binding Module
1.  Refactor `FormWorkflowBindingRepository` (if exists) or create it.
2.  Move DB logic from `FormWorkflowBindingService` to the repository.
3.  Ensure methods accept `tx?` for transactional support.

### Phase 4: Application Instance Module
1.  Create `ApplicationRepository` in `src/instance/repositories/application.repository.ts`.
2.  Extract complex queries (e.g., filtering instances) into repository methods.
3.  Refactor `ApplicationService` to use the repository.

### Phase 5: Workflow Engine (Complex)
1.  Analyze `WorkflowEngineService` for direct DB calls (likely complex state updates).
2.  Create/Update `WorkflowRuntimeRepository` (or similar) to handle node execution state updates.
3.  Refactor service to use `TransactionService` for critical state transitions (e.g., moving a token from one node to another).

## Verification
*   After refactoring each module, run `make test` to ensure no regressions.
*   Verify that `PrismaService` is **not imported** in the refactored service files.

## Current Status (as of 2025-12-26)

The core objectives of this refactor plan have been **successfully completed**. All primary Service layer modules have been decoupled from `PrismaService` and now utilize the Repository Pattern and `TransactionService`.

### Completed Items
- ✅ **Workflow Engine:** Full extraction of DB logic to repositories (`WorkflowInstanceRepository`, `ApprovalTaskRepository`, `WorkflowNodeRepository`, `FormInstanceRepository`, `ApplicationRepository`, `WorkflowCommentRepository`).
- ✅ **Form-Workflow Binding:** Refactored to use `FormWorkflowBindingRepository`.
- ✅ **Application Service:** Refactored to use `ApplicationRepository`.
- ✅ **Tag Module:** Refactored to use `TagRepository`.
- ✅ **Workflow Service:** Now uses `TransactionService` for orchestrating operations; direct `PrismaService` injection removed.
- ✅ **Form Service:** Unused `PrismaService` injection removed.
- ✅ **Workflow Repository:** `get Transaction()` anti-pattern removed.

### Remaining Edge Cases & Next Steps
While the main Service layer is decoupled, some infrastructure and secondary files still inject `PrismaService` directly. These should be addressed to achieve 100% architectural consistency:

1.  **Auth Guards Cleanup:**
    - Refactor `src/auth/auth.guard.ts` to use `OrgUnitRepository` instead of direct `PrismaService`.
    - Refactor `src/auth/temp-auth.guard.ts` to use `UserRepository` instead of direct `PrismaService`.
2.  **Healthy Controller:**
    - Update `src/healthy/healthy.controller.ts` to use a more abstract health check if desired, though direct DB ping is often acceptable in health checks.
3.  **Continuous Monitoring:**
    - Ensure new services follow the established repository pattern and use `TransactionService` for all database interactions.

## Current Status Verification (2025-12-29)

Upon reviewing the `develop-repositories` branch, the following discrepancies and issues were found compared to the "Completed" status above. The codebase is currently in a broken state due to incomplete merge/cherry-pick operations.

### 1. Missing Infrastructure
*   **CRITICAL:** `src/database/transaction.service.ts` is **missing** from the codebase.
*   **Impact:** `ApplicationService`, `WorkflowService`, and `FormService` fail to compile as they import `TransactionService`.

### 2. Analysis of Repeated Sessions (Implementation Conflicts)
It appears two different approaches to transaction management were implemented in parallel:
*   **Approach A (TransactionService):** Used by `ApplicationService`, `WorkflowService`, `FormService`. Expects a dedicated service to wrap transaction logic.
*   **Approach B (PrismaService Extension):** Used by `WorkflowEngineService`. `PrismaService` was modified to include a `runTransaction` method directly.
*   **Result:** The codebase currently has a mix of both, but missing the file for Approach A, while Approach B is active in `WorkflowEngineService`.

### 3. Workflow Engine Inconsistencies
*   `src/flow-engine/workflow-engine.service.ts` still injects `PrismaService` directly, violating the decoupling objective.
*   It uses `this.db.runTransaction(...)`, which is the implementation from Approach B.

### 4. Ghost Directories
*   `src/binding` exists but is empty (only empty subdirectories). It is a duplicate/leftover of `src/form-workflow-binding`.

## Current Status Verification (2025-12-30)

Upon re-analyzing the codebase after the rebase, the following status is confirmed:

### 1. Infrastructure Status
*   `src/database/transaction.service.ts`: **Exists** and is implemented correctly. It should be the sole way to handle transactions in the Service layer.
*   `src/prisma/prisma.service.ts`: Contains a `runTransaction` method which is redundant if we strictly follow the `TransactionService` pattern.

### 2. Service Layer Compliance
*   **WorkflowService**: Successfully uses `TransactionService`.
*   **ApplicationService**: Successfully uses `TransactionService`.
*   **FormService**: Uses `TransactionService` but still contains an **unused** `PrismaService` import.
*   **TagService**: Successfully uses `TagRepository`.
*   **FormWorkflowBindingService**: Successfully uses `FormWorkflowBindingRepository`.
*   **WorkflowEngineService**: **Violation detected.** It still injects `PrismaService` and uses `this.db.runTransaction()`.

### 3. Repository Layer
*   `WorkflowRepository`: `get Transaction()` getter has been removed. Correct.

### 4. Ghost Directories
*   `src/binding`: Verified as **deleted**. Correct.

## Refactoring Proposal: Moving `PrismaTransactionClient`

**Suggestion:** Move `PrismaTransactionClient` type definition to `src/database/**` to better align with the architecture where `src/database` owns transaction abstractions.

**Analysis:**
*   **Pros:** Centralizes transaction-related definitions in `src/database`. Makes `src/database` the primary entry point for transaction logic.
*   **Cons/Risks:** `PrismaService` (in `src/prisma`) currently imports this type for its `runTransaction` method. If `PrismaService` imports from `src/database`, and `TransactionService` (in `src/database`) imports `PrismaService`, we create a circular dependency.
*   **Mitigation:** The `runTransaction` method in `PrismaService` is redundant (superseded by `TransactionService`) and unused. Removing it breaks the dependency of `PrismaService` on the type, allowing the move without circular issues.

**Revised Plan (2025-12-30):**

1.  **Cleanup FormService**: Remove unused `PrismaService` import. (Status: **Pending**)
2.  **Refactor WorkflowEngineService**:
    *   Inject `TransactionService`.
    *   Replace `PrismaService`.
    *   Update transaction calls. (Status: **Pending**)
3.  **Refactor Transaction Types**:
    *   Remove unused `runTransaction` method from `src/prisma/prisma.service.ts`.
    *   Move `src/prisma/prisma-transaction-client.types.ts` to `src/database/transaction-client.type.ts`.
    *   Update all imports (`src/database/transaction.service.ts`, Repositories, Services). (Status: **Pending**)
4.  **Final Verification**: Build and Test.
