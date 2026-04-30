-- AlterTable
ALTER TABLE "dataset_definitions" ADD COLUMN "source_type" TEXT NOT NULL DEFAULT 'DATABASE';
ALTER TABLE "dataset_definitions" ADD COLUMN "api_config" JSONB;
ALTER TABLE "dataset_definitions" ADD COLUMN "field_mappings" JSONB;
