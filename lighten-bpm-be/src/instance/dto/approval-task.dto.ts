import { ApiProperty } from '@nestjs/swagger';
import { ApprovalTask, ApprovalStatus } from '../../common/types/common.types';

export class ApprovalTaskDto {
  @ApiProperty({
    description: 'The ID of the approval task',
    required: true,
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'The ID of assigned user for the approval task',
    required: true,
  })
  assignee_id: number;

  @ApiProperty({
    description: 'The user id to whom the task is escalated',
    required: false,
  })
  escalated_to?: number;

  @ApiProperty({
    description: 'The status of the approval task',
    enum: ApprovalStatus,
  })
  status: ApprovalStatus;

  @ApiProperty({
    description:
      'Index into the approval node approvers array this task belongs to. ' +
      'Always 0 for single approval nodes; 0..N-1 for parallel approval nodes.',
  })
  approver_group_index: number;

  @ApiProperty({
    description: 'The create timestamp of the approval task',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'The update timestamp of the approval task',
    format: 'date-time',
  })
  updatedAt: Date;

  constructor(data: Partial<ApprovalTaskDto>) {
    Object.assign(this, data);
  }

  static fromPrisma(data: ApprovalTask): ApprovalTaskDto {
    return new ApprovalTaskDto({
      id: data.public_id,
      assignee_id: data.assignee_id,
      escalated_to: data.escalated_to ?? undefined,
      status: data.status,
      approver_group_index: data.approver_group_index,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  }
}
