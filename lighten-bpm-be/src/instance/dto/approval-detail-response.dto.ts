import { ApiProperty, OmitType } from '@nestjs/swagger';
import { ApprovalTaskDto } from './approval-task.dto';
import { WorkflowCommentDto } from './workflow-comment.dto';
import { WorkflowNodeDto } from './workflow-node.dto';
import {
  ApprovalTask,
  WorkflowComment,
  User,
  WorkflowNode,
  PriorityLevel,
  InstanceStatus,
} from '../../common/types/common.types';
import { ApplicationInstanceDto } from './application.dto';
import { IsOptional } from 'class-validator';
import { JsonObject } from '@prisma/client/runtime/library';

export class BasicWorkflowNodeDto extends OmitType(WorkflowNodeDto, [
  'approvals',
] as const) {
  constructor(data: Partial<BasicWorkflowNodeDto>) {
    super();
    Object.assign(this, data);
  }

  static fromPrisma(node: WorkflowNode): BasicWorkflowNodeDto {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const dto = WorkflowNodeDto.fromPrisma({
      ...node,
      approval_tasks: [], // We don't need approvals here, pass empty array to satisfy type
    } as any);

    // Remove the approvals property from the result
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { approvals, ...basicDto } = dto;
    return new BasicWorkflowNodeDto(basicDto as Partial<BasicWorkflowNodeDto>);
  }
}

export class ApprovalDetailResponseDto {
  //Application
  @ApiProperty({
    description: 'application serial number',
    format: 'uuid',
  })
  serial_number: string;
  @ApiProperty({
    description: 'workflow instance id',
    format: 'uuid',
  })
  workflow_instance_id: string;
  @ApiProperty({
    description: 'name of the binding workflow',
  })
  workflow_name: string;
  @ApiProperty({
    description: 'description of the binding workflow',
  })
  @IsOptional()
  workflow_desc?: string;
  @ApiProperty({
    description: 'form instance objects (included form schema and form data)',
    format: 'uuid',
  })
  @ApiProperty({
    description: 'The priority of the application instance',
    enum: PriorityLevel,
  })
  application_priority: PriorityLevel;

  @ApiProperty({
    description: 'The overall status of the application',
    enum: InstanceStatus,
  })
  application_status: InstanceStatus;

  @ApiProperty({
    description: 'The date and time when the application instance was created',
    format: 'date-time',
  })
  application_createdAt: Date;

  @ApiProperty({
    description: 'The date and time when the application instance was applied',
    format: 'date-time',
    required: false,
  })
  application_appliedAt?: Date;

  @ApiProperty({
    description:
      'The date and time when the application instance was last updated',
    format: 'date-time',
  })
  application_updatedAt: Date;

  @ApiProperty({
    description:
      'The date and time when the application instance was completed',
    format: 'date-time',
    required: false,
  })
  applicaiton_completedAt?: Date;

  form_instance_id: string;
  @ApiProperty({
    description: 'name of the binding form',
  })
  form_name: string;
  @ApiProperty({
    description: 'description of the binding form',
  })
  @IsOptional()
  form_desc?: string;
  @ApiProperty({
    description: 'schema of target form',
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  form_schema: object | null;
  @ApiProperty({
    description: 'The data submitted in the form instance',
    type: 'object',
    additionalProperties: true,
  })
  form_data: object;
  @ApiProperty({
    description: 'workflow node contains target approval task',
    type: () => BasicWorkflowNodeDto,
  })
  workflow_node: BasicWorkflowNodeDto;
  @ApiProperty({
    description: 'target approval task',
    type: () => ApprovalTaskDto,
  })
  approval_task: ApprovalTaskDto;
  @ApiProperty({
    description: 'comments associated with approval task',
    type: () => WorkflowCommentDto,
    isArray: true,
  })
  comments: WorkflowCommentDto[];

  constructor(data: ApprovalDetailResponseDto) {
    Object.assign(this, data);
  }

  static fromPrisma(
    applicationInstance: ApplicationInstanceDto,
    approval: ApprovalTask,
    workflowNode: WorkflowNode & { approval_tasks: ApprovalTask[] },
    comments: (WorkflowComment & { author: User })[],
  ): ApprovalDetailResponseDto {
    return new ApprovalDetailResponseDto({
      serial_number: applicationInstance.serial_number,
      workflow_instance_id: applicationInstance.workflow_instance.id,
      workflow_name: applicationInstance.workflow_instance.revision.name,
      workflow_desc:
        applicationInstance.workflow_instance.revision.description ?? undefined,
      application_priority: applicationInstance.workflow_instance.priority,
      application_status: applicationInstance.workflow_instance.status,
      application_createdAt: applicationInstance.workflow_instance.createdAt,
      application_appliedAt: applicationInstance.workflow_instance.appliedAt,
      application_updatedAt: applicationInstance.workflow_instance.updatedAt,
      applicaiton_completedAt:
        applicationInstance.workflow_instance.completedAt,
      form_instance_id: applicationInstance.form_instance.id,
      form_name: applicationInstance.form_instance.revision.name,
      form_desc: applicationInstance.form_instance.revision.description,
      form_schema: applicationInstance.form_instance.revision.form_schema,
      form_data: applicationInstance.form_instance.form_data as JsonObject,
      approval_task: ApprovalTaskDto.fromPrisma(approval),
      workflow_node: BasicWorkflowNodeDto.fromPrisma(workflowNode),
      comments: comments.map((comment) =>
        WorkflowCommentDto.fromPrisma(comment, approval, comment.author),
      ),
    });
  }
}
