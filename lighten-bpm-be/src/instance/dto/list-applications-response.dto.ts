import { ApiProperty } from '@nestjs/swagger';
import {
  ApprovalStatus,
  InstanceStatus,
} from '../../common/types/common.types';
import { IsEnum, IsOptional } from 'class-validator';
import { ApplicationInstanceDto } from './application.dto';
import { ApprovalTaskDto } from './approval-task.dto';

export class ListApplicationsResponseDto {
  @ApiProperty({
    description: 'Unique serial number of the application instance',
    example: 'APP-1761900579',
  })
  serial_number: string;

  @ApiProperty({
    description: 'Status of the application instance',
    enum: InstanceStatus,
    example: InstanceStatus.RUNNING,
  })
  @IsEnum(InstanceStatus)
  overallStatus: InstanceStatus; //workflow status

  @ApiProperty({
    description: 'approval status of relevent approval task',
    enum: ApprovalStatus,
    example: ApprovalStatus.PENDING,
  })
  @IsEnum(ApprovalStatus)
  approvalStatus?: ApprovalStatus;

  @ApiProperty({
    description: 'ID of the applicant user',
    example: 42,
  })
  applicantId: number;

  @ApiProperty({
    description: 'ID of the submitter user',
    example: 42,
  })
  submitterId: number;

  @ApiProperty({
    description: 'Name of the application form',
    example: 'Expense Reimbursement Form',
  })
  formName: string;

  @ApiProperty({
    description: 'Name of the workflow',
    example: 'Expense Approval Workflow',
  })
  workflowName: string;

  @ApiProperty({
    description: 'Timestamps when the application instance was created',
    example: '2023-10-01T12:34:56.789Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Timestamps when the application instance was submitted',
    example: '2023-10-02T09:00:00.000Z',
  })
  @IsOptional()
  submittedAt?: Date;

  @ApiProperty({
    description: 'Current approval task',
  })
  pendingApprovalTask?: ApprovalTaskDto;

  static fromApplicationInstanceDto(
    dto: ApplicationInstanceDto,
    approval?: ApprovalTaskDto,
  ): ListApplicationsResponseDto {
    const response = new ListApplicationsResponseDto();
    response.serial_number = dto.serial_number;
    response.overallStatus = dto.workflow_instance.status;
    response.applicantId = dto.workflow_instance.applicant.id;
    response.submitterId = dto.workflow_instance.submitter.id;
    response.formName = dto.form_instance.revision.name;
    response.workflowName = dto.workflow_instance.revision.name;
    response.createdAt = dto.workflow_instance.createdAt;
    response.submittedAt = dto.workflow_instance.appliedAt;
    response.approvalStatus = approval ? approval.status : undefined;
    response.pendingApprovalTask = approval;
    return response;
  }
}
