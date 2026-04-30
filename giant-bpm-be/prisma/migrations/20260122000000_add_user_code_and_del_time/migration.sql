-- AlterTable
ALTER TABLE "users" ADD COLUMN     "code" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- Backfill: Duplicate sub as code for existing users
UPDATE "users" SET "code" = "sub" WHERE "code" IS NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_code_key" ON "users"("code");