import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import {
  ApprovalStatus,
  InstanceStatus,
  NodeResult,
  NodeStatus,
  WorkflowAction,
} from '../../common/types/common.types';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';
import { FlowDefinition, NodeType, RejectBehavior } from '../types';
import { findNodeByKey } from '../shared/flow/flow-utils';
import { InstanceDataService } from '../../instance/instance-data.service';
import { UserService } from '../../user/user.service';
import {
  ApprovalContext,
  ApprovalTransactionResult,
} from '../types/approval-context.types';

@Injectable()
export class RejectionHandlerService {
  private readonly logger = new Logger(RejectionHandlerService.name);

  private _systemUserId: number | undefined;

  constructor(
    private readonly instanceDataService: InstanceDataService,
    private readonly userService: UserService,
  ) {}

  private async getSystemUserId(): Promise<number> {
    if (this._systemUserId === undefined) {
      const systemUser = await this.userService.getSystemUser();
      this._systemUserId = systemUser.id;
    }
    return this._systemUserId;
  }

  /**
   * Handles approval rejection - routes to appropriate handler based on reject_behavior
   */
  async handleRejection(
    tx: PrismaTransactionClient,
    context: ApprovalContext,
    approvalTaskId: number,
    apiRejectBehavior?: RejectBehavior,
    apiRejectTargetNodeKey?: string,
  ): Promise<ApprovalTransactionResult> {
    this.logger.debug('handleRejection');

    const nodeRejectConfig = context.approvalNodeConfig.reject_config;
    let behavior: RejectBehavior;
    let targetNodeKey: string | undefined = apiRejectTargetNodeKey;

    if (nodeRejectConfig) {
      // Node has reject_config
      if (nodeRejectConfig.behavior === RejectBehavior.USER_SELECT) {
        // USER_SELECT: require API to provide the actual behavior
        if (!apiRejectBehavior) {
          throw new BadRequestException(
            'reject_behavior is required in API request when node reject_config is USER_SELECT',
          );
        }
        behavior = apiRejectBehavior;

        // For send_to_specific_node selected by user, require target_node_key
        if (
          behavior === RejectBehavior.SEND_TO_SPECIFIC_NODE &&
          !targetNodeKey
        ) {
          throw new BadRequestException(
            'reject_target_node_key is required when user selects send_to_specific_node',
          );
        }
      } else {
        // Node has specific reject_config: use node's configured behavior
        if (apiRejectBehavior) {
          this.logger.warn(
            `API provided reject_behavior '${apiRejectBehavior}' but node has specific reject_config '${nodeRejectConfig.behavior}'. Using node config.`,
          );
        }

        behavior = nodeRejectConfig.behavior;

        // For SEND_TO_SPECIFIC_NODE, use node's target_node_key
        if (behavior === RejectBehavior.SEND_TO_SPECIFIC_NODE) {
          targetNodeKey = nodeRejectConfig.target_node_key;
        }
      }
    } else {
      // No node reject_config: default to CLOSE_APPLICATION
      if (apiRejectBehavior) {
        throw new BadRequestException(
          'reject_behavior should not be provided when node has no reject_config (defaults to close_application)',
        );
      }

      behavior = RejectBehavior.CLOSE_APPLICATION;
    }

    // Route to appropriate handler based on determined behavior
    switch (behavior) {
      case RejectBehavior.CLOSE_APPLICATION:
        return this.handleCloseApplication(tx, context, approvalTaskId);

      case RejectBehavior.RETURN_TO_APPLICANT:
        return this.handleReturnToApplicant(tx, context, approvalTaskId);

      case RejectBehavior.SEND_TO_SPECIFIC_NODE:
        if (!targetNodeKey) {
          throw new BadRequestException(
            'reject_target_node_key is required when reject_behavior is SEND_TO_SPECIFIC_NODE',
          );
        }
        return this.handleSendToSpecificNode(
          tx,
          context,
          approvalTaskId,
          targetNodeKey,
        );

      case RejectBehavior.BACK_TO_PREVIOUS_NODE:
        return this.handleBackToPreviousNode(tx, context, approvalTaskId);

      default:
        throw new BadRequestException(
          `Unsupported reject behavior: ${behavior}`,
        );
    }
  }

  //================================================================================
  // Common rejection helper methods
  //================================================================================

  private async cancelAllPendingAndWaitingTasks(
    tx: PrismaTransactionClient,
    context: ApprovalContext,
    approvalTaskId: number,
  ): Promise<void> {
    await this.instanceDataService.updateManyApprovalTasks(
      {
        workflow_node: {
          instance_id: context.workflowInstance.id,
        },
        id: { not: approvalTaskId },
        status: { in: [ApprovalStatus.PENDING, ApprovalStatus.WAITING] },
      },
      {
        status: ApprovalStatus.CANCELLED,
        updated_at: new Date(),
      },
      tx,
    );
  }

  private async markCurrentNodeAsRejected(
    tx: PrismaTransactionClient,
    context: ApprovalContext,
  ): Promise<void> {
    await this.instanceDataService.updateWorkflowNode(
      context.targetWorkflowNode.id,
      {
        status: NodeStatus.COMPLETED,
        result: NodeResult.REJECTED,
        completed_at: new Date(),
      },
      tx,
    );
  }

  private async cancelOtherPendingNodes(
    tx: PrismaTransactionClient,
    context: ApprovalContext,
  ): Promise<void> {
    await this.instanceDataService.updateManyWorkflowNodes(
      {
        instance_id: context.workflowInstance.id,
        iteration: context.workflowInstance.current_iteration,
        id: { not: context.targetWorkflowNode.id },
        status: NodeStatus.PENDING,
      },
      {
        status: NodeStatus.COMPLETED,
        result: NodeResult.CANCELLED,
        completed_at: new Date(),
      },
      tx,
    );
  }

  //================================================================================
  // Rejection behavior handlers
  //================================================================================

  private async handleCloseApplication(
    tx: PrismaTransactionClient,
    context: ApprovalContext,
    approvalTaskId: number,
  ): Promise<ApprovalTransactionResult> {
    this.logger.debug('handleCloseApplication');
    const systemUserId = await this.getSystemUserId();

    await this.cancelAllPendingAndWaitingTasks(tx, context, approvalTaskId);
    await this.markCurrentNodeAsRejected(tx, context);
    await this.cancelOtherPendingNodes(tx, context);

    await this.instanceDataService.updateWorkflowInstanceWithEvent(
      context.workflowInstance.id,
      {
        status: InstanceStatus.REJECTED,
        updated_by: systemUserId,
      },
      {
        event_type: WorkflowAction.REJECT,
        status_before: context.workflowInstance.status,
        status_after: InstanceStatus.REJECTED,
        actor_id: systemUserId,
        details: { reason: 'Close application on rejection' },
      },
      tx,
    );

    return {
      taskStatus: ApprovalStatus.REJECTED,
      nodeCompleted: true,
    };
  }

  private async handleReturnToApplicant(
    tx: PrismaTransactionClient,
    context: ApprovalContext,
    approvalTaskId: number,
  ): Promise<ApprovalTransactionResult> {
    this.logger.debug('handleReturnToApplicant');

    await this.cancelAllPendingAndWaitingTasks(tx, context, approvalTaskId);
    await this.markCurrentNodeAsRejected(tx, context);
    await this.cancelOtherPendingNodes(tx, context);

    const systemUserId = await this.getSystemUserId();
    await this.instanceDataService.updateWorkflowInstanceWithEvent(
      context.workflowInstance.id,
      {
        status: InstanceStatus.DRAFT,
      },
      {
        event_type: WorkflowAction.REJECT,
        status_before: context.workflowInstance.status,
        status_after: InstanceStatus.DRAFT,
        actor_id: systemUserId,
        details: { behavior: 'Return to applicant' },
      },
      tx,
    );

    return {
      taskStatus: ApprovalStatus.REJECTED,
      nodeCompleted: true,
    };
  }

  private async handleSendToSpecificNode(
    tx: PrismaTransactionClient,
    context: ApprovalContext,
    approvalTaskId: number,
    targetNodeKey: string,
  ): Promise<ApprovalTransactionResult> {
    this.logger.debug(
      `handleSendToSpecificNode, targetNodeKey: ${targetNodeKey}`,
    );

    if (!context.workflowInstance.revision.flow_definition) {
      throw new Error(
        `Workflow revision ${context.workflowInstance.revision_id} has no flow_definition`,
      );
    }

    const flowDefinition = context.workflowInstance.revision
      .flow_definition as unknown as FlowDefinition;
    const targetNodeConfig = findNodeByKey(flowDefinition, targetNodeKey);

    if (!targetNodeConfig) {
      throw new BadRequestException(
        `Target node '${targetNodeKey}' not found in flow definition`,
      );
    }

    if (targetNodeConfig.type === NodeType.APPROVAL) {
      const targetNode =
        await this.instanceDataService.findWorkflowNodeByInstanceAndKey(
          context.workflowInstance.id,
          targetNodeKey,
          context.workflowInstance.current_iteration,
          tx,
        );

      if (!targetNode) {
        throw new BadRequestException(
          `Target node '${targetNodeKey}' has not been executed in current iteration`,
        );
      }

      if (targetNode.status !== NodeStatus.COMPLETED) {
        throw new BadRequestException(
          `Target node '${targetNodeKey}' has not been completed yet. ` +
            `Can only send back to previously executed nodes.`,
        );
      }
    }

    await this.cancelAllPendingAndWaitingTasks(tx, context, approvalTaskId);
    await this.markCurrentNodeAsRejected(tx, context);
    await this.cancelOtherPendingNodes(tx, context);

    const newIteration = context.workflowInstance.current_iteration + 1;
    const systemUserId = await this.getSystemUserId();
    await this.instanceDataService.updateWorkflowInstanceWithEvent(
      context.workflowInstance.id,
      {
        current_iteration: newIteration,
        status: InstanceStatus.RUNNING,
      },
      {
        event_type: WorkflowAction.REJECT,
        status_before: context.workflowInstance.status,
        status_after: InstanceStatus.RUNNING,
        actor_id: systemUserId,
        details: { targetNodeKey, newIteration },
      },
      tx,
    );

    this.logger.debug(
      `Updated to iteration ${newIteration}. ` +
        `Workflow will restart from node '${targetNodeKey}' after transaction commits.`,
    );

    return {
      taskStatus: ApprovalStatus.REJECTED,
      nodeCompleted: true,
      resumeFromNodeKey: targetNodeKey,
    };
  }

  private async handleBackToPreviousNode(
    tx: PrismaTransactionClient,
    context: ApprovalContext,
    approvalTaskId: number,
  ): Promise<ApprovalTransactionResult> {
    this.logger.debug(`handleBackToPreviousNode`);

    const currentNodeKey = context.targetWorkflowNode.node_key;

    if (!context.workflowInstance.revision.flow_definition) {
      throw new Error(
        `Workflow revision ${context.workflowInstance.revision_id} has no flow_definition`,
      );
    }

    const flowDefinition = context.workflowInstance.revision
      .flow_definition as unknown as FlowDefinition;

    const possiblePreviousNodeKeys = new Set<string>();

    for (const node of flowDefinition.nodes) {
      if ('next' in node && node.next === currentNodeKey) {
        possiblePreviousNodeKeys.add(node.key);
      }

      if (node.type === NodeType.CONDITION && 'conditions' in node) {
        const conditionNode = node;
        for (const condition of conditionNode.conditions) {
          if (condition.next === currentNodeKey) {
            possiblePreviousNodeKeys.add(conditionNode.key);
            break;
          }
        }
      }
    }

    if (possiblePreviousNodeKeys.size === 0) {
      throw new BadRequestException(
        `No previous node found in flow definition for node '${currentNodeKey}'. Cannot go back from the first node.`,
      );
    }

    this.logger.debug(
      `Possible previous nodes from flow definition: ${Array.from(possiblePreviousNodeKeys).join(', ')}`,
    );

    const completedNodes =
      await this.instanceDataService.findWorkflowNodesByInstanceId(
        context.workflowInstance.id,
        context.workflowInstance.current_iteration,
        tx,
      );

    const executedPreviousNodes = completedNodes.filter(
      (node) =>
        node.status === NodeStatus.COMPLETED &&
        possiblePreviousNodeKeys.has(node.node_key) &&
        node.created_at < context.targetWorkflowNode.created_at,
    );

    if (executedPreviousNodes.length === 0) {
      throw new BadRequestException(
        'No executed previous node found. Cannot go back.',
      );
    }

    executedPreviousNodes.sort(
      (a, b) => b.created_at.getTime() - a.created_at.getTime(),
    );
    const previousNode = executedPreviousNodes[0];

    this.logger.debug(
      `Found previous node: ${previousNode.node_key} (created at ${previousNode.created_at.toISOString()})`,
    );

    return this.handleSendToSpecificNode(
      tx,
      context,
      approvalTaskId,
      previousNode.node_key,
    );
  }
}
