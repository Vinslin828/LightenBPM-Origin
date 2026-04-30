/*
  Warnings:

  - You are about to drop the column `form_data` on the `form_instances` table. All the data in the column will be lost.
  - You are about to drop the column `applied_at` on the `workflow_instances` table. All the data in the column will be lost.
  - You are about to drop the column `completed_at` on the `workflow_instances` table. All the data in the column will be lost.
  - You are about to drop the column `submitter_id` on the `workflow_instances` table. All the data in the column will be lost.
  - You are about to drop the column `withdraw_at` on the `workflow_instances` table. All the data in the column will be lost.
  - You are about to drop the column `withdraw_by` on the `workflow_instances` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "workflow_instances" DROP CONSTRAINT "workflow_instances_submitter_id_fkey";

-- DropForeignKey
ALTER TABLE "workflow_instances" DROP CONSTRAINT "workflow_instances_withdraw_by_fkey";

-- AlterTable
ALTER TABLE "form_instances" DROP COLUMN "form_data";

-- AlterTable
ALTER TABLE "workflow_instances" DROP COLUMN "applied_at",
DROP COLUMN "completed_at",
DROP COLUMN "submitter_id",
DROP COLUMN "withdraw_at",
DROP COLUMN "withdraw_by";
