/*
  Warnings:

  - You are about to drop the column `next_node_key` on the `workflow_instance_nodes` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "workflow_instance_nodes" DROP COLUMN "next_node_key",
ALTER COLUMN "result" DROP NOT NULL;

-- CreateTable
CREATE TABLE "favorite_workflow" (
    "id" SERIAL NOT NULL,
    "workflow_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "favorite_workflow_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "favorite_workflow" ADD CONSTRAINT "favorite_workflow_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_workflow" ADD CONSTRAINT "favorite_workflow_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
