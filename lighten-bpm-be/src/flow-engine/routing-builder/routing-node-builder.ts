import { WorkflowNodeDto } from 'src/instance/dto/workflow-node.dto';
import {
  RoutingNode,
  Node,
  NodeType,
  RoutingNodeStatus,
  ApprovalMethod,
  ApprovalRoutingNode,
  ApprovalNode,
  ApprovalGroup,
  ApproverConfig,
  ApproverType,
} from '../types';
import {
  ApprovalStatus,
  InstanceStatus,
  NodeStatus,
  User,
} from '../../common/types/common.types';
import {
  ConditionNodeExecutionResult,
  ConditionNodeExecutor,
} from '../execution/node-executors/condition-node.executor';
import { ApprovalNodeExecutor } from '../execution/node-executors/approval-node.executor';
import { Injectable, Logger } from '@nestjs/common';
import { UserService } from '../../user/user.service';

@Injectable()
export class RoutingNodeBuilder {
  private readonly logger = new Logger(RoutingNodeBuilder.name);

  constructor(
    private readonly conditionNodeExecutor: ConditionNodeExecutor,
    private readonly approvalNodeExecutor: ApprovalNodeExecutor,
    private readonly userService: UserService,
  ) {}
  // Implementation details would go here
  async build(
    flowStatus: InstanceStatus,
    parent_keys: string[],
    applicantId: number,
    formData: Record<string, any>,
    nodeDefinition: Node,
    instance?: WorkflowNodeDto,
    workflowInstanceId?: number,
  ): Promise<RoutingNode> {
    if (nodeDefinition.type == NodeType.CONDITION) {
      //handling conditinal node and findout all child nodes and return basic nodes
      try {
        const result: ConditionNodeExecutionResult =
          await this.conditionNodeExecutor.execute(
            nodeDefinition,
            formData,
            applicantId,
            workflowInstanceId,
          );
        return {
          key: nodeDefinition.key,
          type: NodeType.CONDITION,
          status: RoutingNodeStatus.COMPLETED,
          desc: nodeDefinition.description,
          parent_keys: parent_keys,
          child_keys: result.nextNodeKeys,
        };
      } catch (error) {
        // Fallback: return all possible branches when condition expression fails
        this.logger.error(
          `Failed to evaluate condition node ${nodeDefinition.key}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        const conditionNode = nodeDefinition;
        const allPossibleBranches = conditionNode.conditions
          .map((c) => c.next)
          .filter((next): next is string => !!next);
        return {
          key: nodeDefinition.key,
          type: NodeType.CONDITION,
          status: RoutingNodeStatus.COMPLETED,
          desc: nodeDefinition.description,
          parent_keys: parent_keys,
          child_keys: [...new Set(allPossibleBranches)], // dedupe
        };
      }
    } else if (nodeDefinition.type == NodeType.APPROVAL) {
      const approvalGroups = await this._getApprovalGroups(
        nodeDefinition,
        applicantId,
        formData,
        instance,
        workflowInstanceId,
      );
      const approvalNode: ApprovalRoutingNode = {
        key: nodeDefinition.key,
        type: nodeDefinition.type,
        status: this._getRoutingStatus(instance),
        desc:
          nodeDefinition.description ??
          (nodeDefinition.approval_method === ApprovalMethod.SINGLE
            ? nodeDefinition.approvers.description
            : undefined),
        parent_keys: parent_keys,
        child_keys: nodeDefinition.next ? [nodeDefinition.next] : undefined,
        approvalMethod: nodeDefinition.approval_method,
        approvalLogic:
          nodeDefinition.approval_method === ApprovalMethod.PARALLEL
            ? nodeDefinition.approval_logic
            : undefined,
        approvalGroups,
      };

      //return approval node
      return approvalNode;
    }

    //START/END Nodes
    return {
      key: nodeDefinition.key,
      type: nodeDefinition.type,
      status:
        nodeDefinition.type === NodeType.START
          ? this._getStartNodeStatus(flowStatus)
          : this._getEndNodeStatus(flowStatus),
      desc: nodeDefinition.description,
      parent_keys,
      child_keys: nodeDefinition.next ? [nodeDefinition.next] : undefined,
    };
  }

  _getStartNodeStatus(flowStatus: InstanceStatus): RoutingNodeStatus {
    if (flowStatus === InstanceStatus.DRAFT) {
      return RoutingNodeStatus.INACTIVE;
    }
    return RoutingNodeStatus.COMPLETED;
  }

  _getEndNodeStatus(flowStatus: InstanceStatus): RoutingNodeStatus {
    if (flowStatus === InstanceStatus.COMPLETED) {
      return RoutingNodeStatus.COMPLETED;
    }
    return RoutingNodeStatus.INACTIVE;
  }

  _getRoutingStatus(instance?: WorkflowNodeDto): RoutingNodeStatus {
    if (!instance) return RoutingNodeStatus.INACTIVE;
    switch (instance.status) {
      case NodeStatus.COMPLETED:
        return RoutingNodeStatus.COMPLETED;
      case NodeStatus.FAILED:
        return RoutingNodeStatus.FAILED;
      case NodeStatus.PENDING:
        return RoutingNodeStatus.PENDING;
    }
  }

  async _getApprovalGroups(
    nodeDefinition: ApprovalNode,
    applicantId: number,
    formData: Record<string, any>,
    instance?: WorkflowNodeDto,
    workflowInstanceId?: number,
  ): Promise<ApprovalGroup[]> {
    // Branch A: node not yet reached — resolve approvers and show WAITING
    if (!instance || instance.approvals.length === 0) {
      const approverGroups = await this.approvalNodeExecutor.resolveApprovers(
        nodeDefinition,
        applicantId,
        workflowInstanceId as number,
        formData,
      );
      return approverGroups.map((group) => ({
        approvals: group.users.map((user) => ({
          approvalTaskId: '',
          assignee: {
            ...user,
            default_org_id:
              user.default_org_id || user.resolved_default_org?.id || null,
          },
          status: ApprovalStatus.WAITING,
        })),
        isReportingLine: group.isSequential,
        desc: group.desc,
      }));
    }

    // Branch B: node executing or completed — tasks are the source of truth
    const tasksByGroup = new Map<number, typeof instance.approvals>();
    for (const task of instance.approvals) {
      const bucket = tasksByGroup.get(task.approver_group_index) ?? [];
      bucket.push(task);
      tasksByGroup.set(task.approver_group_index, bucket);
    }

    const allAssigneeIds = [
      ...new Set(instance.approvals.map((t) => t.assignee_id)),
    ];
    const users = await this.userService.findByIds(allAssigneeIds);
    const userMap = new Map(users.map((u) => [u.id, u]));

    const approversArray: ApproverConfig[] = Array.isArray(
      nodeDefinition.approvers,
    )
      ? nodeDefinition.approvers
      : [nodeDefinition.approvers];

    const groups: ApprovalGroup[] = [];
    for (const [groupIndex, tasks] of [...tasksByGroup.entries()].sort(
      ([a], [b]) => a - b,
    )) {
      const approverConfig = approversArray[groupIndex];
      const isSequential =
        approverConfig?.type === ApproverType.APPLICANT_REPORTING_LINE ||
        approverConfig?.type === ApproverType.SPECIFIC_USER_REPORTING_LINE;

      groups.push({
        approvals: [...tasks]
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
          .map((task) => {
            const user = userMap.get(task.assignee_id);
            return {
              approvalTaskId: task.id,
              assignee: user
                ? {
                    ...user,
                    default_org_id:
                      user.default_org_id ||
                      user.resolved_default_org?.id ||
                      null,
                  }
                : ({ id: task.assignee_id } as User),
              status: task.status,
            };
          }),
        isReportingLine: isSequential,
        desc: approverConfig?.description,
      });
    }

    return groups;
  }
}
