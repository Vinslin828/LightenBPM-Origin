-- CreateTable
CREATE TABLE "pending_uploads" (
    "id" SERIAL NOT NULL,
    "serial_number" TEXT NOT NULL,
    "field_key" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "content_type" TEXT NOT NULL,
    "requested_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pending_uploads_s3_key_key" ON "pending_uploads"("s3_key");

-- CreateIndex
CREATE INDEX "pending_uploads_serial_number_idx" ON "pending_uploads"("serial_number");

-- CreateIndex
CREATE INDEX "pending_uploads_expires_at_idx" ON "pending_uploads"("expires_at");

-- AddForeignKey
ALTER TABLE "pending_uploads" ADD CONSTRAINT "pending_uploads_serial_number_fkey" FOREIGN KEY ("serial_number") REFERENCES "application_instances"("serial_number") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pending_uploads" ADD CONSTRAINT "pending_uploads_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
