/*
  Warnings:

  - You are about to drop the `workflow_history` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "workflow_history" DROP CONSTRAINT "workflow_history_actor_id_fkey";

-- DropForeignKey
ALTER TABLE "workflow_history" DROP CONSTRAINT "workflow_history_instance_node_id_fkey";

-- DropForeignKey
ALTER TABLE "workflow_history" DROP CONSTRAINT "workflow_history_serial_number_fkey";

-- DropTable
DROP TABLE "workflow_history";

-- CreateTable
CREATE TABLE "form_instance_data" (
    "id" SERIAL NOT NULL,
    "form_instance_id" INTEGER NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" INTEGER NOT NULL,

    CONSTRAINT "form_instance_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" SERIAL NOT NULL,
    "workflow_instance_id" INTEGER NOT NULL,
    "event_type" "WorkflowAction" NOT NULL,
    "status_before" "InstanceStatus",
    "status_after" "InstanceStatus" NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" JSONB,

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "form_instance_data" ADD CONSTRAINT "form_instance_data_form_instance_id_fkey" FOREIGN KEY ("form_instance_id") REFERENCES "form_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instance_data" ADD CONSTRAINT "form_instance_data_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data Migration: Form snapshots
INSERT INTO "form_instance_data" ("form_instance_id", "data", "created_by", "created_at")
SELECT "id", "form_data", "updated_by", COALESCE("updated_at", NOW())
FROM "form_instances";

-- Data Migration: Draft Event
INSERT INTO "workflow_events" ("workflow_instance_id", "event_type", "status_after", "actor_id", "created_at")
SELECT "id", 'UPDATE', 'DRAFT', "applicant_id", "created_at"
FROM "workflow_instances";

-- Data Migration: Submit Event
INSERT INTO "workflow_events" ("workflow_instance_id", "event_type", "status_after", "status_before", "actor_id", "created_at")
SELECT "id", 'SUBMIT', 'RUNNING', 'DRAFT', "submitter_id", "applied_at"
FROM "workflow_instances"
WHERE "applied_at" IS NOT NULL;

-- Data Migration: Withdraw Event
INSERT INTO "workflow_events" ("workflow_instance_id", "event_type", "status_after", "status_before", "actor_id", "created_at")
SELECT "id", 'WITHDRAW', 'CANCELLED', 'RUNNING', "withdraw_by", "withdraw_at"
FROM "workflow_instances"
WHERE "withdraw_at" IS NOT NULL;

-- Data Migration: Complete Event
INSERT INTO "workflow_events" ("workflow_instance_id", "event_type", "status_after", "status_before", "actor_id", "created_at")
SELECT "id", 'APPROVE', 'COMPLETED', 'RUNNING', "applicant_id", "completed_at"
FROM "workflow_instances"
WHERE "completed_at" IS NOT NULL AND "status" = 'COMPLETED';

-- Data Migration: Rejected Event
INSERT INTO "workflow_events" ("workflow_instance_id", "event_type", "status_after", "status_before", "actor_id", "created_at")
SELECT "id", 'REJECT', 'REJECTED', 'RUNNING', "applicant_id", "updated_at"
FROM "workflow_instances"
WHERE "status" = 'REJECTED';
