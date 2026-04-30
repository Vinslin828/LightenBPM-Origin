import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../../user/dto/user.dto';
import {
  WorkflowEvent,
  WorkflowInstance,
  InstanceStatus,
  PriorityLevel,
  WorkflowAction,
} from '../../common/types/common.types';
import { WorkflowRevisionDto } from '../../workflow/dto/workflow-revision.dto';

export class WorkflowInstanceDto {
  @ApiProperty({
    description: 'The UUID of the workflow instance',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'The workflow revision associated with the instance',
    type: () => WorkflowRevisionDto,
  })
  revision: WorkflowRevisionDto;

  @ApiProperty({ type: () => UserDto })
  applicant: UserDto;

  @ApiProperty({ type: () => UserDto })
  submitter: UserDto;

  @ApiProperty({
    description: 'The status of the application instance',
    enum: InstanceStatus,
  })
  status: InstanceStatus;

  @ApiProperty({
    description: 'The priority of the application instance',
    enum: PriorityLevel,
  })
  priority: PriorityLevel;

  @ApiProperty({
    description: 'The date and time when the application instance was applied',
    format: 'date-time',
    required: false,
  })
  appliedAt?: Date;

  @ApiProperty({
    description:
      'The date and time when the application instance was completed',
    format: 'date-time',
    required: false,
  })
  completedAt?: Date;

  @ApiProperty({
    description: 'The date and time when the application instance was created',
    format: 'date-time',
  })
  createdAt: Date;

  @ApiProperty({
    description:
      'The date and time when the application instance was last updated',
    format: 'date-time',
  })
  updatedAt: Date;

  @ApiProperty({
    description:
      'The date and time when the application instance was withdrawn',
    format: 'date-time',
    required: false,
  })
  withdrawnAt?: Date;

  @ApiProperty({ type: () => UserDto, required: false })
  withdrawnBy?: UserDto;

  constructor(data: Partial<WorkflowInstanceDto>) {
    Object.assign(this, data);
  }

  static fromPrisma(
    data: WorkflowInstance & {
      events?: Pick<WorkflowEvent, 'event_type' | 'created_at'>[];
    },
    revision: WorkflowRevisionDto,
    applicant: UserDto,
    submitter: UserDto,
    withdrawer?: UserDto,
  ): WorkflowInstanceDto {
    // Helper to find event timestamp
    const getEventDate = (type: WorkflowAction) =>
      data.events?.find((e) => e.event_type === type)?.created_at;

    return new WorkflowInstanceDto({
      id: data.public_id,
      revision: revision,
      applicant: applicant,
      submitter: submitter,
      status: data.status,
      priority: data.priority,
      appliedAt: getEventDate(WorkflowAction.SUBMIT) ?? undefined,
      completedAt:
        data.status === InstanceStatus.COMPLETED ? data.updated_at : undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at ?? undefined,
      withdrawnAt: getEventDate(WorkflowAction.WITHDRAW) ?? undefined,
      withdrawnBy: withdrawer,
    });
  }
}
