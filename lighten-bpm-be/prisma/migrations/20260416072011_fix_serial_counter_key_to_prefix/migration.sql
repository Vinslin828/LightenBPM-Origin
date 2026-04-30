-- CreateTable
CREATE TABLE "serial_counters" (
    "serial_prefix" VARCHAR(3) NOT NULL,
    "date" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "serial_counters_pkey" PRIMARY KEY ("serial_prefix","date")
);

-- Migrate data: take MAX counter per (prefix, date) to avoid collisions
INSERT INTO "serial_counters" ("serial_prefix", "date", "counter")
SELECT w."serial_prefix", wsc."date", MAX(wsc."counter")
FROM "workflow_serial_counters" wsc
JOIN "workflows" w ON w."id" = wsc."workflow_id"
GROUP BY w."serial_prefix", wsc."date";

-- DropForeignKey
ALTER TABLE "workflow_serial_counters" DROP CONSTRAINT "workflow_serial_counters_workflow_id_fkey";

-- DropTable
DROP TABLE "workflow_serial_counters";
