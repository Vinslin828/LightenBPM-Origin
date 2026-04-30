-- CreateTable
CREATE TABLE "instance_attachments" (
    "id" SERIAL NOT NULL,
    "serial_number" TEXT NOT NULL,
    "field_key" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "content_type" TEXT NOT NULL,
    "remark" TEXT,
    "uploaded_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instance_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "instance_attachments_serial_number_field_key_idx" ON "instance_attachments"("serial_number", "field_key");

-- AddForeignKey
ALTER TABLE "instance_attachments" ADD CONSTRAINT "instance_attachments_serial_number_fkey" FOREIGN KEY ("serial_number") REFERENCES "application_instances"("serial_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instance_attachments" ADD CONSTRAINT "instance_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
