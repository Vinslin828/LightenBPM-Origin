-- Script to move existing md_ tables to the master_data schema
-- This prevents Prisma Migrate from detecting them as schema drift in the public schema.

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

    EXECUTE 'CREATE SCHEMA IF NOT EXISTS "' || v_target || '";';

    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = v_source AND tablename LIKE 'md_%')
    LOOP
        RAISE NOTICE 'Moving table %.% to %.%', v_source, r.tablename, v_target, r.tablename;
        EXECUTE 'ALTER TABLE "' || v_source || '"."' || r.tablename || '" SET SCHEMA "' || v_target || '";';
    END LOOP;
END $$;
