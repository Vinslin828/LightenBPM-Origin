# Topic 3: Soft Delete Handling

## Decisions Made
1. **No Soft Deletes for Memberships:** We will not introduce a `deleted_at` column for `OrgMembership`. The timeline is managed purely through `startDate` and `endDate`.
2. **Handling `isDeleted` in Payload:**
   * The `isDeleted` flag is largely redundant since history is managed by dates.
   * If a payload includes `isDeleted: true`, we will force the `endDate = now()` **ONLY IF** the membership's current `endDate` is in the future (i.e., it is currently active). We will ignore the flag for historical records to prevent accidentally extending past memberships into the present.
3. **Parent Soft Deletes (User/OrgUnit):**
   * If a `User` or `OrgUnit` is soft-deleted, their associated `OrgMembership` records will be left **as-is**. This preserves historical accuracy in case the parent entity is restored later.
   * **Action Item:** We must update repository read queries (e.g., `findOrgUnitUserMemberships`) to explicitly ensure they filter out memberships whose parent `User` or `OrgUnit` has a non-null `deleted_at`.
