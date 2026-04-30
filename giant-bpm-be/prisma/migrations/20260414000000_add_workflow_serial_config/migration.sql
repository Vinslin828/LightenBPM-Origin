-- Add serial_prefix column to workflows (default APP, max 3 chars)
ALTER TABLE "workflows" ADD COLUMN "serial_prefix" VARCHAR(3) NOT NULL DEFAULT 'APP';

-- Create counter table for atomic daily serial number generation
CREATE TABLE "workflow_serial_counters" (
  "workflow_id"  INTEGER NOT NULL,
  "date"         TEXT    NOT NULL,
  "counter"      INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "workflow_serial_counters_pkey" PRIMARY KEY ("workflow_id", "date")
);

ALTER TABLE "workflow_serial_counters"
  ADD CONSTRAINT "workflow_serial_counters_workflow_id_fkey"
  FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;
