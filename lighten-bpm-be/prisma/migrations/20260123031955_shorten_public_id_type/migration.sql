/*
  Warnings:

  - Made the column `code` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "approval_tasks" ALTER COLUMN "public_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "form_instances" ALTER COLUMN "public_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "form_revisions" ALTER COLUMN "public_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "forms" ALTER COLUMN "public_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "code" SET NOT NULL;

-- AlterTable
ALTER TABLE "validation_component_mapping" ALTER COLUMN "public_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "validation_registry" ALTER COLUMN "public_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "workflow_instance_nodes" ALTER COLUMN "public_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "workflow_instances" ALTER COLUMN "public_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "workflow_revisions" ALTER COLUMN "public_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "workflows" ALTER COLUMN "public_id" SET DATA TYPE TEXT;
