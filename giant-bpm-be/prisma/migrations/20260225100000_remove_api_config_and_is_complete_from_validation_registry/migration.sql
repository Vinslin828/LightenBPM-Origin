-- DropIndex
DROP INDEX IF EXISTS "validation_registry_is_complete_idx";

-- AlterTable
ALTER TABLE "validation_registry" DROP COLUMN IF EXISTS "api_config",
DROP COLUMN IF EXISTS "is_complete";
