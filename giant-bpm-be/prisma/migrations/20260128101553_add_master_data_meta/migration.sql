-- CreateTable
CREATE TABLE "dataset_definitions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fields" JSONB NOT NULL,
    "created_by" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dataset_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dataset_definitions_code_key" ON "dataset_definitions"("code");

-- CreateIndex
CREATE UNIQUE INDEX "dataset_definitions_table_name_key" ON "dataset_definitions"("table_name");
