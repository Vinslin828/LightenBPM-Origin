-- CreateTable
CREATE TABLE "workflow_options" (
    "id" SERIAL NOT NULL,
    "workflow_revision_id" INTEGER NOT NULL,
    "reuse_prior_approvals" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "workflow_options_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "workflow_options_workflow_revision_id_key" ON "workflow_options"("workflow_revision_id");

-- AddForeignKey
ALTER TABLE "workflow_options" ADD CONSTRAINT "workflow_options_workflow_revision_id_fkey" FOREIGN KEY ("workflow_revision_id") REFERENCES "workflow_revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
