-- CreateEnum
CREATE TYPE "ValidationType" AS ENUM ('CODE', 'API');

-- CreateTable
CREATE TABLE "validation_registry" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "validation_type" "ValidationType",
    "validation_code" TEXT,
    "api_config" JSONB,
    "error_message" VARCHAR(500),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER NOT NULL,
    "updated_by" INTEGER NOT NULL,

    CONSTRAINT "validation_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "validation_component_mapping" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "validation_id" INTEGER NOT NULL,
    "component_type" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "validation_component_mapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "validation_registry_public_id_key" ON "validation_registry"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "validation_registry_name_key" ON "validation_registry"("name");

-- CreateIndex
CREATE INDEX "validation_registry_name_idx" ON "validation_registry"("name");

-- CreateIndex
CREATE INDEX "validation_registry_validation_type_idx" ON "validation_registry"("validation_type");

-- CreateIndex
CREATE INDEX "validation_registry_is_active_idx" ON "validation_registry"("is_active");

-- CreateIndex
CREATE INDEX "validation_registry_is_complete_idx" ON "validation_registry"("is_complete");

-- CreateIndex
CREATE INDEX "validation_registry_created_at_idx" ON "validation_registry"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "validation_component_mapping_public_id_key" ON "validation_component_mapping"("public_id");

-- CreateIndex
CREATE INDEX "validation_component_mapping_validation_id_idx" ON "validation_component_mapping"("validation_id");

-- CreateIndex
CREATE INDEX "validation_component_mapping_component_type_idx" ON "validation_component_mapping"("component_type");

-- CreateIndex
CREATE UNIQUE INDEX "validation_component_mapping_validation_id_component_type_key" ON "validation_component_mapping"("validation_id", "component_type");

-- AddForeignKey
ALTER TABLE "validation_registry" ADD CONSTRAINT "validation_registry_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_registry" ADD CONSTRAINT "validation_registry_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_component_mapping" ADD CONSTRAINT "validation_component_mapping_validation_id_fkey" FOREIGN KEY ("validation_id") REFERENCES "validation_registry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "validation_component_mapping" ADD CONSTRAINT "validation_component_mapping_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
