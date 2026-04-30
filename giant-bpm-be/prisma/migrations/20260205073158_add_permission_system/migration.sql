-- CreateEnum
CREATE TYPE "GranteeType" AS ENUM ('USER', 'ORG_UNIT', 'JOB_GRADE', 'ROLE', 'EVERYONE');

-- CreateEnum
CREATE TYPE "PermissionAction" AS ENUM ('VIEW', 'USE', 'MANAGE');

-- CreateTable
CREATE TABLE "form_permissions" (
    "id" SERIAL NOT NULL,
    "form_id" INTEGER NOT NULL,
    "grantee_type" "GranteeType" NOT NULL,
    "grantee_value" TEXT NOT NULL,
    "action" "PermissionAction" NOT NULL,

    CONSTRAINT "form_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_permissions" (
    "id" SERIAL NOT NULL,
    "workflow_id" INTEGER NOT NULL,
    "grantee_type" "GranteeType" NOT NULL,
    "grantee_value" TEXT NOT NULL,
    "action" "PermissionAction" NOT NULL,

    CONSTRAINT "workflow_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instance_shares" (
    "id" SERIAL NOT NULL,
    "workflow_instance_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "permission" TEXT NOT NULL,
    "reason" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instance_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_permissions_form_id_idx" ON "form_permissions"("form_id");

-- CreateIndex
CREATE INDEX "form_permissions_grantee_type_grantee_value_idx" ON "form_permissions"("grantee_type", "grantee_value");

-- CreateIndex
CREATE INDEX "workflow_permissions_workflow_id_idx" ON "workflow_permissions"("workflow_id");

-- CreateIndex
CREATE INDEX "workflow_permissions_grantee_type_grantee_value_idx" ON "workflow_permissions"("grantee_type", "grantee_value");

-- AddForeignKey
ALTER TABLE "form_permissions" ADD CONSTRAINT "form_permissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_permissions" ADD CONSTRAINT "workflow_permissions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instance_shares" ADD CONSTRAINT "instance_shares_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instance_shares" ADD CONSTRAINT "instance_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instance_shares" ADD CONSTRAINT "instance_shares_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data Migration: Grant legacy data permissions to EVERYONE
INSERT INTO "form_permissions" ("form_id", "grantee_type", "grantee_value", "action")
SELECT "id", 'EVERYONE'::"GranteeType", '', 'VIEW'::"PermissionAction"
FROM "forms" f
WHERE NOT EXISTS (
    SELECT 1 FROM "form_permissions" fp
    WHERE fp.form_id = f.id
    AND fp.grantee_type = 'EVERYONE'
    AND fp.action = 'VIEW'
);

INSERT INTO "workflow_permissions" ("workflow_id", "grantee_type", "grantee_value", "action")
SELECT "id", 'EVERYONE'::"GranteeType", '', 'VIEW'::"PermissionAction"
FROM "workflows" w
WHERE NOT EXISTS (
    SELECT 1 FROM "workflow_permissions" wp
    WHERE wp.workflow_id = w.id
    AND wp.grantee_type = 'EVERYONE'
    AND wp.action = 'VIEW'
);

INSERT INTO "workflow_permissions" ("workflow_id", "grantee_type", "grantee_value", "action")
SELECT "id", 'EVERYONE'::"GranteeType", '', 'USE'::"PermissionAction"
FROM "workflows" w
WHERE NOT EXISTS (
    SELECT 1 FROM "workflow_permissions" wp
    WHERE wp.workflow_id = w.id
    AND wp.grantee_type = 'EVERYONE'
    AND wp.action = 'USE'
);
