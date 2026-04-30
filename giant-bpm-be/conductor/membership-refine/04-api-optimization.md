# Topic 4: Revise API Implementation (Future Work)

## Current Bottleneck
The current `bulkImport` implementation loops through arrays and executes individual `findUnique`, `create`, and `update` queries for every User, OrgUnit, and Membership within a single database transaction. This approach will not scale for large imports.

## Planned Optimizations
Once the sync logic (Topic 2) is finalized, the API should be refactored to use bulk operations:
1. **Batch Lookups:** Pre-fetch existing Users and OrgUnits using `in` queries.
2. **Batch Upserts:** Use bulk operations to insert or update Users and OrgUnits.
3. **Batch Overlap Resolution / Deletions:** Depending on the outcome of Topic 2, execute bulk deletes or bulk updates for overlapping memberships.
4. **Batch Inserts:** Use `prisma.orgMembership.createMany(...)` to insert the final synchronized membership records in a single database call.
