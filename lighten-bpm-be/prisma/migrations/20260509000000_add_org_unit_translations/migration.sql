-- CreateTable
CREATE TABLE "org_unit_translations" (
    "id" SERIAL NOT NULL,
    "org_unit_id" INTEGER NOT NULL,
    "lang" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_unit_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_unit_translations_org_unit_id_lang_key" ON "org_unit_translations"("org_unit_id", "lang");

-- AddForeignKey
ALTER TABLE "org_unit_translations" ADD CONSTRAINT "org_unit_translations_org_unit_id_fkey" FOREIGN KEY ("org_unit_id") REFERENCES "org_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
