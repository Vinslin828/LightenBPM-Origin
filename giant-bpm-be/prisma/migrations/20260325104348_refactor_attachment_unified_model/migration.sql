-- CreateEnum
CREATE TYPE "AttachmentStatus" AS ENUM ('PENDING', 'UPLOADED');

-- CreateTable
CREATE TABLE "attachments" (
    "id" SERIAL NOT NULL,
    "s3_key" TEXT NOT NULL,
    "field_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "content_type" TEXT NOT NULL,
    "remark" TEXT,
    "uploaded_by" INTEGER NOT NULL,
    "status" "AttachmentStatus" NOT NULL DEFAULT 'PENDING',
    "serial_number" TEXT,
    "draft_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- Migrate data from instance_attachments to attachments
INSERT INTO "attachments" (
    "s3_key", "field_key", "file_name", "file_size", "content_type",
    "remark", "uploaded_by", "status", "serial_number", "created_at", "updated_at"
)
SELECT
    "s3_key", "field_key", "file_name", "file_size", "content_type",
    "remark", "uploaded_by", 'UPLOADED', "serial_number", "created_at", "updated_at"
FROM "instance_attachments";

-- Migrate data from pending_uploads to attachments
INSERT INTO "attachments" (
    "s3_key", "field_key", "file_name", "file_size", "content_type",
    "uploaded_by", "status", "serial_number", "created_at", "expires_at", "updated_at"
)
SELECT
    "s3_key", "field_key", "file_name", "file_size", "content_type",
    "requested_by", 'PENDING', "serial_number", "created_at", "expires_at", "created_at"
FROM "pending_uploads";

-- CreateIndex
CREATE UNIQUE INDEX "attachments_s3_key_key" ON "attachments"("s3_key");

-- CreateIndex
CREATE INDEX "attachments_serial_number_field_key_idx" ON "attachments"("serial_number", "field_key");

-- CreateIndex
CREATE INDEX "attachments_draft_id_idx" ON "attachments"("draft_id");

-- CreateIndex
CREATE INDEX "attachments_uploaded_by_idx" ON "attachments"("uploaded_by");

-- CreateIndex
CREATE INDEX "attachments_expires_at_idx" ON "attachments"("expires_at");

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_serial_number_fkey" FOREIGN KEY ("serial_number") REFERENCES "application_instances"("serial_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DropForeignKey
ALTER TABLE "instance_attachments" DROP CONSTRAINT "instance_attachments_serial_number_fkey";

-- DropForeignKey
ALTER TABLE "instance_attachments" DROP CONSTRAINT "instance_attachments_uploaded_by_fkey";

-- DropForeignKey
ALTER TABLE "pending_uploads" DROP CONSTRAINT "pending_uploads_requested_by_fkey";

-- DropForeignKey
ALTER TABLE "pending_uploads" DROP CONSTRAINT "pending_uploads_serial_number_fkey";

-- DropTable
DROP TABLE "instance_attachments";

-- DropTable
DROP TABLE "pending_uploads";
