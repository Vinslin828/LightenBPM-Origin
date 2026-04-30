import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  ApprovalTask,
  WorkflowNode,
  WorkflowComment,
  ApprovalStatus,
  User,
} from '../../common/types/common.types';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';
import { generatePublicId } from '../../common/utils/id-generator';

@Injectable()
export class ApprovalTaskRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new approval task
   * @param data - The approval task data
   * @returns The created approval task
   */
  async create(data: {
    workflow_node_id: number;
    assignee_id: number;
    approver_group_index?: number; // Optional, defaults to 0 in schema
    iteration: number;
    status: ApprovalStatus;
    updated_by?: number;
    public_id?: string;
  }): Promise<ApprovalTask> {
    return this.prisma.approvalTask.create({
      data: {
        ...data,
        public_id: data.public_id || generatePublicId(),
      },
    });
  }

  /**
   * Creates a new approval task with optional workflow comment
   * Used for auto-approval scenarios where we need to create both task and comment
   * @param taskData - The approval task data
   * @param commentData - Optional workflow comment data (for auto-approved tasks)
   * @param tx - Optional Prisma transaction client
   * @returns The created approval task
   */
  async createWithOptionalComment(
    taskData: {
      workflow_node_id: number;
      assignee_id: number;
      approver_group_index: number;
      iteration: number;
      status: ApprovalStatus;
      updated_by?: number;
      public_id?: string;
    },
    commentData?: {
      text: string;
      serial_number: string;
      author_id: number;
    },
    tx?: PrismaTransactionClient,
  ): Promise<ApprovalTask> {
    const client = tx || this.prisma;
    const createdTask = await client.approvalTask.create({
      data: {
        ...taskData,
        public_id: taskData.public_id || generatePublicId(),
      },
    });

    // Create workflow comment if provided
    if (commentData) {
      await client.workflowComment.create({
        data: {
          text: commentData.text,
          serial_number: commentData.serial_number,
          approval_task_id: createdTask.id,
          author_id: commentData.author_id,
          updated_by: commentData.author_id,
        },
      });
    }

    return createdTask;
  }

  /**
   * Creates multiple approval tasks in a single transaction
   * @param tasks - Array of approval task data
   * @returns The created approval tasks
   */
  async createMany(
    tasks: Array<{
      workflow_node_id: number;
      assignee_id: number;
      approver_group_index: number;
      iteration: number;
      status: ApprovalStatus;
      updated_by?: number;
      public_id?: string;
    }>,
  ): Promise<number> {
    const data = tasks.map((task) => ({
      ...task,
      public_id: task.public_id || generatePublicId(),
    }));
    const result = await this.prisma.approvalTask.createMany({
      data,
    });
    return result.count;
  }

  /**
   * Finds all approval tasks for a workflow node
   * @param workflowNodeId - The workflow node ID
   * @param tx - Optional Prisma transaction client
   * @returns Array of approval tasks
   */
  async findByWorkflowNodeId(
    workflowNodeId: number,
    tx?: PrismaTransactionClient,
  ): Promise<ApprovalTask[]> {
    const client = tx || this.prisma;
    return client.approvalTask.findMany({
      where: { workflow_node_id: workflowNodeId },
    });
  }

  /**
   * Finds approval tasks by workflow node ID and status
   * @param workflowNodeId - The workflow node ID
   * @param status - The approval status to filter by
   * @param tx - Optional Prisma transaction client
   * @returns Array of approval tasks matching the criteria
   */
  async findByNodeId(
    workflowNodeId: number,
    status: ApprovalStatus,
    tx?: PrismaTransactionClient,
  ): Promise<ApprovalTask[]> {
    const client = tx || this.prisma;
    return client.approvalTask.findMany({
      where: {
        workflow_node_id: workflowNodeId,
        status,
      },
    });
  }

  /**
   * Finds an approval task by its ID
   * @param id - The approval task ID
   * @returns The approval task or null if not found
   */
  async findById(id: number): Promise<ApprovalTask | null> {
    return this.prisma.approvalTask.findUnique({
      where: { id },
    });
  }

  /**
   * Finds an approval task by its public ID with workflow node
   * @param publicId - The public UUID of the approval task
   * @returns The approval task with workflow node or null if not found
   */
  async findByPublicIdWithNode(
    publicId: string,
  ): Promise<(ApprovalTask & { workflow_node: WorkflowNode }) | null> {
    return this.prisma.approvalTask.findFirst({
      where: { public_id: publicId },
      include: {
        workflow_node: true,
      },
    });
  }

  /**
   * Finds an approval task by its public uuid
   * @param uuid - The approval public id (uuid)
   * @returns The approval task or null if not found
   */
  async findByUuid(uuid: string): Promise<{
    serial_number: string;
    approval_task: ApprovalTask;
    workflow_node: WorkflowNode & { approval_tasks: ApprovalTask[] };
    comments: (WorkflowComment & { author: User })[];
  } | null> {
    const result = await this.prisma.approvalTask.findUnique({
      where: { public_id: uuid },
      include: {
        workflow_node: {
          include: {
            approval_tasks: true,
            workflow_instance: {
              select: {
                serial_number: true,
              },
            },
          },
        },
        assignee: true,
        comments: {
          include: {
            author: true,
          },
        },
      },
    });

    if (!result) return null;

    return {
      serial_number: result.workflow_node.workflow_instance.serial_number,
      approval_task: result,
      workflow_node: result.workflow_node,
      comments: result.comments,
    };
  }

  /**
   * Updates an approval task status
   * @param id - The approval task ID
   * @param status - The new status
   * @returns The updated approval task
   */
  async updateStatus(
    id: number,
    status: ApprovalStatus,
    updated_by: number,
  ): Promise<ApprovalTask> {
    return this.prisma.approvalTask.update({
      where: { id },
      data: { status, updated_by },
    });
  }

  /**
   * Updates an approval task with partial data
   * @param id - The approval task ID
   * @param data - Partial approval task data to update
   * @param tx - Optional Prisma transaction client
   * @returns The updated approval task
   */
  async update(
    id: number,
    data: Partial<ApprovalTask>,
    tx?: PrismaTransactionClient,
  ): Promise<ApprovalTask> {
    const client = tx || this.prisma;
    return client.approvalTask.update({
      where: { id },
      data,
    });
  }

  /**
   * Finds approval tasks matching the given criteria
   * @param params - Query parameters (where, orderBy, include, etc.)
   * @param tx - Optional Prisma transaction client
   * @returns Array of approval tasks
   */
  async findMany<T = ApprovalTask>(
    params: Prisma.ApprovalTaskFindManyArgs,
    tx?: PrismaTransactionClient,
  ): Promise<T[]> {
    const client = tx || this.prisma;
    return client.approvalTask.findMany(params) as Promise<T[]>;
  }

  /**
   * Finds the first approval task matching the given criteria
   * @param where - The where clause for filtering
   * @param tx - Optional Prisma transaction client
   * @returns The approval task or null if not found
   */
  async findFirst<T = ApprovalTask>(
    where: Prisma.ApprovalTaskWhereInput,
    tx?: PrismaTransactionClient,
  ): Promise<T | null> {
    const client = tx || this.prisma;
    return client.approvalTask.findFirst({ where }) as Promise<T | null>;
  }

  /**
   * Counts approval tasks matching the given criteria
   * @param where - The where clause for filtering
   * @param tx - Optional Prisma transaction client
   * @returns The count of approval tasks
   */
  async count(
    where: Prisma.ApprovalTaskWhereInput,
    tx?: PrismaTransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;
    return client.approvalTask.count({ where });
  }

  /**
   * Groups approval tasks by approver_group_index
   * Used to check how many approval groups have pending/waiting tasks
   * @param where - The where clause for filtering
   * @param tx - Optional Prisma transaction client
   * @returns Array of grouped results with approver_group_index
   */
  async groupByApproverGroupIndex(
    where: Prisma.ApprovalTaskWhereInput,
    tx?: PrismaTransactionClient,
  ): Promise<Array<{ approver_group_index: number }>> {
    const client = tx || this.prisma;
    // Prisma's groupBy has extremely complex type signatures that cannot be easily typed
    // This is a known limitation: https://github.com/prisma/prisma/issues/12807
    // Using type assertion here is safe as we control both input and output types
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return await client.approvalTask.groupBy({
      by: ['approver_group_index'],
      where,
    } as any);
  }

  /**
   * Updates multiple approval tasks matching the criteria
   * @param where - The where clause for filtering
   * @param data - Partial approval task data to update
   * @param tx - Optional Prisma transaction client
   * @returns The count of updated records
   */
  async updateMany(
    where: Prisma.ApprovalTaskWhereInput,
    data: Partial<ApprovalTask>,
    tx?: PrismaTransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;
    return (
      await client.approvalTask.updateMany({
        where,
        data,
      })
    ).count;
  }

  /**
   * Gets all user IDs who have approved in a workflow instance
   * Used for auto-approval: if a user has already approved once in this instance,
   * they can be auto-approved in subsequent approval nodes
   * @param instanceId - The workflow instance ID
   * @param tx - Optional Prisma transaction client
   * @returns Set of user IDs who have approved
   */
  async getPriorApprovedUsers(
    instanceId: number,
    tx?: PrismaTransactionClient,
  ): Promise<Set<number>> {
    const client = tx || this.prisma;
    const approvedTasks = await client.approvalTask.findMany({
      where: {
        workflow_node: {
          instance_id: instanceId,
        },
        status: ApprovalStatus.APPROVED,
      },
      select: {
        assignee_id: true,
      },
      distinct: ['assignee_id'],
    });

    return new Set(approvedTasks.map((task) => task.assignee_id));
  }

  /**
   * Updates multiple approval tasks by instance ID with partial data
   * @param instanceId - The workflow instance ID
   * @param data - Partial approval task data to update
   * @param statusFilter - Optional array of statuses to filter which tasks to update
   * @param tx - Optional Prisma transaction client
   * @returns The count of updated records
   */
  async updateManyByInstanceId(
    instanceId: number,
    data: Partial<ApprovalTask>,
    statusFilter?: ApprovalStatus[],
    tx?: PrismaTransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;
    const result = await client.approvalTask.updateMany({
      where: {
        workflow_node: {
          instance_id: instanceId,
        },
        status: statusFilter ? { in: statusFilter } : undefined,
      },
      data,
    });
    return result.count;
  }
}
