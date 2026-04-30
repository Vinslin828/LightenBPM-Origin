/*
  Warnings:

  - Added the required column `updated_by` to the `form_revisions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `form_revisions` table without a default value. This is not possible if the table is not empty.
  - Made the column `updated_at` on table `form_workflow_bindings` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `org_memberships` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `org_units` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updated_by` to the `workflow_comments` table without a default value. This is not possible if the table is not empty.
  - Made the column `updated_at` on table `workflow_instance_nodes` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `workflow_instances` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updated_at` to the `workflow_revisions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_by` to the `workflow_revisions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `created_by` to the `forms` table without a default value.
  - Added the required column `updated_by` to the `forms` table without a default value.
  - Added the required column `updated_at` to the `forms` table without a default value.
  - Added the required column `created_by` to the `workflows` table without a default value.
  - Added the required column `updated_by` to the `workflows` table without a default value.
  - Added the required column `updated_at` to the `workflows` table without a default value.
  - Added the required column `created_by` to the `form_workflow_bindings` table without a default value.
  - Added the required column `updated_by` to the `form_workflow_bindings` table without a default value.
  - Added the required column `updated_at` to the `application_instances` table without a default value.
  - Added the required column `created_by` to the `org_memberships` table without a default value.
  - Added the required column `updated_by` to the `org_memberships` table without a default value.
  - Added the required column `updated_by` to the `tags` table without a default value.
  - Added the required column `updated_at` to the `tags` table without a default value.

*/

-- AlterTable form_revisions
ALTER TABLE "form_revisions" ADD COLUMN "updated_by" INTEGER,
ADD COLUMN "updated_at" TIMESTAMP(3);

UPDATE "form_revisions" SET "updated_by" = "created_by", "updated_at" = "created_at";

ALTER TABLE "form_revisions" ALTER COLUMN "updated_by" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable form_workflow_bindings
ALTER TABLE "form_workflow_bindings" ADD COLUMN "created_by" INTEGER,
ADD COLUMN "updated_by" INTEGER;

UPDATE "form_workflow_bindings" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
UPDATE "form_workflow_bindings" SET "created_by" = 1, "updated_by" = 1;

ALTER TABLE "form_workflow_bindings" ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "created_by" SET NOT NULL,
ALTER COLUMN "updated_by" SET NOT NULL;

-- AlterTable org_memberships
ALTER TABLE "org_memberships" ADD COLUMN "created_by" INTEGER,
ADD COLUMN "updated_by" INTEGER;

UPDATE "org_memberships" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
UPDATE "org_memberships" SET "created_by" = 1, "updated_by" = 1;

ALTER TABLE "org_memberships" ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "created_by" SET NOT NULL,
ALTER COLUMN "updated_by" SET NOT NULL;

-- AlterTable org_units
ALTER TABLE "org_units" ADD COLUMN "created_by" INTEGER,
ADD COLUMN "updated_by" INTEGER;

UPDATE "org_units" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;

ALTER TABLE "org_units" ALTER COLUMN "updated_at" SET NOT NULL;
-- NOTE: created_by and updated_by are left NULLABLE in OrgUnit to support bootstrap

-- AlterTable users
UPDATE "users" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
ALTER TABLE "users" ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable workflow_comments
ALTER TABLE "workflow_comments" RENAME COLUMN "create_at" TO "created_at";
ALTER TABLE "workflow_comments" RENAME COLUMN "update_at" TO "updated_at";

ALTER TABLE "workflow_comments" ADD COLUMN "updated_by" INTEGER;

UPDATE "workflow_comments" SET "updated_by" = "author_id";

ALTER TABLE "workflow_comments" ALTER COLUMN "updated_by" SET NOT NULL;

-- AlterTable workflow_instance_nodes
UPDATE "workflow_instance_nodes" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
ALTER TABLE "workflow_instance_nodes" ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable workflow_instances
ALTER TABLE "workflow_instances" ADD COLUMN "updated_by" INTEGER;

UPDATE "workflow_instances" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;
ALTER TABLE "workflow_instances" ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable workflow_revisions
ALTER TABLE "workflow_revisions" ADD COLUMN "updated_at" TIMESTAMP(3),
ADD COLUMN "updated_by" INTEGER;

UPDATE "workflow_revisions" SET "updated_at" = "created_at", "updated_by" = "created_by";

ALTER TABLE "workflow_revisions" ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_by" SET NOT NULL;

-- AlterTable forms
ALTER TABLE "forms" ADD COLUMN "created_by" INTEGER,
ADD COLUMN "updated_by" INTEGER,
ADD COLUMN "updated_at" TIMESTAMP(3);

UPDATE "forms" SET "created_by" = 1, "updated_by" = 1, "updated_at" = "created_at";

ALTER TABLE "forms" ALTER COLUMN "created_by" SET NOT NULL,
ALTER COLUMN "updated_by" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable workflows
ALTER TABLE "workflows" ADD COLUMN "created_by" INTEGER,
ADD COLUMN "updated_by" INTEGER,
ADD COLUMN "updated_at" TIMESTAMP(3);

UPDATE "workflows" SET "created_by" = 1, "updated_by" = 1, "updated_at" = "created_at";

ALTER TABLE "workflows" ALTER COLUMN "created_by" SET NOT NULL,
ALTER COLUMN "updated_by" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable application_instances
ALTER TABLE "application_instances" ADD COLUMN "updated_at" TIMESTAMP(3);

UPDATE "application_instances" SET "updated_at" = "created_at";

ALTER TABLE "application_instances" ALTER COLUMN "updated_at" SET NOT NULL;

-- AlterTable approval_tasks
ALTER TABLE "approval_tasks" ADD COLUMN "updated_by" INTEGER;

-- AlterTable tags
ALTER TABLE "tags" ADD COLUMN "updated_by" INTEGER,
ADD COLUMN "updated_at" TIMESTAMP(3);

UPDATE "tags" SET "updated_by" = "created_by", "updated_at" = "created_at";

ALTER TABLE "tags" ALTER COLUMN "updated_by" SET NOT NULL,
ALTER COLUMN "updated_at" SET NOT NULL;


-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_revisions" ADD CONSTRAINT "form_revisions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_revisions" ADD CONSTRAINT "workflow_revisions_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_workflow_bindings" ADD CONSTRAINT "form_workflow_bindings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_workflow_bindings" ADD CONSTRAINT "form_workflow_bindings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_comments" ADD CONSTRAINT "workflow_comments_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_units" ADD CONSTRAINT "org_units_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;