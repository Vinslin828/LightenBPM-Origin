# Design: Database-Driven Permission Checks (Prefetched via AuthGuard)

## Architecture Overview
This design moves the responsibility of fetching user organizational context from the individual permission checks to the request initialization phase (`AuthGuard`). This ensures that the `PermissionBuilderService` can operate on in-memory data, remaining synchronous and highly performant.

### 1. `AuthUser` Interface Updates
Modify `src/auth/types/auth-user.ts`:
```typescript
export interface AuthUser {
  id: number;
  // ... existing fields ...
  orgIds: number[];  // IDs of type ORG_UNIT
  roleIds: number[]; // IDs of type ROLE
}
```

### 2. User Data Fetching (`UserService` / `AuthGuard`)
Update the user retrieval logic to include all memberships:
- Fetch `org_memberships` with the related `org_unit` (to check the `type` enum).
- Map memberships where `type === ORG_UNIT` to `orgIds`.
- Map memberships where `type === ROLE` to `roleIds`.

### 3. Synchronous `PermissionBuilderService`
Revert all methods to be synchronous (remove `async` and `Promise` wrappers).

**`getGranteeFilters` Logic**:
```typescript
  private getGranteeFilters<T>(user: AuthUser): T[] {
    const orgIdsStrs = user.orgIds.map(String);
    const roleIdsStrs = user.roleIds.map(String);

    return [
      { grantee_type: GranteeType.EVERYONE },
      { grantee_type: GranteeType.USER, grantee_value: String(user.id) },
      {
        grantee_type: GranteeType.ORG_UNIT,
        grantee_value: { in: orgIdsStrs },
      },
      {
        grantee_type: GranteeType.ROLE,
        grantee_value: { in: roleIdsStrs },
      },
      {
        grantee_type: GranteeType.JOB_GRADE,
        grantee_value: { lte: String(user.jobGrade) },
      },
    ] as T[];
  }
```

**`canPerformAction` Logic**:
```typescript
case GranteeType.ORG_UNIT:
  return user.orgIds.includes(parseInt(p.grantee_value, 10));
case GranteeType.ROLE:
  return user.roleIds.includes(parseInt(p.grantee_value, 10));
```

### 4. Cleanup of Calling Services
- Remove all `await` keywords when calling `permissionBuilder` methods in `FormService`, `WorkflowService`, and `ApplicationService`.
- Revert method signatures that were unnecessarily made `async` solely for permission checks (if applicable).

## Implementation Sequence
1.  **Phase 1**: Update `AuthUser` type and `AuthGuard`/`UserService` to populate the new arrays.
2.  **Phase 2**: Revert `PermissionBuilderService` to synchronous and update logic to use `orgIds`/`roleIds`.
3.  **Phase 3**: Strip `await` calls and `async` wrappers from services and controllers.
4.  **Phase 4**: Update unit tests to match synchronous signatures.
