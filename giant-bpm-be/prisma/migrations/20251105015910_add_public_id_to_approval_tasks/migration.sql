/*
  Warnings:

  - A unique constraint covering the columns `[public_id]` on the table `approval_tasks` will be added. If there are existing duplicate values, this will fail.
  - The required column `public_id` was added to the `approval_tasks` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "approval_tasks" ADD COLUMN     "public_id" UUID NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "approval_tasks_public_id_key" ON "approval_tasks"("public_id");
