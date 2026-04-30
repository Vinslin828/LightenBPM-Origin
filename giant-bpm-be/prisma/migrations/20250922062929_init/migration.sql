-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SCHEDULED', 'RETIRED');

-- CreateEnum
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SCHEDULED', 'RETIRED');

-- CreateEnum
CREATE TYPE "InstanceStatus" AS ENUM ('DRAFT', 'RUNNING', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PriorityLevel" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('START', 'APPROVAL', 'CONDITION', 'JOIN', 'SUBFLOW', 'EDIT', 'END');

-- CreateEnum
CREATE TYPE "NodeStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "NodeResult" AS ENUM ('APPROVED', 'REJECTED', 'DELEGATED', 'TIMEOUT');

-- CreateTable
CREATE TABLE "forms" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "category_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_versions" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "form_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "form_schema" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
    "effective_date" TIMESTAMP(3),
    "retired_date" TIMESTAMP(3),
    "can_withdraw" BOOLEAN NOT NULL DEFAULT true,
    "can_copy" BOOLEAN NOT NULL DEFAULT true,
    "can_draft" BOOLEAN NOT NULL DEFAULT true,
    "can_delegate" BOOLEAN NOT NULL DEFAULT false,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_categories" (
    "id" SERIAL NOT NULL,
    "public_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflows" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_versions" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "workflow_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_workflow_bindings" (
    "id" SERIAL NOT NULL,
    "form_id" INTEGER NOT NULL,
    "workflow_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "form_workflow_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_instances" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "workflow_instance_id" INTEGER,
    "form_version_id" INTEGER NOT NULL,
    "form_data" JSONB NOT NULL,
    "updated_by" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "form_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instances" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "workflow_id" INTEGER NOT NULL,
    "applicant_id" INTEGER NOT NULL,
    "submitter_id" INTEGER NOT NULL,
    "current_nodes" JSONB NOT NULL,
    "status" "InstanceStatus" NOT NULL DEFAULT 'DRAFT',
    "serial_number" TEXT NOT NULL,
    "priority" "PriorityLevel" NOT NULL DEFAULT 'NORMAL',
    "withdraw_at" TIMESTAMP(3),
    "withdraw_by" INTEGER,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "workflow_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_instance_nodes" (
    "id" SERIAL NOT NULL,
    "public_id" UUID NOT NULL,
    "instance_id" INTEGER NOT NULL,
    "node_key" TEXT NOT NULL,
    "node_type" "NodeType" NOT NULL DEFAULT 'START',
    "status" "NodeStatus" NOT NULL DEFAULT 'PENDING',
    "next_node_key" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "result" "NodeResult" NOT NULL,
    "comment" TEXT,
    "due_date" TIMESTAMP(3),
    "actual_approvers" JSONB,
    "escalated_to" INTEGER,
    "subflow_instance_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "workflow_instance_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_history" (
    "id" SERIAL NOT NULL,
    "workflow_instance_id" INTEGER NOT NULL,
    "instance_node_id" INTEGER NOT NULL,
    "node_key" TEXT NOT NULL,
    "actor_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "comment" TEXT,
    "target_instance_node_id" INTEGER,
    "target_user_id" INTEGER,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_display_order" (
    "id" SERIAL NOT NULL,
    "form_ids" INTEGER[],
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "form_display_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_display_order" (
    "id" SERIAL NOT NULL,
    "category_ids" INTEGER[],
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "category_display_order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "forms_public_id_key" ON "forms"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_versions_public_id_key" ON "form_versions"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_categories_public_id_key" ON "form_categories"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_categories_name_key" ON "form_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "workflows_public_id_key" ON "workflows"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_versions_public_id_key" ON "workflow_versions"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "form_instances_public_id_key" ON "form_instances"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_instances_public_id_key" ON "workflow_instances"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_instances_serial_number_key" ON "workflow_instances"("serial_number");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_instance_nodes_public_id_key" ON "workflow_instance_nodes"("public_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- AddForeignKey
ALTER TABLE "forms" ADD CONSTRAINT "forms_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "form_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_categories" ADD CONSTRAINT "form_categories_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_versions" ADD CONSTRAINT "workflow_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_workflow_bindings" ADD CONSTRAINT "form_workflow_bindings_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_workflow_bindings" ADD CONSTRAINT "form_workflow_bindings_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_instances" ADD CONSTRAINT "form_instances_form_version_id_fkey" FOREIGN KEY ("form_version_id") REFERENCES "form_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_workflow_id_fkey" FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_submitter_id_fkey" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instances" ADD CONSTRAINT "workflow_instances_withdraw_by_fkey" FOREIGN KEY ("withdraw_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instance_nodes" ADD CONSTRAINT "workflow_instance_nodes_escalated_to_fkey" FOREIGN KEY ("escalated_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instance_nodes" ADD CONSTRAINT "workflow_instance_nodes_instance_id_fkey" FOREIGN KEY ("instance_id") REFERENCES "workflow_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_instance_nodes" ADD CONSTRAINT "workflow_instance_nodes_subflow_instance_id_fkey" FOREIGN KEY ("subflow_instance_id") REFERENCES "workflow_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_workflow_instance_id_fkey" FOREIGN KEY ("workflow_instance_id") REFERENCES "workflow_instances"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_instance_node_id_fkey" FOREIGN KEY ("instance_node_id") REFERENCES "workflow_instance_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_target_instance_node_id_fkey" FOREIGN KEY ("target_instance_node_id") REFERENCES "workflow_instance_nodes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
