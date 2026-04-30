/*
  Warnings:

  - A unique constraint covering the columns `[instance_id,node_key,iteration]` on the table `workflow_instance_nodes` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "approval_tasks" ADD COLUMN     "iteration" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "workflow_instance_nodes" ADD COLUMN     "iteration" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "workflow_instances" ADD COLUMN     "current_iteration" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE UNIQUE INDEX "workflow_instance_nodes_instance_id_node_key_iteration_key" ON "workflow_instance_nodes"("instance_id", "node_key", "iteration");
