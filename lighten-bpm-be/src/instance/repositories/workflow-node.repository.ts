import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  WorkflowNode,
  ApprovalTask,
  NodeResult,
  NodeStatus,
  NodeType,
} from '../../common/types/common.types';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';
import { generatePublicId } from '../../common/utils/id-generator';

@Injectable()
export class WorkflowNodeRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds all workflow nodes for a specific workflow instance
   * @param instanceId - The internal ID of the workflow instance
   * @param iteration - Optional iteration number. If not provided, uses current_iteration from workflow_instance
   * @param tx - Optional Prisma transaction client
   * @returns Array of workflow nodes
   */
  async findByInstanceId(
    instanceId: number,
    iteration?: number,
    tx?: PrismaTransactionClient,
  ): Promise<WorkflowNode[]> {
    const client = tx || this.prisma;

    // If iteration not provided, get current_iteration from workflow_instance
    let targetIteration = iteration;
    if (targetIteration === undefined) {
      const workflowInstance = await client.workflowInstance.findUnique({
        where: { id: instanceId },
        select: { current_iteration: true },
      });
      targetIteration = workflowInstance?.current_iteration ?? 1;
    }

    return client.workflowNode.findMany({
      where: {
        instance_id: instanceId,
        iteration: targetIteration,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Finds a workflow node by its public ID
   * @param publicId - The public UUID of the workflow node
   * @returns The workflow node or null if not found
   */
  async findByPublicId(publicId: string): Promise<WorkflowNode | null> {
    return this.prisma.workflowNode.findUnique({
      where: { public_id: publicId },
    });
  }

  /**
   * Finds a workflow node by instance ID and node key
   * @param instanceId - The internal ID of the workflow instance
   * @param nodeKey - The node key from flow definition
   * @param iteration - Optional iteration number. If not provided, uses current_iteration from workflow_instance
   * @param tx - Optional Prisma transaction client
   * @returns The workflow node or null if not found
   */
  async findByInstanceAndKey(
    instanceId: number,
    nodeKey: string,
    iteration?: number,
    tx?: PrismaTransactionClient,
  ): Promise<WorkflowNode | null> {
    const client = tx || this.prisma;

    // If iteration not provided, get current_iteration from workflow_instance
    let targetIteration = iteration;
    if (targetIteration === undefined) {
      const workflowInstance = await client.workflowInstance.findUnique({
        where: { id: instanceId },
        select: { current_iteration: true },
      });
      targetIteration = workflowInstance?.current_iteration ?? 1;
    }

    return client.workflowNode.findFirst({
      where: {
        instance_id: instanceId,
        node_key: nodeKey,
        iteration: targetIteration,
      },
    });
  }

  /**
   * Finds a workflow node by its internal ID with approval tasks
   * @param id - The internal ID of the workflow node
   * @param tx - Optional Prisma transaction client
   * @returns The workflow node with approval tasks or null if not found
   */
  async findByIdWithApprovalTasks(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<(WorkflowNode & { approval_tasks: ApprovalTask[] }) | null> {
    const client = tx || this.prisma;
    return client.workflowNode.findUnique({
      where: { id },
      include: {
        approval_tasks: { orderBy: { created_at: 'asc' } },
      },
    });
  }

  /**
   * Finds all workflow nodes by serial number with approval tasks
   * @param serialNumber - The serial number of the workflow instance
   * @returns Array of workflow nodes with approval tasks
   */
  async findBySerialNumberWithTasks(
    serialNumber: string,
  ): Promise<(WorkflowNode & { approval_tasks: ApprovalTask[] })[]> {
    return this.prisma.workflowNode.findMany({
      where: {
        workflow_instance: {
          serial_number: serialNumber,
        },
      },
      include: {
        approval_tasks: { orderBy: { created_at: 'asc' } },
      },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Creates a new workflow node
   * @param data - The workflow node data
   * @param tx - Optional Prisma transaction client
   * @returns The created workflow node
   */
  async create(
    data: {
      instance_id: number;
      node_key: string;
      node_type: NodeType;
      iteration: number;
      subflow_instance_id?: number;
      public_id?: string;
    },
    tx?: PrismaTransactionClient,
  ): Promise<WorkflowNode> {
    const client = tx || this.prisma;
    return client.workflowNode.create({
      data: {
        public_id: data.public_id || generatePublicId(),
        instance_id: data.instance_id,
        node_key: data.node_key,
        node_type: data.node_type,
        iteration: data.iteration,
        subflow_instance_id: data.subflow_instance_id,
      },
    });
  }

  /**
   * Updates a workflow node status
   * @param id - The internal ID of the workflow node
   * @param status - The new status
   * @param result - The node result (optional)
   * @param tx - Optional Prisma transaction client
   * @returns The updated workflow node
   */
  async updateStatus(
    id: number,
    status: NodeStatus,
    result?: NodeResult,
    tx?: PrismaTransactionClient,
  ): Promise<WorkflowNode> {
    const client = tx || this.prisma;
    return client.workflowNode.update({
      where: { id },
      data: {
        status,
        result,
        completed_at: status === NodeStatus.COMPLETED ? new Date() : undefined,
      },
    });
  }

  /**
   * Updates a workflow node with partial data
   * @param id - The internal ID of the workflow node
   * @param data - Partial workflow node data to update
   * @param tx - Optional Prisma transaction client
   * @returns The updated workflow node
   */
  async update(
    id: number,
    data: Partial<WorkflowNode>,
    tx?: PrismaTransactionClient,
  ): Promise<WorkflowNode> {
    const client = tx || this.prisma;
    return client.workflowNode.update({
      where: { id },
      data,
    });
  }

  /**
   * Updates multiple workflow nodes matching the criteria
   * @param where - The where clause for filtering
   * @param data - Partial workflow node data to update
   * @param tx - Optional Prisma transaction client
   * @returns The count of updated records
   */
  async updateMany(
    where: Prisma.WorkflowNodeWhereInput,
    data: Partial<WorkflowNode>,
    tx?: PrismaTransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;
    return (
      await client.workflowNode.updateMany({
        where,
        data,
      })
    ).count;
  }

  /**
   * Updates multiple workflow nodes by instance ID with partial data
   * @param instanceId - The workflow instance ID
   * @param data - Partial workflow node data to update
   * @param statusFilter - Optional status to filter which nodes to update
   * @param tx - Optional Prisma transaction client
   * @param iteration - Optional iteration number. If not provided, uses current_iteration from workflow_instance
   * @returns The count of updated records
   */
  async updateManyByInstanceId(
    instanceId: number,
    data: Partial<WorkflowNode>,
    statusFilter?: NodeStatus,
    tx?: PrismaTransactionClient,
    iteration?: number,
  ): Promise<number> {
    const client = tx || this.prisma;

    // If iteration not provided, get current_iteration from workflow_instance
    let targetIteration = iteration;
    if (targetIteration === undefined) {
      const workflowInstance = await client.workflowInstance.findUnique({
        where: { id: instanceId },
        select: { current_iteration: true },
      });
      targetIteration = workflowInstance?.current_iteration ?? 1;
    }

    const result = await client.workflowNode.updateMany({
      where: {
        instance_id: instanceId,
        iteration: targetIteration,
        status: statusFilter,
      },
      data,
    });
    return result.count;
  }

  /**
   * Deletes multiple workflow nodes by instance ID
   * @param instanceId - The workflow instance ID
   * @param tx - Optional Prisma transaction client
   * @param iteration - Optional iteration number. If not provided, uses current_iteration from workflow_instance
   * @returns The count of deleted records
   */
  async deleteManyByInstanceId(
    instanceId: number,
    tx?: PrismaTransactionClient,
    iteration?: number,
  ): Promise<number> {
    const client = tx || this.prisma;

    // If iteration not provided, get current_iteration from workflow_instance
    let targetIteration = iteration;
    if (targetIteration === undefined) {
      const workflowInstance = await client.workflowInstance.findUnique({
        where: { id: instanceId },
        select: { current_iteration: true },
      });
      targetIteration = workflowInstance?.current_iteration ?? 1;
    }

    const result = await client.workflowNode.deleteMany({
      where: {
        instance_id: instanceId,
        iteration: targetIteration,
      },
    });
    return result.count;
  }
}
