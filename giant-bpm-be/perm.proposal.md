# Permission System Design Proposal & Comparison

## 1. Executive Summary

We propose a **Hybrid Access Control Model** combining **Role-Based Access Control (RBAC)** for high-level administrative functions and **Attribute-Based Access Control (ABAC)** for fine-grained data visibility (Forms, Instances).

-   **Listing/Searching (Read)**: Handled via dynamic SQL/Prisma `where` clauses to ensure performance (filtering happens at the database level).
-   **Actions (Write)**: Handled via a Permission Service/Guard layer to enforce business rules.

## 2. Database Schema Changes

We will introduce a unified `AccessControl` model or specific permission tables to define visibility rules. Given the requirement for permissions based on User Organization and Levels, specific binding tables are recommended for clarity and referential integrity.

### New Models (Prisma)

```prisma
// Enum for the type of entity receiving the permission
enum GranteeType {
  USER          // Specific User
  ORG_UNIT      // Specific Department/Unit
  JOB_GRADE     // Minimum Job Grade (e.g., Level > 5)
  ROLE          // System Role (e.g., 'BPM_Admin')
  EVERYONE      // Public
}

enum PermissionAction {
  VIEW          // Can see it in lists
  USE           // Can submit/apply
  MANAGE        // Can edit/configure
}

// 1. Form Permissions (Who can see/start which form)
model FormPermission {
  id            Int             @id @default(autoincrement())
  form_id       Int
  grantee_type  GranteeType
  grantee_value String          // ID/Code of the user, org, or level
  action        PermissionAction

  form          Form            @relation(fields: [form_id], references: [id], onDelete: Cascade)

  @@index([form_id])
  @@index([grantee_type, grantee_value])
  @@map("form_permissions")
}

// 2. Application/Instance Visibility (Optional Override)
// Usually calculated dynamically, but this table allows manual sharing/delegation
model InstanceShare {
  id                  Int      @id @default(autoincrement())
  workflow_instance_id Int
  user_id             Int      // The user granted access
  permission          String   // 'VIEW', 'COMMENT'
  reason              String?

  instance            WorkflowInstance @relation(fields: [workflow_instance_id], references: [id], onDelete: Cascade)
  user                User             @relation(fields: [user_id], references: [id])

  @@map("instance_shares")
}
```

## 3. Detailed Logic & Implementation

### 3.1. Application Forms (List & Apply)
**Goal**: Admin sees all forms. User A sees a specific subset based on their attributes.

**Implementation**:
When querying `FormService.findAll(user: AuthUser)`, construct a Prisma `where` clause dynamically based on the user's context.

**Logic**:
User has access to Form `F` IF:
1.  `F.createdBy == user.id` (Creator)
2.  OR exists `FormPermission` where `form_id == F.id` AND:
    -   `type == EVERYONE`
    -   `type == USER` AND `value == user.id`
    -   `type == ORG_UNIT` AND `value == user.orgUnitId` (or user's parent orgs)
    -   `type == JOB_GRADE` AND `user.jobGrade >= value`

**Code Snippet (Concept)**:
```typescript
const whereInput: Prisma.FormWhereInput = {
  OR: [
    { created_by: user.id }, // Creator always sees
    {
      form_permissions: {
        some: {
          OR: [
             { grantee_type: 'EVERYONE' },
             { grantee_type: 'USER', grantee_value: String(user.id) },
             { grantee_type: 'ORG_UNIT', grantee_value: { in: user.orgPathCodes } },
             { grantee_type: 'JOB_GRADE', grantee_value: { lte: String(user.jobGrade) } }
          ]
        }
      }
    }
  ]
};
```

### 3.2. Application Instance (View, Search, Filter)

**A. My Applications (Applied)**
-   **Filter**: `applicant_id == user.id`

**B. Waiting for Approval (Pending Me)**
-   **Filter**: Join `WorkflowInstance` -> `WorkflowNode` -> `ApprovalTask`.
-   `ApprovalTask.assignee_id == user.id` AND `ApprovalTask.status == PENDING`
-   *Delegation*: If User A delegates to User B, the system updates the `assignee_id` or adds a `Delegated` record. The query simply looks for `assignee_id`.

**C. Related to Me (Processed/CC)**
-   **Filter**: `WorkflowInstance.events.some(event => event.actor_id == user.id)`

**D. Organization View (Manager Visibility)**
-   If User is a Manager of Org X, they can view instances where `applicant.org_unit_id == X`.

### 3.3. Application Tags
-   **Simple**: Tags are public to all authenticated users.
-   **Complex**: Same structure as `FormPermission` (only certain Orgs can see "HR-Confidential" tag).

---

## 4. Comparison: Native Service-Level vs. Policy Engine (Casbin)

This section compares **Filtering at Database (Prisma/SQL)** versus **Filtering at Application (Casbin Policy Engine)**.

### 4.1. The Core Fundamental Difference

| Feature | Native Prisma (Service Level) | Casbin (Policy Engine) |
| :--- | :--- | :--- |
| **Primary Role** | **Data Retrieval Strategy.** Builds a query to fetch *only* what is allowed. | **Decision Engine.** Answers "Can User X perform Action Y on Resource Z?" -> `True/False`. |
| **Mental Model** | "Select all forms where `user_id` matches or `org_id` matches..." | "Here is a form. Allowed? Yes. Here is another. Allowed? No." |

### 4.2. Deep Dive Comparison

#### A. Handling "List" and "Search" APIs (The Critical Path)
*Requirement: "List forms... Search applications... Sort applications"*

*   **Native Prisma (Recommended):**
    *   **Mechanism:** Inject permission logic directly into the SQL `WHERE` clause.
    *   **Performance:** ⚡️ **High.** The database filters rows efficiently. Pagination works perfectly.
    *   **Complexity:** Requires writing logic to translate user attributes into Prisma query objects.

*   **Casbin:**
    *   **Mechanism:** Checks one request at a time.
        1.  **Fetch All & Filter:** Fetching all records and filtering in-memory kills performance.
        2.  **Batch Enforce:** Getting all allowed IDs first is complex and inefficient for large datasets.
    *   **Performance:** ⚠️ **Low to Medium.** Struggles with large datasets and server-side pagination.

#### B. Handling Complex Action Logic
*Requirement: "Can withdraw? Can delegate?"*

*   **Native Prisma:**
    *   **Mechanism:** Procedural code (e.g., `if (form.status === 'DRAFT'...)`).
    *   **Pros:** Easy to debug, typed (TypeScript), no new syntax.
    *   **Cons:** Logic can be scattered if not centralized.

*   **Casbin:**
    *   **Mechanism:** Rules defined in `.conf` file (PERM meta-model).
    *   **Pros:** **Centralized & Decoupled.** Rules can change without touching code.
    *   **Cons:** Steep learning curve, opaque debugging.

#### C. Maintenance & Flexibility

*   **Native Prisma:**
    *   **Pros:** Strong typing (TypeScript).
    *   **Cons:** Changing rules usually requires code deployment.

*   **Casbin:**
    *   **Pros:** Dynamic updates (rules in DB/UI).
    *   **Cons:** Loose typing; refactoring code can silently break policies.

### 4.3. Summary Table

| Criterion | Native Prisma (Proposed) | Casbin |
| :--- | :--- | :--- |
| **List/Search Performance** | 🟢 **Excellent** (DB native) | 🔴 **Poor** (Requires fetch-then-filter) |
| **Pagination Support** | 🟢 **Native** | 🟠 **Difficult** |
| **Complex Logic (ABAC)** | 🟢 **Flexible** (JS code) | 🟢 **Powerful** (Steep learning curve) |
| **Setup Cost** | 🟢 **Low** (Existing stack) | 🟠 **Medium** (New library, config) |
| **Type Safety** | 🟢 **High** (TypeScript) | 🔴 **Low** (String-based) |
| **Runtime Updates** | 🔴 **No** (Requires deploy) | 🟢 **Yes** (Load rules from DB) |

## 5. Recommendation

**Stick to the Native Prisma Design.**

**Rationale:**
1.  **Performance:** Users expect instant results for Lists, Searches, and Filters. Casbin introduces overhead for these read-heavy operations.
2.  **Complexity:** Translating complex hierarchies (User Org, Relation, Level) into Casbin policy strings is difficult compared to standard SQL/Prisma joins.

**Refinement Strategy:**
Do not install Casbin yet. Instead, **Centralize Prisma Logic** in a `PermissionBuilderService` to gain maintainability without the overhead.

```typescript
// src/common/permission/permission.builder.ts
@Injectable()
export class PermissionBuilder {
  // Solves the "List" problem
  getFormVisibilityWhere(user: AuthUser): Prisma.FormWhereInput {
    // Logic to build WHERE clause
  }

  // Solves the "Action" problem
  async canPerformAction(user: AuthUser, instance: WorkflowInstance, action: string): Promise<boolean> {
     // Business logic for specific actions
  }
}
```
