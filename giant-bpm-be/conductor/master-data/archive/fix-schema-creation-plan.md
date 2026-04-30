# Plan: Fix Master Data Schema Creation Bug

## Objective
Fix the `ERROR: cannot insert multiple commands into a prepared statement` issue by removing the `CREATE SCHEMA IF NOT EXISTS "master_data";` from the dataset creation transaction. Instead, execute this command safely at application startup.

## Key Files & Context
- `src/master-data/master-data-schema.service.ts`: Contains the `createTableSql` which currently combines `CREATE SCHEMA` and `CREATE TABLE`.

## Implementation Steps
1. **Implement `OnModuleInit` in `MasterDataSchemaService`**:
   - Import `OnModuleInit` from `@nestjs/common`.
   - Implement the interface in the class: `export class MasterDataSchemaService implements OnModuleInit`.
   - Add an `async onModuleInit()` lifecycle method.
   - Within `onModuleInit`, execute `await this.prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS "master_data";');`. This ensures the schema exists before any requests are handled by the application.
2. **Update `createDataset` SQL**:
   - Modify the `createTableSql` definition to only contain the `CREATE TABLE` command.
   - Remove `CREATE SCHEMA IF NOT EXISTS "master_data";` from `createTableSql` string to avoid the prepared statement multiple-command error.

## Verification
- Verify that `make dev` and tests pass without the multiple command error.
- Verify the Master Data schema is still correctly created when the application starts up.