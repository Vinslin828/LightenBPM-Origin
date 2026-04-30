-- Drop old node-based context columns and replace with a direct approval_task FK.
-- approval_task is the precise upload context (one row per approver + group + iteration);
-- workflow_node_id and approver_group_index are derivable via JOIN when needed.

-- Drop FK + index + columns
ALTER TABLE "attachments" DROP CONSTRAINT IF EXISTS "attachments_workflow_node_id_fkey";
DROP INDEX IF EXISTS "attachments_workflow_node_id_idx";
ALTER TABLE "attachments" DROP COLUMN IF EXISTS "workflow_node_id";
ALTER TABLE "attachments" DROP COLUMN IF EXISTS "approver_group_index";

-- Add approval_task_id (nullable: applicant uploads at start have no task)
ALTER TABLE "attachments" ADD COLUMN "approval_task_id" INTEGER;

-- CreateIndex
CREATE INDEX "attachments_approval_task_id_idx" ON "attachments"("approval_task_id");

-- AddForeignKey: SET NULL on delete to keep historical attachment records intact
-- if an approval_task is somehow removed (cleanup, rare).
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_approval_task_id_fkey" FOREIGN KEY ("approval_task_id") REFERENCES "approval_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
