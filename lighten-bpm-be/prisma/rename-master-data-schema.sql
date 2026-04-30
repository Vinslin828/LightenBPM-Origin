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
