import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  WorkflowInstance,
  WorkflowRevisions,
  WorkflowEvent,
  InstanceStatus,
} from '../../common/types/common.types';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';
import { generatePublicId } from '../../common/utils/id-generator';
import { generateWorkflowSerialNumber } from '../../common/utils/serial-number';

export type WorkflowInstanceWithRelations = Prisma.WorkflowInstanceGetPayload<{
  include: {
    applicant: true;
    submitter: true;
    revision: { include: { workflow: true } };
  };
}>;

/**
 * Workflow Instance Repository
 *
 * Data access layer for workflow_instances operations.
 * Only contains pure data operations without business logic.
 */
@Injectable()
export class WorkflowInstanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds a workflow instance by its internal ID
   * @param instanceId - The internal ID of the workflow instance
   * @param tx - Optional Prisma transaction client
   * @returns The workflow instance or null if not found
   */
  async findById(
    instanceId: number,
    tx?: PrismaTransactionClient,
  ): Promise<WorkflowInstance | null> {
    const client = tx || this.prisma;
    return client.workflowInstance.findUnique({
      where: { id: instanceId },
    });
  }

  /**
   * Finds a workflow instance by its internal ID with events
   * @param instanceId - The internal ID of the workflow instance
   * @param tx - Optional Prisma transaction client
   * @returns The workflow instance with events or null if not found
   */
  async findByIdWithEvents(
    instanceId: number,
    tx?: PrismaTransactionClient,
  ): Promise<(WorkflowInstance & { events: WorkflowEvent[] }) | null> {
    const client = tx || this.prisma;
    return client.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        events: true,
      },
    });
  }

  /**
   * Finds a workflow instance with its revision (including flow_definition)
   * @param instanceId - The internal ID of the workflow instance
   * @param tx - Optional Prisma transaction client
   * @returns The workflow instance with revision, or null if not found
   */
  async findWithRevision(
    instanceId: number,
    tx?: PrismaTransactionClient,
  ): Promise<(WorkflowInstance & { revision: WorkflowRevisions }) | null> {
    const client = tx || this.prisma;
    return client.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        revision: true,
      },
    });
  }

  /**
   * Finds a workflow instance with full details including revision, workflow, applicant, submitter and withdrawer
   * @param instanceId - The internal ID of the workflow instance
   * @param tx - Optional Prisma transaction client
   * @returns The workflow instance with related data, or null if not found
   */
  async findWithDetails(instanceId: number, tx?: PrismaTransactionClient) {
    const client = tx || this.prisma;
    return client.workflowInstance.findUnique({
      where: { id: instanceId },
      include: {
        revision: {
          include: {
            workflow: true,
          },
        },
        applicant: true,
        submitter: true,
      },
    });
  }

  /**
   * Finds a workflow instance by its public ID
   * @param publicId - The public UUID of the workflow instance
   * @returns The workflow instance or null if not found
   */
  async findByPublicId(publicId: string): Promise<WorkflowInstance | null> {
    return this.prisma.workflowInstance.findUnique({
      where: { public_id: publicId },
    });
  }

  /**
   * Updates a workflow instance status
   * @param id - The internal ID of the workflow instance
   * @param status - The new status
   * @param updatedBy - The user ID performing the update
   * @returns The updated workflow instance
   */
  async updateStatus(
    id: number,
    status: InstanceStatus,
    updatedBy: number,
  ): Promise<WorkflowInstance> {
    return this.prisma.workflowInstance.update({
      where: { id },
      data: { status, updated_by: updatedBy },
    });
  }

  /**
   * Finds a workflow instance by its serial number
   * @param serialNumber - The serial number of the workflow instance
   * @param visibilityWhere - Optional visibility filter
   * @returns The workflow instance or null if not found
   */
  async findBySerialNumber(
    serialNumber: string,
    visibilityWhere?: Prisma.WorkflowInstanceWhereInput,
  ): Promise<WorkflowInstance | null> {
    return this.prisma.workflowInstance.findFirst({
      where: {
        AND: [{ serial_number: serialNumber }, visibilityWhere || {}],
      },
    });
  }

  /**
   * Finds a workflow instance by its serial number with revision
   * @param serialNumber - The serial number of the workflow instance
   * @param status - Optional status filter
   * @returns The workflow instance with revision or null if not found
   */
  async findBySerialNumberWithRevision(
    serialNumber: string,
    status?: InstanceStatus,
    tx?: PrismaTransactionClient,
  ): Promise<(WorkflowInstance & { revision: WorkflowRevisions }) | null> {
    const client = tx || this.prisma;
    return client.workflowInstance.findFirst({
      where: {
        serial_number: serialNumber,
        ...(status && { status }),
      },
      include: {
        revision: true,
      },
    });
  }

  /**
   * Atomically allocates the next serial number for a new instance of the
   * given workflow. Reads workflow.serial_prefix and bumps the
   * serial_counters table in one round trip.
   */
  async generateSerialNumber(
    workflowId: number,
    issueDate: Date,
    tx?: PrismaTransactionClient,
  ): Promise<string> {
    const client = tx || this.prisma;
    const workflow = await client.workflow.findUniqueOrThrow({
      where: { id: workflowId },
      select: { serial_prefix: true },
    });
    return generateWorkflowSerialNumber(
      workflow.serial_prefix,
      issueDate,
      client,
    );
  }

  /**
   * Creates a new workflow instance (basic version without relations)
   * @param data - The workflow instance data
   * @param tx - Optional Prisma transaction client
   * @returns The created workflow instance
   */
  async create(
    data:
      | Prisma.WorkflowInstanceUncheckedCreateInput
      | (Omit<Prisma.WorkflowInstanceUncheckedCreateInput, 'public_id'> & {
          public_id?: string;
        }),
    tx?: PrismaTransactionClient,
  ): Promise<WorkflowInstance> {
    const client = tx || this.prisma;
    if (!data.public_id) {
      data.public_id = generatePublicId();
    }
    return client.workflowInstance.create({
      data: data as Prisma.WorkflowInstanceUncheckedCreateInput,
    });
  }

  /**
   * Creates a new workflow instance with full relations
   * (applicant, revision with workflow)
   * @param data - The workflow instance data
   * @param tx - Optional Prisma transaction client
   * @returns The created workflow instance with relations
   */
  async createWithRelations(
    data:
      | Prisma.WorkflowInstanceUncheckedCreateInput
      | (Omit<Prisma.WorkflowInstanceUncheckedCreateInput, 'public_id'> & {
          public_id?: string;
        }),
    tx?: PrismaTransactionClient,
  ): Promise<WorkflowInstanceWithRelations> {
    const client = tx || this.prisma;
    if (!data.public_id) {
      data.public_id = generatePublicId();
    }
    return client.workflowInstance.create({
      data: data as Prisma.WorkflowInstanceUncheckedCreateInput,
      include: {
        applicant: true,
        submitter: true,
        revision: { include: { workflow: true } },
      },
    });
  }

  /**
   * Updates a workflow instance with partial data
   * @param id - The internal ID of the workflow instance
   * @param data - Partial workflow instance data to update
   * @param tx - Optional Prisma transaction client
   * @returns The updated workflow instance
   */
  async update(
    id: number,
    data: Partial<WorkflowInstance>,
    tx?: PrismaTransactionClient,
  ): Promise<WorkflowInstance> {
    const client = tx || this.prisma;
    return client.workflowInstance.update({
      where: { id },
      data,
    });
  }

  /**
   * Deletes a workflow instance by its ID
   * @param id - The internal ID of the workflow instance
   * @param tx - Optional Prisma transaction client
   * @returns The deleted workflow instance
   */
  async delete(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<WorkflowInstance> {
    const client = tx || this.prisma;
    return client.workflowInstance.delete({
      where: { id },
    });
  }
}
