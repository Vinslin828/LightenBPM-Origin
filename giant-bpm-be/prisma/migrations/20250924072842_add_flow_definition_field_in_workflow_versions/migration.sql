/*
  Warnings:

  - Added the required column `flow_definition` to the `workflow_versions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "workflow_versions" ADD COLUMN     "flow_definition" JSONB NOT NULL;
