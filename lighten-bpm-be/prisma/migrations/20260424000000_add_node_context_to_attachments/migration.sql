-- AlterTable: Add upload context columns (nullable: null = applicant upload at START)
ALTER TABLE "attachments" ADD COLUMN "workflow_node_id" INTEGER;
ALTER TABLE "attachments" ADD COLUMN "approver_group_index" INTEGER;

-- CreateIndex
CREATE INDEX "attachments_workflow_node_id_idx" ON "attachments"("workflow_node_id");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_workflow_node_id_fkey" FOREIGN KEY ("workflow_node_id") REFERENCES "workflow_instance_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
