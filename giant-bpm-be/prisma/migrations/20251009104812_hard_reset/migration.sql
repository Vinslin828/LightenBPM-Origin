/*
  Warnings:

  - You are about to drop the column `form_version_id` on the `form_instances` table. All the data in the column will be lost.
  - You are about to drop the column `category_id` on the `forms` table. All the data in the column will be lost.
  - You are about to drop the column `actual_approvers` on the `workflow_instance_nodes` table. All the data in the column will be lost.
  - You are about to drop the column `workflow_id` on the `workflow_instances` table. All the data in the column will be lost.
  - You are about to drop the `category_display_order` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `form_categories` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `form_versions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `org_user_mappings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `workflow_history` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `workflow_versions` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[workflow_instance_id]` on the table `form_instances` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[revision_id]` on the table `form_instances` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `revision_id` to the `form_instances` table without a default value. This is not possible if the table is not empty.
  - Added the required column `revision_id` to the `workflow_instances` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RevisionState" AS ENUM ('DRAFT', 'ACTIVE', 'SCHEDULED', 'ARCHIVED', 'RETIRED');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "form_categories" DROP CONSTRAINT "form_categories_created_by_fkey";

-- DropForeignKey
ALTER TABLE "form_instances" DROP CONSTRAINT "form_instances_form_version_id_fkey";

-- DropForeignKey
ALTER TABLE "form_versions" DROP CONSTRAINT "form_versions_created_by_fkey";

-- DropForeignKey
ALTER TABLE "form_versions" DROP CONSTRAINT "form_versions_form_id_fkey";

-- DropForeignKey
ALTER TABLE "form_workflow_bindings" DROP CONSTRAINT "form_workflow_bindings_form_id_fkey";

-- DropForeignKey
ALTER TABLE "form_workflow_bindings" DROP CONSTRAINT "form_workflow_bindings_workflow_id_fkey";

-- DropForeignKey
ALTER TABLE "forms" DROP CONSTRAINT "forms_category_id_fkey";

-- DropForeignKey
ALTER TABLE "org_user_mappings" DROP CONSTRAINT "org_user_mappings_org_unit_id_fkey";

-- DropForeignKey
ALTER TABLE "org_user_mappings" DROP CONSTRAINT "org_user_mappings_user_id_fkey";

-- DropForeignKey
ALTER TABLE "workflow_history" DROP CONSTRAINT "workflow_history_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "workflow_history" DROP CONSTRAINT "workflow_history_instance_node_id_fkey";

-- DropForeignKey
ALTER TABLE "workflow_history" DROP CONSTRAINT "workflow_history_target_instance_node_id_fkey";

-- DropForeignKey
ALTER TABLE "workflow_history" DROP CONSTRAINT "workflow_history_target_user_id_fkey";

-- DropForeignKey
ALTER TABLE "workflow_history" DROP CONSTRAINT "workflow_history_workflow_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "workflow_instances" DROP CONSTRAINT "workflow_instances_workflow_id_fkey";

-- DropForeignKey
ALTER TABLE "workflow_versions" DROP CONSTRAINT "workflow_versions_created_by_fkey";

-- DropForeignKey
ALTER TABLE "workflow_versions" DROP CONSTRAINT "workflow_versions_workflow_id_fkey";

-- AlterTable
ALTER TABLE "form_instances" DROP COLUMN "form_version_id",
ADD COLUMN     "revision_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "forms" DROP COLUMN "category_id",
ADD COLUMN     "is_template" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "workflow_instance_nodes" DROP COLUMN "actual_approvers";

-- AlterTable
ALTER TABLE "workflow_instances" DROP COLUMN "workflow_id",
ADD COLUMN     "revision_id" INTEGER NOT NULL;

-- DropTable
DROP TABLE "category_display_order";

-- DropTable
DROP TABLE "form_categories";

-- DropTable
DROP TABLE "form_versions";

-- DropTable
DROP TABLE "org_user_mappings";

-- DropTable
DROP TABLE "workflow_history";

-- DropTable
DROP TABLE "workflow_versions";

-- DropEnum
DROP TYPE "FormStatus";

-- DropEnum
DROP TYPE "WorkflowStatus";

-- CreateTable
CREATE TABLE "tags" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_tags" (
    "form_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "form_tags_pkey" PRIMARY KEY ("form_id","tag_id")
);

-- CreateTable
CREATE TABLE "workflow_tags" (
    "workflow_id" INTEGER NOT NULL,
    "tag_id" INTEGER NOT NULL,

    CONSTRAINT "workflow_tags_pkey" PRIMARY KEY ("workflow_id","tag_id")
);

-- CreateTable
CREATE TABLE "form_revisions" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "form_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "form_schema" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "state" "RevisionState" NOT NULL DEFAULT 'DRAFT',
    "effective_date" TIMESTAMP(3),
    "retired_date" TIMESTAMP(3),
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_options" (
    "id" SERIAL NOT NULL,
    "form_revision_id" INTEGER NOT NULL,
    "can_withdraw" BOOLEAN NOT NULL DEFAULT true,
    "can_copy" BOOLEAN NOT NULL DEFAULT true,
    "can_draft" BOOLEAN NOT NULL DEFAULT true,
    "can_delegate" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "form_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_revisions" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "workflow_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "flow_definition" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "state" "RevisionState" NOT NULL DEFAULT 'DRAFT',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_tasks" (
    "id" SERIAL NOT NULL,
    "workflow_node_id" INTEGER NOT NULL,
    "assignee_id" INTEGER NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_memberships" (
    "id" SERIAL NOT NULL,
    "org_unit_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "assign_type" "AssignType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "form_revisions_public_id_key" ON "form_revisions"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_options_form_revision_id_key" ON "form_options"("form_revision_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_revisions_public_id_key" ON "workflow_revisions"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "approval_tasks_workflow_node_id_key" ON "approval_tasks"("workflow_node_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_instances_workflow_instance_id_key" ON "form_instances"("workflow_instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_instances_revision_id_key" ON "form_instances"("revision_id");

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_tags" ADD CONSTRAINT "form_tags_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_tags" ADD CONSTRAINT "form_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_tags" ADD CONSTRAINT "workflow_tags_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_tags" ADD CONSTRAINT "workflow_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_revisions" ADD CONSTRAINT "form_revisions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_revisions" ADD CONSTRAINT "form_revisions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_options" ADD CONSTRAINT "form_options_form_revision_id_fkey" FOREIGN KEY ("form_revision_id") REFERENCES "form_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_revisions" ADD CONSTRAINT "workflow_revisions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_revisions" ADD CONSTRAINT "workflow_revisions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_workflow_bindings" ADD CONSTRAINT "form_workflow_bindings_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_workflow_bindings" ADD CONSTRAINT "form_workflow_bindings_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "form_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "workflow_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_workflow_node_id_fkey" FOREIGN KEY ("workflow_node_id") REFERENCES "workflow_instance_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
