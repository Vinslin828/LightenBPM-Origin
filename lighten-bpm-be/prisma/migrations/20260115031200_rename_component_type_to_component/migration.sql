-- DropIndex
DROP INDEX "validation_component_mapping_component_type_idx";

-- DropIndex
DROP INDEX "validation_component_mapping_validation_id_component_type_key";

-- AlterTable
ALTER TABLE "validation_component_mapping" RENAME COLUMN "component_type" TO "component";

-- CreateIndex
CREATE INDEX "validation_component_mapping_component_idx" ON "validation_component_mapping"("component");

-- CreateIndex
CREATE UNIQUE INDEX "validation_component_mapping_validation_id_component_key" ON "validation_component_mapping"("validation_id", "component");
