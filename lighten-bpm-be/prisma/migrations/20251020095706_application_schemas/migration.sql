/*
  Warnings:

  - You are about to drop the column `comment` on the `approval_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `comment` on the `workflow_instance_nodes` table. All the data in the column will be lost.
  - You are about to drop the column `escalated_to` on the `workflow_instance_nodes` table. All the data in the column will be lost.
  - You are about to drop the column `current_nodes` on the `workflow_instances` table. All the data in the column will be lost.
  - Added the required column `escalated_to` to the `approval_tasks` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "workflow_instance_nodes" DROP CONSTRAINT "workflow_instance_nodes_escalated_to_fkey";

-- AlterTable
ALTER TABLE "approval_tasks" DROP COLUMN "comment",
ADD COLUMN     "escalated_to" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "workflow_instance_nodes" DROP COLUMN "comment",
DROP COLUMN "escalated_to";

-- AlterTable
ALTER TABLE "workflow_instances" DROP COLUMN "current_nodes",
ALTER COLUMN "applied_at" DROP NOT NULL,
ALTER COLUMN "applied_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "workflow_comments" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "workflow_node_id" INTEGER NOT NULL,
    "create_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "update_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_history" (
    "id" SERIAL NOT NULL,
    "workflow_instance_id" INTEGER NOT NULL,
    "instance_node_id" INTEGER NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_history_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "workflow_comments" ADD CONSTRAINT "workflow_comments_workflow_node_id_fkey" FOREIGN KEY ("workflow_node_id") REFERENCES "workflow_instance_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_tasks" ADD CONSTRAINT "approval_tasks_escalated_to_fkey" FOREIGN KEY ("escalated_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_instance_node_id_fkey" FOREIGN KEY ("instance_node_id") REFERENCES "workflow_instance_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
