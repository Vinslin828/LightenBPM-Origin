# Master Data Environment-Aware Schema Proposal

## Objective
Update the `master_data` schema handling to dynamically use environment-specific suffixes for remote deployments while defaulting to `master_data` for local setups. 
Specifically, the remote implementation should map `master_data` to schemas like `master_data_dev`, `master_data_uat`, `master_data_staging`, matching the dynamic behavior of the primary schemas (where the main database schema is `dev`, `uat`, etc.).

## Key Files
- `src/master-data/utils.ts`
- `src/master-data/master-data-schema.service.ts`
- `prisma/move-md-tables.sql`
- `infrastructure/scripts/run-pre-migration.sh`
- `Makefile`

## Proposed Changes

### 1. Application Logic Update (`src/master-data/utils.ts` & `src/master-data/master-data-schema.service.ts`)
- Introduce a static method in `MasterDataUtils` to determine the target schema name based on the environment context (`process.env.DB_SCHEMA`).

```typescript
// src/master-data/utils.ts
export class MasterDataUtils {
  // ... existing code

  /**
   * Returns the dynamic master_data schema name based on the environment.
   */
  static getMasterDataSchemaName(): string {
    const dbSchema = process.env.DB_SCHEMA;
    if (dbSchema && dbSchema !== 'public') {
      return `master_data_${dbSchema}`;
    }
    return 'master_data';
  }

  /**
   * Returns the full table name with schema prefix if it starts with md_.
   */
  static getFullTableName(tableName: string): string {
    this.validateIdentifier(tableName);
    if (tableName.startsWith('md_')) {
      return `"${this.getMasterDataSchemaName()}"."${tableName}"`;
    }
    return `"${tableName}"`;
  }
}
```
- Update `MasterDataSchemaService` to use `MasterDataUtils.getMasterDataSchemaName()` wherever `master_data` is hardcoded (e.g., when initializing the schema or checking for table existence).

```typescript
// src/master-data/master-data-schema.service.ts
const schemaName = MasterDataUtils.getMasterDataSchemaName();

await this.prisma.$executeRawUnsafe(
  `CREATE SCHEMA IF NOT EXISTS "${schemaName}";`,
);

// Update all occurrences of "master_data" string literal to use `schemaName`
```

### 2. Pre-migration SQL Update (`prisma/move-md-tables.sql`)
Refactor the SQL script to be environment-agnostic. Currently, it hardcodes `public` as the source schema and `master_data` as the target schema. This fails or does the wrong thing on remote environments because Prisma maps migrations directly to the environment's default schema (e.g., `dev`, `uat`).

We will leverage PostgreSQL's session variables (`custom.source_schema` and `custom.target_schema`) to parameterize the script:

```sql
DO $$
DECLARE
    r RECORD;
    v_source text;
    v_target text;
BEGIN
    BEGIN
        v_source := current_setting('custom.source_schema');
        v_target := current_setting('custom.target_schema');
    EXCEPTION WHEN OTHERS THEN
        -- Fallback if variables are not set
        v_source := 'public';
        v_target := 'master_data';
    END;

    IF v_source IS NULL OR v_source = '' THEN v_source := 'public'; END IF;
    IF v_target IS NULL OR v_target = '' THEN v_target := 'master_data'; END IF;

    EXECUTE 'CREATE SCHEMA IF NOT EXISTS ' || quote_ident(v_target);

    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = v_source AND tablename LIKE 'md_%') 
    LOOP
        RAISE NOTICE 'Moving table %.% to %.%', v_source, r.tablename, v_target, r.tablename;
        EXECUTE 'ALTER TABLE ' || quote_ident(v_source) || '.' || quote_ident(r.tablename) || ' SET SCHEMA ' || quote_ident(v_target) || ';';
    END LOOP;
END $$;
```

### 3. Pre-migration Runner Update (`infrastructure/scripts/run-pre-migration.sh`)
Update the ECS task override command inside `run-pre-migration.sh` to pass the correct schema variables based on `$DB_SCHEMA` before running the SQL.

Modify the `command` section in the container override:
```bash
# In the `aws ecs run-task` overrides command
echo 'Running pre-migration fix (moving md_* tables)...'; \
export TARGET_SCHEMA=\"master_data${DB_SCHEMA:+_$DB_SCHEMA}\"; \
(echo \"SET custom.source_schema='${DB_SCHEMA:-public}'; SET custom.target_schema='${TARGET_SCHEMA}';\"; cat prisma/move-md-tables.sql) | PGPASSWORD=$DB_PASSWORD psql -h $DB_ENDPOINT -p ${DB_PORT:-5432} -U $DB_USERNAME -d $DB_NAME || echo 'Pre-migration fix failed or already run, continuing...'
```
*(Note: `${DB_SCHEMA:+_$DB_SCHEMA}` will append `_dev` if `DB_SCHEMA` is `dev`, resulting in `master_data_dev`. If `DB_SCHEMA` is empty, it results in `master_data`.)*

### 4. Makefile Update (`Makefile`)
For local development, we want to ensure the `move-md-tables` command correctly executes using the `public` and `master_data` defaults.

```makefile
move-md-tables:
	@echo "Moving md_* tables to master_data schema in local-db container..."
	@docker-compose exec -T local-db /bin/sh -c 'echo "SET custom.source_schema='\''public\''; SET custom.target_schema='\''master_data\'';" | cat - prisma/move-md-tables.sql | psql -U postgres -d bpm-local-db -f -' || echo "Pre-migration script already run or no tables to move."
```

## Verification
- Validate the changes against unit tests `master-data-record.service.spec.ts`, `master-data-schema.service.spec.ts` and `get-master-data.executor.spec.ts` by mocking `process.env.DB_SCHEMA` or extracting schema-prefix logic. Tests with hardcoded `master_data` strings will need to be updated.
- Verify that running `make dev` locally successfully moves `md_*` tables to `master_data`.
- Verify the script handles ECS deployments and successfully creates and moves tables to `master_data_dev` / `master_data_uat`.
