/*
  Warnings:

  - You are about to drop the column `workflow_node_id` on the `workflow_comments` table. All the data in the column will be lost.
  - Added the required column `approval_task_id` to the `workflow_comments` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "workflow_comments" DROP CONSTRAINT "workflow_comments_workflow_node_id_fkey";

-- AlterTable
ALTER TABLE "workflow_comments" DROP COLUMN "workflow_node_id",
ADD COLUMN     "approval_task_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "workflow_comments" ADD CONSTRAINT "workflow_comments_approval_task_id_fkey" FOREIGN KEY ("approval_task_id") REFERENCES "approval_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
