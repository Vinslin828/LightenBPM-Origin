# Design: Default System Tables for Users & Organizations

## Architecture
1. **Constants**: Create `src/master-data/constants.ts` to hold `SYSTEM_DATASETS`, defining the schema (fields, types) for `USERS` and `ORG_UNITS`.
   - `USERS`: `code` (TEXT), `name` (TEXT), `email` (TEXT), `job_grade` (NUMBER), `default_org_id` (NUMBER).
   - `ORG_UNITS`: `code` (TEXT), `name` (TEXT), `type` (TEXT), `parent_id` (NUMBER).
2. **Schema Service Interception**:
   - Update `MasterDataSchemaService.getDataset` and `MasterDataSchemaService.exportDataset`.
   - If `code` matches `USERS` or `ORG_UNITS`, return the static definition from constants instead of querying `datasetDefinition`.
3. **Record Service Interception**:
   - Update `findRecords` in `MasterDataRecordService`: if system dataset, map filtering/sorting parameters and use `this.prisma.user.findMany` / `count` (or raw equivalent using physical table names).
   - Update `createRecord`, `updateRecords`, `deleteRecords` in `MasterDataRecordService` to explicitly check for system datasets and throw `ForbiddenException("System datasets are read-only.")`.
4. **Data Mapping**:
   - Given Prisma returns fields correctly from `$queryRawUnsafe` or Prisma Client, we need to make sure the physical tables (`users`, `org_units`) can be queried similarly to dynamically created ones. Since `users` and `org_units` use normal columns, `queryRawUnsafe` with dynamic WHERE clauses works fine as long as table names (`users` vs `md_code`) are correctly resolved.

## Security
- System datasets must NEVER be updatable via the master data API. All mutative functions will immediately fail.