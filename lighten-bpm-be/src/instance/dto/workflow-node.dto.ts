import { ApiProperty } from '@nestjs/swagger';
import {
  ApprovalTask,
  WorkflowNode,
  NodeResult,
  NodeStatus,
  NodeType,
} from '../../common/types/common.types';
import { WorkflowInstanceDto } from './workflow-instance.dto';
import { ApprovalTaskDto } from './approval-task.dto';

export class WorkflowNodeDto {
  @ApiProperty({
    description: 'The public UUID of the workflow node',
  })
  id: string;

  @ApiProperty({
    description: 'The key of the workflow node',
  })
  node_key: string;

  @ApiProperty({
    description:
      'The subflow instance associated with the workflow node, if any',
    type: () => WorkflowInstanceDto,
    required: false,
  })
  subflow_instance?: WorkflowInstanceDto;

  @ApiProperty({
    description: 'The type of the workflow node',
    enum: NodeType,
  })
  node_type: NodeType;

  @ApiProperty({
    description: 'The status of the workflow node',
    enum: NodeStatus,
  })
  status: NodeStatus;

  @ApiProperty({
    description: 'The result of the workflow node, if applicable',
    enum: NodeResult,
    required: false,
  })
  result?: NodeResult;

  @ApiProperty({
    description: 'The start timestamp of the workflow node',
    format: 'date-time',
    required: false,
  })
  startedAt?: Date;

  @ApiProperty({
    description: 'The completion timestamp of the workflow node',
    format: 'date-time',
    required: false,
  })
  completedAt?: Date;

  @ApiProperty({
    description: 'The due date of the workflow node',
    format: 'date-time',
    required: false,
  })
  dueDate?: Date;

  @ApiProperty({
    description: 'The creation timestamp of the workflow node',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The last updated timestamp of the workflow node',
    format: 'date-time',
    required: false,
  })
  updatedAt?: Date;

  @ApiProperty({
    description: 'The approval tasks associated with the workflow node',
    type: () => [ApprovalTaskDto],
  })
  approvals: ApprovalTaskDto[];

  constructor(data: Partial<WorkflowNodeDto>) {
    Object.assign(this, data);
  }

  static fromPrisma(
    node: WorkflowNode & { approval_tasks: ApprovalTask[] },
  ): WorkflowNodeDto {
    return new WorkflowNodeDto({
      id: node.public_id,
      node_key: node.node_key,
      node_type: node.node_type,
      status: node.status,
      result: node.result ?? undefined,
      startedAt: node.started_at ?? undefined,
      completedAt: node.completed_at ?? undefined,
      dueDate: node.due_date ?? undefined,
      createdAt: node.created_at,
      updatedAt: node.updated_at ?? undefined,
      approvals: node.approval_tasks.map((task) =>
        ApprovalTaskDto.fromPrisma(task),
      ),
    });
  }
}
