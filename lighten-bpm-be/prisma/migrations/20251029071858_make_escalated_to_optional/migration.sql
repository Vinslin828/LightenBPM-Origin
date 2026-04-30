-- DropForeignKey
ALTER TABLE "approval_tasks" DROP CONSTRAINT "approval_tasks_escalated_to_fkey";

-- AlterTable
ALTER TABLE "approval_tasks" ALTER COLUMN "escalated_to" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_escalated_to_fkey" FOREIGN KEY ("escalated_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
