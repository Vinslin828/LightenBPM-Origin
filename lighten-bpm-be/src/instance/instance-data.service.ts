import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ApprovalTask,
  WorkflowNode,
  WorkflowInstance,
  ApprovalStatus,
  NodeStatus,
  InstanceStatus,
  WorkflowAction,
  NodeResult,
} from '../common/types/common.types';
import { PrismaTransactionClient } from '../prisma/transaction-client.type';
import { ApplicationRepository } from './repositories/application.repository';
import { ApprovalTaskRepository } from './repositories/approval-task.repository';
import { FormInstanceRepository } from './repositories/form-instance.repository';
import { WorkflowCommentRepository } from './repositories/workflow-comment.repository';
import { WorkflowInstanceRepository } from './repositories/workflow-instance.repository';
import { WorkflowNodeRepository } from './repositories/workflow-node.repository';

import { FormInstanceDataRepository } from './repositories/form-instance-data.repository';
import { WorkflowEventRepository } from './repositories/workflow-event.repository';

@Injectable()
export class InstanceDataService {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly approvalTaskRepository: ApprovalTaskRepository,
    private readonly formInstanceRepository: FormInstanceRepository,
    private readonly workflowCommentRepository: WorkflowCommentRepository,
    private readonly workflowInstanceRepository: WorkflowInstanceRepository,
    private readonly workflowNodeRepository: WorkflowNodeRepository,
    private readonly formInstanceDataRepository: FormInstanceDataRepository,
    private readonly workflowEventRepository: WorkflowEventRepository,
  ) {}

  // Workflow Instance methods
  async findWorkflowInstanceWithRevision(
    serialNumber: string,
    status?: InstanceStatus,
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowInstanceRepository.findBySerialNumberWithRevision(
      serialNumber,
      status,
      tx,
    );
  }

  async findWorkflowInstanceById(id: number, tx?: PrismaTransactionClient) {
    return this.workflowInstanceRepository.findById(id, tx);
  }

  async findWorkflowInstanceByIdWithEvents(
    id: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowInstanceRepository.findByIdWithEvents(id, tx);
  }

  async findWorkflowInstanceWithDetails(
    id: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowInstanceRepository.findWithDetails(id, tx);
  }

  async findWorkflowInstanceWithRevisionById(
    id: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowInstanceRepository.findWithRevision(id, tx);
  }

  async updateWorkflowInstance(
    id: number,
    data: Partial<WorkflowInstance>,
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowInstanceRepository.update(id, data, tx);
  }

  async updateWorkflowInstanceWithEvent(
    id: number,
    data: Partial<WorkflowInstance>,
    eventData: {
      event_type: WorkflowAction;
      status_before?: InstanceStatus;
      status_after: InstanceStatus;
      actor_id: number;
      details?: Prisma.InputJsonValue;
    },
    tx?: PrismaTransactionClient,
  ) {
    await this.workflowInstanceRepository.update(id, data, tx);
    await this.workflowEventRepository.create(
      {
        workflow_instance_id: id,
        event_type: eventData.event_type,
        status_before: eventData.status_before,
        status_after: eventData.status_after,
        actor_id: eventData.actor_id,
        details: eventData.details,
      },
      tx,
    );
  }

  // Form Instance methods
  async findFormInstanceByWorkflowInstanceId(
    id: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.formInstanceRepository.findByWorkflowInstanceId(id, tx);
  }

  async createFormInstanceSnapshot(
    data: {
      form_instance_id: number;
      data: Prisma.InputJsonValue;
      created_by: number;
    },
    tx?: PrismaTransactionClient,
  ) {
    return this.formInstanceDataRepository.create(data, tx);
  }

  async findLatestFormData(
    formInstanceId: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.formInstanceDataRepository.findLatestByFormInstanceId(
      formInstanceId,
      tx,
    );
  }

  // Approval Task methods
  async findApprovalTaskByPublicIdWithNode(publicId: string) {
    return this.approvalTaskRepository.findByPublicIdWithNode(publicId);
  }

  async createApprovalTaskWithOptionalComment(
    taskData: {
      workflow_node_id: number;
      assignee_id: number;
      approver_group_index: number;
      iteration: number;
      status: ApprovalStatus;
      updated_by?: number;
    },
    commentData?: {
      text: string;
      serial_number: string;
      author_id: number;
    },
    tx?: PrismaTransactionClient,
  ) {
    return this.approvalTaskRepository.createWithOptionalComment(
      taskData,
      commentData,
      tx,
    );
  }

  async updateApprovalTask(
    id: number,
    data: Partial<ApprovalTask>,
    tx?: PrismaTransactionClient,
  ) {
    return this.approvalTaskRepository.update(id, data, tx);
  }

  async findApprovalTasksByWorkflowNodeId(
    workflowNodeId: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.approvalTaskRepository.findByWorkflowNodeId(workflowNodeId, tx);
  }

  async findApprovalTasksByNodeIdAndStatus(
    workflowNodeId: number,
    status: ApprovalStatus,
    tx?: PrismaTransactionClient,
  ) {
    return this.approvalTaskRepository.findByNodeId(workflowNodeId, status, tx);
  }

  async findWaitingApprovalTasksInGroup(
    workflowNodeId: number,
    approverGroupIndex: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.approvalTaskRepository.findMany(
      {
        where: {
          workflow_node_id: workflowNodeId,
          approver_group_index: approverGroupIndex,
          status: ApprovalStatus.WAITING,
        },
        orderBy: { created_at: 'asc' },
      },
      tx,
    );
  }

  async findPriorApproval(
    instanceId: number,
    assigneeId: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.approvalTaskRepository.findFirst(
      {
        workflow_node: {
          instance_id: instanceId,
        },
        assignee_id: assigneeId,
        status: ApprovalStatus.APPROVED,
      },
      tx,
    );
  }

  async countPendingApprovalTasksInGroup(
    workflowNodeId: number,
    approverGroupIndex: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.approvalTaskRepository.count(
      {
        workflow_node_id: workflowNodeId,
        approver_group_index: approverGroupIndex,
        status: ApprovalStatus.PENDING,
      },
      tx,
    );
  }

  async getGroupsWithPendingOrWaitingTasks(
    workflowNodeId: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.approvalTaskRepository.groupByApproverGroupIndex(
      {
        workflow_node_id: workflowNodeId,
        status: { in: [ApprovalStatus.PENDING, ApprovalStatus.WAITING] },
      },
      tx,
    );
  }

  async getPriorApprovedUsers(
    instanceId: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.approvalTaskRepository.getPriorApprovedUsers(instanceId, tx);
  }

  async updateManyApprovalTasks(
    where: Prisma.ApprovalTaskWhereInput,
    data: Partial<ApprovalTask>,
    tx?: PrismaTransactionClient,
  ) {
    return this.approvalTaskRepository.updateMany(where, data, tx);
  }

  async updateManyApprovalTasksByInstanceId(
    instanceId: number,
    data: Partial<ApprovalTask>,
    statusFilter?: ApprovalStatus[],
    tx?: PrismaTransactionClient,
  ) {
    return this.approvalTaskRepository.updateManyByInstanceId(
      instanceId,
      data,
      statusFilter,
      tx,
    );
  }

  /**
   * Checks if a user is involved as an approver in a specific workflow instance.
   * @param instanceId - The internal ID of the workflow instance
   * @param userId - The ID of the user to check
   * @returns Promise<boolean> - True if the user is an assignee or escalated_to in any task for this instance
   */
  async isUserInvolvedAsApprover(
    instanceId: number,
    userId: number,
  ): Promise<boolean> {
    const count = await this.approvalTaskRepository.count({
      workflow_node: {
        instance_id: instanceId,
      },
      OR: [{ assignee_id: userId }, { escalated_to: userId }],
    });
    return count > 0;
  }

  // Workflow Node methods
  async createWorkflowNode(
    data: {
      instance_id: number;
      node_key: string;
      node_type: any; // Using any to avoid importing NodeType from types if not needed, or better use prisma client NodeType
      iteration: number;
      subflow_instance_id?: number;
    },
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowNodeRepository.create(data, tx);
  }

  async updateWorkflowNode(
    id: number,
    data: Partial<WorkflowNode>,
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowNodeRepository.update(id, data, tx);
  }

  async updateWorkflowNodeStatus(
    id: number,
    status: NodeStatus,
    result?: NodeResult,
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowNodeRepository.updateStatus(id, status, result, tx);
  }

  async updateManyWorkflowNodes(
    where: Prisma.WorkflowNodeWhereInput,
    data: Partial<WorkflowNode>,
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowNodeRepository.updateMany(where, data, tx);
  }

  async updateManyWorkflowNodesByInstanceId(
    instanceId: number,
    data: Partial<WorkflowNode>,
    statusFilter?: NodeStatus,
    tx?: PrismaTransactionClient,
    iteration?: number,
  ) {
    return this.workflowNodeRepository.updateManyByInstanceId(
      instanceId,
      data,
      statusFilter,
      tx,
      iteration,
    );
  }

  async findWorkflowNodeByInstanceAndKey(
    instanceId: number,
    nodeKey: string,
    iteration?: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowNodeRepository.findByInstanceAndKey(
      instanceId,
      nodeKey,
      iteration,
      tx,
    );
  }

  async findWorkflowNodeByIdWithApprovalTasks(
    id: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowNodeRepository.findByIdWithApprovalTasks(id, tx);
  }

  async findWorkflowNodesByInstanceId(
    instanceId: number,
    iteration?: number,
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowNodeRepository.findByInstanceId(
      instanceId,
      iteration,
      tx,
    );
  }

  async findBySerialNumberWithTasks(serialNumber: string) {
    return this.workflowNodeRepository.findBySerialNumberWithTasks(
      serialNumber,
    );
  }

  // Workflow Comment methods
  async createWorkflowComment(
    data: {
      text: string;
      serial_number: string;
      approval_task_id: number;
      author_id: number;
      updated_by: number;
    },
    tx?: PrismaTransactionClient,
  ) {
    return this.workflowCommentRepository.create(data, tx);
  }

  // Deletion methods
  async deleteInstanceData(
    serialNumber: string,
    workflowInstanceId: number,
    tx?: PrismaTransactionClient,
  ) {
    // Delete workflow nodes (will cascade delete ApprovalTask and WorkflowComment)
    await this.workflowNodeRepository.deleteManyByInstanceId(
      workflowInstanceId,
      tx,
    );

    // Delete form instance
    await this.formInstanceRepository.deleteManyBySerialNumber(
      serialNumber,
      tx,
    );

    // Delete workflow instance
    await this.workflowInstanceRepository.delete(workflowInstanceId, tx);

    // Delete application instance (root entity)
    await this.applicationRepository.deleteApplicationInstance(
      serialNumber,
      tx,
    );
  }
}
