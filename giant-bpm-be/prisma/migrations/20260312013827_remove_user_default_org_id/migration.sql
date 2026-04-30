/*
  Warnings:

  - You are about to drop the column `default_org_id` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_default_org_id_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "default_org_id";

-- CreateTable
CREATE TABLE "user_default_orgs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "org_unit_id" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_default_orgs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_default_orgs_user_id_key" ON "user_default_orgs"("user_id");

-- AddForeignKey
ALTER TABLE "user_default_orgs" ADD CONSTRAINT "user_default_orgs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_default_orgs" ADD CONSTRAINT "user_default_orgs_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
