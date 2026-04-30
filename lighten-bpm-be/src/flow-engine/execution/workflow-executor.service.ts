import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  FlowDefinition,
  NodeType,
  ApprovalNode,
  ApprovalMethod,
  ApprovalLogic,
  ApproverType,
} from '../types';
import { getStartNode, findNodeByKey } from '../shared/flow/flow-utils';
import {
  ApprovalStatus,
  NodeResult,
  NodeStatus,
  WorkflowNode,
} from '../../common/types/common.types';
import { InstanceDataService } from '../../instance/instance-data.service';
import { StartNodeExecutor } from './node-executors/start-node.executor';
import { ConditionNodeExecutor } from './node-executors/condition-node.executor';
import { ApprovalNodeExecutor } from './node-executors/approval-node.executor';
import { FlowExecutionError, ErrorCode } from '../types';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';

export enum ExecutionStatus {
  COMPLETED = 'completed',
  WAITING_APPROVAL = 'waiting_approval',
  ERROR = 'error',
}

export interface ExecutionResult {
  success: boolean;
  status: ExecutionStatus;
  message?: string;
}

/**
 * Workflow Executor Service
 *
 * Core execution logic for workflow processing.
 * Orchestrates workflow execution by coordinating with repositories.
 */
@Injectable()
export class WorkflowExecutorService {
  private readonly logger = new Logger(WorkflowExecutorService.name);

  constructor(
    private readonly instanceDataService: InstanceDataService,
    private readonly startNodeExecutor: StartNodeExecutor,
    private readonly conditionNodeExecutor: ConditionNodeExecutor,
    private readonly approvalNodeExecutor: ApprovalNodeExecutor,
  ) {}

  /**
   * Gets the current node keys for a workflow instance (supports multiple parallel branches)
   * @param workflowInstanceId - The internal ID of the workflow instance
   * @param tx - Optional Prisma transaction client
   * @param startNodeKey - Optional node key to start execution from (overrides normal flow)
   * @returns Array of node keys to execute, or empty array if workflow is complete
   */
  async getCurrentNodes(
    workflowInstanceId: number,
    tx?: PrismaTransactionClient,
    startNodeKey?: string,
  ): Promise<string[]> {
    // Fetch workflow instance with its revision (containing flow_definition)
    const workflowInstance =
      await this.instanceDataService.findWorkflowInstanceWithRevisionById(
        workflowInstanceId,
        tx,
      );

    if (!workflowInstance) {
      throw new NotFoundException(
        `Workflow instance with id ${workflowInstanceId} not found`,
      );
    }

    if (!workflowInstance.revision.flow_definition) {
      throw new Error(
        `Workflow revision ${workflowInstance.revision_id} has no flow_definition`,
      );
    }

    const flowDefinition = workflowInstance.revision
      .flow_definition as unknown as FlowDefinition;

    // Fetch all workflow nodes for this instance
    // Pass tx to ensure we see uncommitted changes (e.g., updated current_iteration)
    const workflowNodes =
      await this.instanceDataService.findWorkflowNodesByInstanceId(
        workflowInstanceId,
        undefined,
        tx,
      );

    // Determine current nodes based on workflow state
    return this.determineCurrentNodes(
      workflowNodes,
      flowDefinition,
      startNodeKey,
    );
  }

  /**
   * Determines the current nodes based on workflow nodes and flow definition
   * Pure logic - separated for testability
   *
   * Logic:
   * - If startNodeKey provided → return startNodeKey (override normal flow)
   * - If no workflow_instance_nodes exist → start node
   * - If PENDING nodes exist → return all PENDING node keys
   * - If all nodes are COMPLETED → determine next nodes based on completed nodes
   *
   * @param workflowNodes - Array of workflow nodes from DB (sorted by created_at desc)
   * @param flowDefinition - The flow definition for the workflow
   * @param startNodeKey - Optional node key to start from (overrides normal flow determination)
   * @returns Array of node keys to execute, or empty array if workflow is complete
   */
  private determineCurrentNodes(
    workflowNodes: WorkflowNode[],
    flowDefinition: FlowDefinition,
    startNodeKey?: string,
  ): string[] {
    // If explicit start node provided, use it (for SEND_TO_SPECIFIC_NODE)
    if (startNodeKey) {
      return [startNodeKey];
    }
    // Case 1: No nodes exist → start node
    if (workflowNodes.length === 0) {
      const startNode = getStartNode(flowDefinition);
      return startNode ? [startNode.key] : [];
    }

    // Case 2: Check for PENDING approval nodes (may be multiple in parallel branches)
    const pendingNodes = workflowNodes.filter(
      (node) => node.status === NodeStatus.PENDING,
    );
    if (pendingNodes.length > 0) {
      return pendingNodes.map((node) => node.node_key);
    }

    // Case 3: All nodes completed → find next nodes
    const completedNodes = workflowNodes.filter(
      (node) => node.status === NodeStatus.COMPLETED,
    );

    if (completedNodes.length === 0) {
      // No completed nodes and no pending nodes → something went wrong
      return [];
    }

    // Get all unique next node keys from completed nodes
    // BUT exclude those next nodes that have already been executed
    const nextNodeKeys = new Set<string>();
    const executedNodeKeys = new Set(
      workflowNodes.map((node) => node.node_key),
    );

    for (const completedNode of completedNodes) {
      const nodeConfig = findNodeByKey(flowDefinition, completedNode.node_key);
      if (!nodeConfig) {
        continue;
      }

      // For nodes with a single 'next' property
      if ('next' in nodeConfig && nodeConfig.next) {
        // Only add if the next node hasn't been executed yet
        if (!executedNodeKeys.has(nodeConfig.next)) {
          nextNodeKeys.add(nodeConfig.next);
        }
      }
    }

    return Array.from(nextNodeKeys);
  }

  /**
   * Checks if execution should wait for other branches to reach the target node
   * Used for parallel condition branches that converge at a common node
   *
   * @param instanceId - Workflow instance ID
   * @param targetNodeKey - The node key we want to execute
   * @param flowDefinition - The flow definition
   * @param tx - Optional Prisma transaction client
   * @returns true if should wait, false if can proceed
   */
  private async shouldWaitForOtherBranches(
    instanceId: number,
    targetNodeKey: string,
    flowDefinition: FlowDefinition,
    tx?: PrismaTransactionClient,
  ): Promise<boolean> {
    // Find all predecessor nodes (nodes that point to targetNodeKey)
    const predecessors = this.findPredecessors(flowDefinition, targetNodeKey);

    if (predecessors.length <= 1) {
      // Not a convergence point, proceed directly
      return false;
    }

    // Check each predecessor path
    for (const predNodeKey of predecessors) {
      const needsWait = await this.checkPathNeedsWait(
        instanceId,
        predNodeKey,
        flowDefinition,
        new Set(),
        tx,
      );

      if (needsWait) {
        return true; // At least one path needs to wait
      }
    }

    return false; // All paths are OK to proceed
  }

  /**
   * Recursively checks if a path needs to wait
   * Traces back through the flow definition until finding a WorkflowNode or reaching START
   *
   * @param instanceId - Workflow instance ID
   * @param nodeKey - Current node key to check
   * @param flowDefinition - The flow definition
   * @param visited - Set of visited node keys (to avoid cycles)
   * @param tx - Optional Prisma transaction client
   * @returns true if this path needs to wait
   */
  private async checkPathNeedsWait(
    instanceId: number,
    nodeKey: string,
    flowDefinition: FlowDefinition,
    visited: Set<string>,
    tx?: PrismaTransactionClient,
  ): Promise<boolean> {
    // Avoid cycles
    if (visited.has(nodeKey)) {
      return false;
    }
    visited.add(nodeKey);

    const node = findNodeByKey(flowDefinition, nodeKey);
    if (!node) {
      return false;
    }

    // If reached START, this path is clear (either not taken or completed)
    if (node.type === NodeType.START) {
      return false;
    }

    // If CONDITION node, skip it and continue tracing back
    if (node.type === NodeType.CONDITION) {
      const conditionPreds = this.findPredecessors(flowDefinition, nodeKey);
      for (const predKey of conditionPreds) {
        const needsWait = await this.checkPathNeedsWait(
          instanceId,
          predKey,
          flowDefinition,
          visited,
          tx,
        );
        if (needsWait) {
          return true;
        }
      }
      return false;
    }

    // For other node types (APPROVAL, SUBFLOW, etc.), check WorkflowNode
    const workflowNode =
      await this.instanceDataService.findWorkflowNodeByInstanceAndKey(
        instanceId,
        nodeKey,
        undefined,
        tx,
      );

    if (!workflowNode) {
      // No WorkflowNode found, continue tracing back
      const nodePreds = this.findPredecessors(flowDefinition, nodeKey);
      for (const predKey of nodePreds) {
        const needsWait = await this.checkPathNeedsWait(
          instanceId,
          predKey,
          flowDefinition,
          visited,
          tx,
        );
        if (needsWait) {
          return true;
        }
      }
      return false; // Traced back without finding incomplete nodes = path not taken
    }

    // Found WorkflowNode, check its status
    if (workflowNode.status === NodeStatus.COMPLETED) {
      return false; // Already completed
    } else {
      return true; // Not completed yet, need to wait!
    }
  }

  /**
   * Finds all predecessor nodes that point to the target node
   *
   * @param flowDef - The flow definition
   * @param targetNodeKey - The target node key
   * @returns Array of predecessor node keys
   */
  private findPredecessors(
    flowDef: FlowDefinition,
    targetNodeKey: string,
  ): string[] {
    const predecessors: string[] = [];

    for (const node of flowDef.nodes) {
      if (node.type === NodeType.CONDITION) {
        // Check all condition branches
        for (const condition of node.conditions) {
          if (condition.next === targetNodeKey) {
            predecessors.push(node.key);
            break; // Same node only added once
          }
        }
      } else if ('next' in node && node.next === targetNodeKey) {
        predecessors.push(node.key);
      }
    }

    return predecessors;
  }

  /**
   * Checks if an approval node is completed based on approval tasks status
   * @param workflowNodeId - The workflow node ID
   * @param nodeConfig - The approval node configuration
   * @param tx - Optional Prisma transaction client
   * @returns True if the node is completed (all required approvals are done)
   */
  private async checkApprovalNodeCompletion(
    workflowNodeId: number,
    nodeConfig: ApprovalNode,
    tx?: PrismaTransactionClient,
  ): Promise<boolean> {
    // Get all approval tasks for this node
    const allTasks =
      await this.instanceDataService.findApprovalTasksByWorkflowNodeId(
        workflowNodeId,
        tx,
      );

    if (allTasks.length === 0) {
      return false; // No tasks created, cannot be completed
    }

    // Group tasks by approver_group_index
    const tasksByGroup = allTasks.reduce(
      (acc, task) => {
        const groupIndex = task.approver_group_index;
        if (!acc[groupIndex]) {
          acc[groupIndex] = [];
        }
        acc[groupIndex].push(task);
        return acc;
      },
      {} as Record<number, typeof allTasks>,
    );

    const groups = Object.values(tasksByGroup);

    // Check completion based on approval method and logic
    if (nodeConfig.approval_method === ApprovalMethod.SINGLE) {
      // SINGLE: Check if this is sequential (reporting_line) or non-sequential (role, specific_users, etc.)
      const isSequential =
        nodeConfig.approvers.type === ApproverType.APPLICANT_REPORTING_LINE ||
        nodeConfig.approvers.type === ApproverType.SPECIFIC_USER_REPORTING_LINE;

      if (isSequential) {
        // Sequential (reporting_line): All tasks must be APPROVED
        return allTasks.every(
          (task) => task.status === ApprovalStatus.APPROVED,
        );
      } else {
        // Non-sequential (role, specific_users, etc.): At least one APPROVED and no PENDING/WAITING
        const hasApproved = allTasks.some(
          (task) => task.status === ApprovalStatus.APPROVED,
        );
        const hasPendingOrWaiting = allTasks.some(
          (task) =>
            task.status === ApprovalStatus.PENDING ||
            task.status === ApprovalStatus.WAITING,
        );
        return hasApproved && !hasPendingOrWaiting;
      }
    } else {
      // PARALLEL: Check based on approval logic (AND/OR)
      // Each group may be sequential (reporting_line) or non-sequential (role, etc.)
      const completedGroupsCount = groups.filter((groupTasks, groupIndex) => {
        const approverConfig = nodeConfig.approvers[groupIndex];
        const isSequential =
          approverConfig.type === ApproverType.APPLICANT_REPORTING_LINE ||
          approverConfig.type === ApproverType.SPECIFIC_USER_REPORTING_LINE;

        if (isSequential) {
          // Sequential (reporting_line): ALL tasks in the group must be APPROVED
          return groupTasks.every(
            (task) => task.status === ApprovalStatus.APPROVED,
          );
        } else {
          // Non-sequential (role, specific_users, etc.): At least one APPROVED and no PENDING/WAITING
          const hasApproved = groupTasks.some(
            (task) => task.status === ApprovalStatus.APPROVED,
          );
          const hasPendingOrWaiting = groupTasks.some(
            (task) =>
              task.status === ApprovalStatus.PENDING ||
              task.status === ApprovalStatus.WAITING,
          );
          return hasApproved && !hasPendingOrWaiting;
        }
      }).length;

      if (nodeConfig.approval_logic === ApprovalLogic.AND) {
        // AND: All groups must be completed
        return completedGroupsCount === groups.length;
      } else {
        // OR: At least one group must be completed
        return completedGroupsCount > 0;
      }
    }
  }

  /**
   * Executes workflow from current node until reaching an approval node or end node
   * @param workflowInstanceId - The internal ID of the workflow instance
   * @param tx - Optional Prisma transaction client
   * @param startNodeKey - Optional node key to start execution from (used for SEND_TO_SPECIFIC_NODE)
   * @returns Execution result indicating the final state
   */
  async executeWorkflow(
    workflowInstanceId: number,
    tx?: PrismaTransactionClient,
    startNodeKey?: string,
  ): Promise<ExecutionResult> {
    this.logger.debug(
      `executeWorkflow, workflowInstanceId: ${workflowInstanceId}`,
    );

    // Fetch workflow instance with revision
    const workflowInstance =
      await this.instanceDataService.findWorkflowInstanceWithRevisionById(
        workflowInstanceId,
        tx,
      );

    if (!workflowInstance) {
      throw new NotFoundException(
        `Workflow instance with id ${workflowInstanceId} not found`,
      );
    }

    if (!workflowInstance.revision.flow_definition) {
      throw new Error(
        `Workflow revision ${workflowInstance.revision_id} has no flow_definition`,
      );
    }

    const flowDefinition = workflowInstance.revision
      .flow_definition as unknown as FlowDefinition;

    // Fetch form data
    const formInstance =
      await this.instanceDataService.findFormInstanceByWorkflowInstanceId(
        workflowInstanceId,
        tx,
      );

    if (!formInstance) {
      throw new Error(
        `Form instance not found for workflow instance ${workflowInstanceId}`,
      );
    }

    const formData = (formInstance.data_history?.[0]?.data ?? {}) as Record<
      string,
      any
    >;

    // Get the node(s) to begin/resume execution from
    const currentNodeKeys = await this.getCurrentNodes(
      workflowInstanceId,
      tx,
      startNodeKey,
    );
    this.logger.debug(`current node keys: ${JSON.stringify(currentNodeKeys)}`);

    if (currentNodeKeys.length === 0) {
      return {
        success: true,
        status: ExecutionStatus.COMPLETED,
        message: 'Workflow already completed',
      };
    }

    // Use queue to support parallel branches
    const nodesToProcess: string[] = [...currentNodeKeys];
    let hasWaitingApproval = false;

    // Process nodes until queue is empty
    while (nodesToProcess.length > 0) {
      const currentNodeKey = nodesToProcess.shift()!;
      const nodeConfig = findNodeByKey(flowDefinition, currentNodeKey);

      if (!nodeConfig) {
        throw new FlowExecutionError(
          `Node with key '${currentNodeKey}' not found in flow definition`,
          ErrorCode.EXEC_NODE_NOT_FOUND,
          { nodeKey: currentNodeKey },
        );
      }

      this.logger.debug(
        `process node key: ${currentNodeKey}, node type: ${nodeConfig.type}`,
      );

      // Check if we need to wait for other branches before executing this node
      const shouldWait = await this.shouldWaitForOtherBranches(
        workflowInstanceId,
        currentNodeKey,
        flowDefinition,
        tx,
      );

      if (shouldWait) {
        // Need to wait for other branches to complete, skip this node for now
        // Continue processing other nodes in the queue
        this.logger.debug('wait other branches');
        continue;
      }

      // Execute node based on type
      switch (nodeConfig.type) {
        case NodeType.START: {
          const result = this.startNodeExecutor.execute(nodeConfig);
          this.logger.debug(`add node key: ${result.nextNodeKey} to process`);
          nodesToProcess.push(result.nextNodeKey);
          break;
        }

        case NodeType.CONDITION: {
          const result = await this.conditionNodeExecutor.execute(
            nodeConfig,
            formData,
            workflowInstance.applicant_id,
            workflowInstanceId,
          );

          if (result.nextNodeKeys.length === 0) {
            throw new FlowExecutionError(
              'Condition node returned no branches',
              ErrorCode.NO_CONDITION_MATCHED,
              { nodeKey: nodeConfig.key },
            );
          }

          // Add all branches to queue for parallel execution
          this.logger.debug(
            `add node key: ${JSON.stringify(result.nextNodeKeys)} to process`,
          );
          nodesToProcess.push(...result.nextNodeKeys);
          break;
        }

        case NodeType.APPROVAL: {
          // Check if this approval node already exists (already created before)
          const existingNode =
            await this.instanceDataService.findWorkflowNodeByInstanceAndKey(
              workflowInstanceId,
              currentNodeKey,
              undefined,
              tx,
            );

          if (existingNode) {
            // === Non-first time: approval node already exists ===
            if (existingNode.status === NodeStatus.COMPLETED) {
              // Approval completed, continue to next node
              this.logger.debug(`add node key: ${nodeConfig.next} to process`);
              nodesToProcess.push(nodeConfig.next);
            } else {
              // Still waiting for approval (PENDING)
              // Don't add next node to queue, this branch stops here
              hasWaitingApproval = true;
            }
          } else {
            // === First time: create approval node and tasks ===
            await this.approvalNodeExecutor.execute(
              nodeConfig,
              workflowInstanceId,
              workflowInstance.applicant_id,
              formData,
              tx,
            );

            // Check if all approval tasks were auto-approved
            const createdNode =
              await this.instanceDataService.findWorkflowNodeByInstanceAndKey(
                workflowInstanceId,
                currentNodeKey,
                undefined,
                tx,
              );

            if (!createdNode) {
              throw new FlowExecutionError(
                `Workflow node ${currentNodeKey} not found after creation`,
                ErrorCode.EXEC_NODE_NOT_FOUND,
                { nodeKey: currentNodeKey },
              );
            }

            const isNodeCompleted = await this.checkApprovalNodeCompletion(
              createdNode.id,
              nodeConfig,
              tx,
            );

            if (isNodeCompleted) {
              // All tasks auto-approved, complete the node and continue
              await this.instanceDataService.updateWorkflowNodeStatus(
                createdNode.id,
                NodeStatus.COMPLETED,
                NodeResult.APPROVED,
                tx,
              );
              this.logger.log(
                `Approval node ${currentNodeKey} auto-completed, adding next node: ${nodeConfig.next}`,
              );
              nodesToProcess.push(nodeConfig.next);
            } else {
              // Some tasks are still pending, wait for approval
              hasWaitingApproval = true;
            }
          }
          break;
        }

        case NodeType.END:
          // This branch reached the end, don't add anything to queue
          break;

        default:
          throw new FlowExecutionError(
            `Unknown node type: ${nodeConfig.type}`,
            ErrorCode.EXEC_NODE_NOT_FOUND,
            { nodeType: nodeConfig.type },
          );
      }
    }

    // All nodes processed
    if (hasWaitingApproval) {
      return {
        success: true,
        status: ExecutionStatus.WAITING_APPROVAL,
        message: 'Workflow has branches waiting for approval',
      };
    }

    return {
      success: true,
      status: ExecutionStatus.COMPLETED,
      message: 'Workflow completed successfully',
    };
  }
}
