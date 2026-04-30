/*
  Warnings:

  - Made the column `workflow_instance_id` on table `form_instances` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "form_instances" DROP CONSTRAINT "form_instances_workflow_instance_id_fkey";

-- AlterTable
ALTER TABLE "form_instances" ALTER COLUMN "workflow_instance_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
