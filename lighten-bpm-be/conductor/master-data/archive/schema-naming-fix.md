# Master Data Schema Fix Plan

## Objective
Update the dynamic schema naming convention and adjust initialization logic to align with the
infrastructure team's rules for production environments.

## Scope & Impact

| File | Change |
|---|---|
| `src/master-data/utils.ts` | Flip schema name format to `${dbSchema}_master_data` |
| `src/master-data/utils.spec.ts` | Update all affected test assertions (2 in `getMasterDataSchemaName`, 1 in `getFullTableName`) |
| `src/master-data/master-data-schema.service.ts` | Skip `CREATE SCHEMA` if schema was pre-created by admin |
| `prisma/rename-master-data-schema.sql` | New script — renames existing old-format schemas in-place |
| `infrastructure/scripts/run-pre-migration.sh` | Add rename step; update `TARGET_SCHEMA` to new format |

---

## Proposed Solution

### 1. Update `getMasterDataSchemaName()` in `utils.ts`

```typescript
static getMasterDataSchemaName(): string {
  const dbSchema = process.env.DB_SCHEMA;
  if (dbSchema && dbSchema !== 'public') {
    return `${dbSchema}_master_data`;
  }
  return 'master_data';
}
```

### 2. Update Tests in `utils.spec.ts`

Three assertions need updating:

**`getMasterDataSchemaName` block (lines 67–75):**
```typescript
// Line 69: 'master_data_dev' -> 'dev_master_data'
expect(MasterDataUtils.getMasterDataSchemaName()).toBe('dev_master_data');

// Line 74: 'master_data_uat' -> 'uat_master_data'
expect(MasterDataUtils.getMasterDataSchemaName()).toBe('uat_master_data');
```

**`getFullTableName` block (line 93) — was missing from original plan:**
```typescript
// '"master_data_dev"."md_vendors"' -> '"dev_master_data"."md_vendors"'
expect(MasterDataUtils.getFullTableName('md_vendors')).toBe(
  '"dev_master_data"."md_vendors"',
);
```

### 3. Update `onModuleInit()` in `master-data-schema.service.ts`

```typescript
async onModuleInit() {
  const schemaName = MasterDataUtils.getMasterDataSchemaName();
  this.logger.log(`Checking if ${schemaName} schema exists...`);

  // Check if schema was already created by admin to avoid permission errors
  const result = await this.prisma.$queryRawUnsafe<{ schema_name: string }[]>(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1;`,
    schemaName,
  );

  if (result.length > 0) {
    this.logger.log(`${schemaName} schema already exists, skipping creation.`);
    return;
  }

  this.logger.log(`Initializing ${schemaName} schema...`);
  await this.prisma.$executeRawUnsafe(
    `CREATE SCHEMA IF NOT EXISTS "${schemaName}";`,
  );
}
```

### 4. New migration script: `prisma/rename-master-data-schema.sql`

This script renames the existing old-format schema (e.g. `master_data_dev`) to the new format
(e.g. `dev_master_data`). It is idempotent: if the old schema does not exist it logs and skips;
if the new schema already exists it also skips.

```sql
-- Renames master_data schema from old format (master_data_<env>) to new format (<env>_master_data).
-- Reads custom.old_schema and custom.new_schema GUC variables.
-- Safe to re-run: skips if old schema is absent or new schema already exists.

DO $$
DECLARE
    v_old_schema text;
    v_new_schema text;
BEGIN
    BEGIN
        v_old_schema := current_setting('custom.old_schema');
        v_new_schema := current_setting('custom.new_schema');
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Schema rename variables not set, skipping rename.';
        RETURN;
    END;

    IF v_old_schema IS NULL OR v_old_schema = '' OR v_new_schema IS NULL OR v_new_schema = '' THEN
        RAISE NOTICE 'Schema rename variables are empty, skipping rename.';
        RETURN;
    END IF;

    -- Skip if old and new are the same (public / unset env case)
    IF v_old_schema = v_new_schema THEN
        RAISE NOTICE 'Old and new schema names are identical (%), nothing to rename.', v_old_schema;
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = v_old_schema) THEN
        RAISE NOTICE 'Schema % does not exist, skipping rename.', v_old_schema;
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = v_new_schema) THEN
        RAISE NOTICE 'Target schema % already exists, skipping rename.', v_new_schema;
        RETURN;
    END IF;

    RAISE NOTICE 'Renaming schema % to %', v_old_schema, v_new_schema;
    EXECUTE 'ALTER SCHEMA "' || v_old_schema || '" RENAME TO "' || v_new_schema || '";';
END $$;
```

### 5. Update `infrastructure/scripts/run-pre-migration.sh`

Two changes to the container override command:

**a. Compute both OLD and NEW schema names:**
```bash
# Old format: master_data_<env>  (what currently exists in remote envs)
export OLD_SCHEMA=\"master_data\${DB_SCHEMA:+_\$DB_SCHEMA}\";
# New format: <env>_master_data  (what the updated code expects)
export NEW_SCHEMA=\"\${DB_SCHEMA:+\${DB_SCHEMA}_}master_data\";
```

**b. Run the rename script first, then move-md-tables targeting the new schema name:**
```bash
# Step 1: rename existing schema to new format
(echo \"SET custom.old_schema='\$OLD_SCHEMA'; SET custom.new_schema='\$NEW_SCHEMA';\"; \
 cat prisma/rename-master-data-schema.sql) \
 | PGPASSWORD=\$DB_PASSWORD psql -h \$DB_ENDPOINT -p \${DB_PORT:-5432} -U \$DB_USERNAME -d \$DB_NAME \
 || echo 'Schema rename failed or already done, continuing...';

# Step 2: move any remaining md_* tables (still targeting new schema name)
(echo \"SET custom.source_schema='\${DB_SCHEMA:-public}'; SET custom.target_schema='\$NEW_SCHEMA';\"; \
 cat prisma/move-md-tables.sql) \
 | PGPASSWORD=\$DB_PASSWORD psql -h \$DB_ENDPOINT -p \${DB_PORT:-5432} -U \$DB_USERNAME -d \$DB_NAME \
 || echo 'Pre-migration fix failed or already run, continuing...'
```

**Why this order matters:** The rename must happen first so that `move-md-tables.sql` targets the
correctly-named schema and any remaining stray `md_*` tables in the source schema land in the
right place.

---

## Deployment Sequence

```
1. Run pre-migration  →  renames master_data_<env> to <env>_master_data
2. Run Prisma migration  →  standard schema migrations (unaffected)
3. Deploy new app image  →  onModuleInit detects <env>_master_data exists, skips CREATE SCHEMA
```

No manual steps required — `run-pre-migration.sh` handles it as part of the existing CI pipeline.

---

## Verification

- Run `make test` to confirm all `utils.spec.ts` assertions pass.
- Start locally (`make dev`) to confirm `master_data` auto-creation still works (no `DB_SCHEMA` set).
- For a remote env dry-run: execute the rename SQL manually against a dev DB snapshot and confirm
  the schema is renamed without data loss before merging.
