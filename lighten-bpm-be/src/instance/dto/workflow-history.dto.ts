import { ApiProperty } from '@nestjs/swagger';
import {
  WorkflowEvent,
  WorkflowAction,
  InstanceStatus,
} from '../../common/types/common.types';

interface HistoryDetails {
  ipAddress?: string;
  remarks?: string;
}

export class WorkflowHistoryDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  workflowNodeId?: string;

  @ApiProperty({ example: 1 })
  actorId: number;

  @ApiProperty({ example: WorkflowAction.APPROVE })
  action: WorkflowAction;

  @ApiProperty({ enum: InstanceStatus, required: false })
  statusPrev?: InstanceStatus;

  @ApiProperty({ enum: InstanceStatus })
  statusNew: InstanceStatus;

  @ApiProperty({ example: '192.168.1.1', required: false })
  ipAddress?: string;

  @ApiProperty({ example: 'Approved the application', required: false })
  remarks?: string;

  @ApiProperty({ example: '2024-01-01T12:00:00Z' })
  createAt: Date;

  static fromPrisma(record: WorkflowEvent): WorkflowHistoryDto {
    const dto = new WorkflowHistoryDto();
    dto.actorId = record.actor_id;
    dto.action = record.event_type;
    dto.statusPrev = record.status_before ?? undefined;
    dto.statusNew = record.status_after;
    // Note: details might contain ipAddress or remarks
    const details = record.details as unknown as HistoryDetails;
    dto.ipAddress = details?.ipAddress;
    dto.remarks = details?.remarks;
    dto.createAt = record.created_at;
    return dto;
  }
}
