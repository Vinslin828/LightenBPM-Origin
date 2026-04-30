/*
  Warnings:

  - Changed the type of `action` on the `workflow_history` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "WorkflowAction" AS ENUM ('SUBMIT', 'UPDATE', 'APPROVE', 'REJECT', 'WITHDRAW', 'DELEGATE', 'ESCALATE', 'COMMENT');

-- AlterTable
ALTER TABLE "workflow_history" ADD COLUMN     "remarks" TEXT,
DROP COLUMN "action",
ADD COLUMN     "action" "WorkflowAction" NOT NULL;
