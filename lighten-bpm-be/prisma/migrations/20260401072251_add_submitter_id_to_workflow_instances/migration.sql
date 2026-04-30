-- AlterTable: Add submitter_id column (nullable first for data migration)
ALTER TABLE "workflow_instances" ADD COLUMN "submitter_id" INTEGER;

-- Data Migration: Copy applicant_id to submitter_id for existing rows
UPDATE "workflow_instances" SET "submitter_id" = "applicant_id";

-- Make submitter_id NOT NULL after data migration
ALTER TABLE "workflow_instances" ALTER COLUMN "submitter_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
