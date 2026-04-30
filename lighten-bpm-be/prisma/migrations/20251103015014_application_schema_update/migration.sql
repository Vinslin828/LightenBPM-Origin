/*
  Warnings:

  - You are about to drop the column `workflow_instance_id` on the `workflow_history` table. All the data in the column will be lost.
  - Added the required column `serial_number` to the `form_instances` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serial_number` to the `workflow_comments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serial_number` to the `workflow_history` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "InstanceStatus" ADD VALUE 'REPLACED';

-- DropForeignKey
ALTER TABLE "workflow_history" DROP CONSTRAINT "workflow_history_workflow_instance_id_fkey";

-- DropIndex
DROP INDEX "workflow_instances_serial_number_key";

-- AlterTable
ALTER TABLE "form_instances" ADD COLUMN     "serial_number" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "workflow_comments" ADD COLUMN     "serial_number" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "workflow_history" DROP COLUMN "workflow_instance_id",
ADD COLUMN     "serial_number" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "application_instances" (
    "id" SERIAL NOT NULL,
    "serial_number" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_instances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_instances_serial_number_key" ON "application_instances"("serial_number");

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_serial_number_fkey" FOREIGN KEY ("serial_number") REFERENCES "application_instances"("serial_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_serial_number_fkey" FOREIGN KEY ("serial_number") REFERENCES "application_instances"("serial_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_comments" ADD CONSTRAINT "workflow_comments_serial_number_fkey" FOREIGN KEY ("serial_number") REFERENCES "application_instances"("serial_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_serial_number_fkey" FOREIGN KEY ("serial_number") REFERENCES "application_instances"("serial_number") ON DELETE CASCADE ON UPDATE CASCADE;
