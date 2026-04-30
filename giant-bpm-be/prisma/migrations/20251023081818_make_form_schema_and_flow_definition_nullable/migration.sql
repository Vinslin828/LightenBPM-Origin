-- AlterTable
ALTER TABLE "form_revisions" ALTER COLUMN "form_schema" DROP NOT NULL;

-- AlterTable
ALTER TABLE "workflow_revisions" ALTER COLUMN "flow_definition" DROP NOT NULL;
