-- DropForeignKey
ALTER TABLE "form_instances" DROP CONSTRAINT "form_instances_workflow_instance_id_fkey";

-- DropForeignKey
ALTER TABLE "workflow_instances" DROP CONSTRAINT "workflow_instances_revision_id_fkey";

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_revision_id_fkey" FOREIGN KEY ("revision_id") REFERENCES "workflow_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
