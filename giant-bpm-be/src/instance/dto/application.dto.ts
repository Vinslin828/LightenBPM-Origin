import { ApiProperty } from '@nestjs/swagger';
import {
  User as PrismaUser,
  WorkflowInstance as PrismaWorkflowInstance,
  WorkflowRevisions as PrismaWorkflowRevision,
  FormInstance as PrismaFormInstance,
  FormOptions as PrismaFormOptions,
  Workflow as PrismaWorkflow,
  FormWorkflowBinding,
  Workflow,
  WorkflowRevisions,
  FormRevision,
  Form,
  WorkflowEvent,
  InstanceStatus,
} from '../../common/types/common.types';
import { JsonObject, JsonValue } from '@prisma/client/runtime/library';
import { UserDto } from '../../user/dto/user.dto';
import { FormInstanceDto } from './form-instance.dto';
import { WorkflowInstanceDto } from './workflow-instance.dto';
import { toFormRevisionDto } from '../../form/dto/form-revision.dto';
import { toWorkflowRevisionDto } from '../../workflow/dto/workflow-revision.dto';
import { WorkflowNodeDto } from './workflow-node.dto';
import { IsOptional } from 'class-validator';
import * as FlowEngineTypes from '../../flow-engine/types';
import { sampleRouting } from './flow-routing.dto';

export class ApplicationInstanceDto {
  @ApiProperty({
    description: 'The serial number of the application instance',
  })
  serial_number: string;

  @ApiProperty({
    description:
      'The workflow Instance Object, which records current application execution data such as status, applicant...etc ',
    type: () => WorkflowInstanceDto,
  })
  workflow_instance: WorkflowInstanceDto;

  @ApiProperty({ type: () => FormInstanceDto })
  form_instance: FormInstanceDto;

  @ApiProperty({
    description:
      'The workflow nodes associated with the application instance for current user',
    type: () => [WorkflowNodeDto],
    isArray: true,
  })
  @IsOptional()
  workflow_nodes: WorkflowNodeDto[];

  @ApiProperty({
    description: 'workflow routing',
    example: sampleRouting,
  })
  @IsOptional()
  routing?: FlowEngineTypes.FlowRouting;

  constructor(data: Partial<ApplicationInstanceDto>) {
    Object.assign(this, data);
  }

  public static fromPrisma(
    data: PrismaFormInstance & {
      form_revision: FormRevision & {
        form: Form;
        options: PrismaFormOptions | null;
      };
      workflow_instance: PrismaWorkflowInstance & {
        applicant: PrismaUser;
        submitter: PrismaUser;
        revision: PrismaWorkflowRevision & { workflow: PrismaWorkflow };
        events?: WorkflowEvent[];
      };
      data_history?: {
        data: JsonValue;
        created_at: Date;
        created_by?: number;
      }[];
    },
    nodes?: WorkflowNodeDto[],
    routing?: FlowEngineTypes.FlowRouting,
  ): ApplicationInstanceDto {
    const { form_revision, workflow_instance, data_history } = data;
    const { applicant, submitter } = workflow_instance;

    // Use latest snapshot data if available
    const latestSnapshot =
      data_history && data_history.length > 0 ? data_history[0] : null;
    const formData = latestSnapshot ? latestSnapshot.data : {};
    const updatedAt = latestSnapshot
      ? latestSnapshot.created_at
      : (data.updated_at ?? new Date());

    const formInstanceDto: FormInstanceDto = {
      id: data.public_id,
      revision: toFormRevisionDto(
        form_revision.form.public_id,
        form_revision,
        form_revision.options as PrismaFormOptions,
      ),
      form_data: formData as JsonObject,
      updatedBy: latestSnapshot?.created_by ?? data.updated_by,
      updatedAt: updatedAt,
    };

    const workflowInstanceDto: WorkflowInstanceDto = {
      id: workflow_instance.public_id,
      revision: toWorkflowRevisionDto(
        workflow_instance.revision.workflow,
        workflow_instance.revision,
      ),
      applicant: UserDto.fromPrisma(applicant),
      submitter: UserDto.fromPrisma(submitter),
      status: workflow_instance.status,
      priority: workflow_instance.priority,
      appliedAt: workflow_instance.events?.find(
        (e) => e.event_type === 'SUBMIT',
      )?.created_at,
      createdAt: workflow_instance.created_at,
      updatedAt: workflow_instance.updated_at ?? new Date(),
      completedAt:
        workflow_instance.status === InstanceStatus.COMPLETED
          ? workflow_instance.updated_at
          : undefined,
      withdrawnAt: workflow_instance.events?.find(
        (e) => e.event_type === 'WITHDRAW',
      )?.created_at,
      withdrawnBy: undefined,
    };

    return new ApplicationInstanceDto({
      serial_number: workflow_instance.serial_number,
      form_instance: formInstanceDto,
      workflow_instance: workflowInstanceDto,
      workflow_nodes: nodes,
      routing,
    });
  }
}

export type appBindingDetails = FormWorkflowBinding & {
  workflow: Workflow & {
    workflow_revisions: WorkflowRevisions[];
  };
  form: Form & {
    form_revisions: FormRevision[];
  };
};

export class ApplicationDto {
  @ApiProperty({ description: 'binding id' })
  binding_id: number;

  @ApiProperty({ description: 'form id' })
  form_id: string;

  @ApiProperty({ description: 'the uuid of the latest availabe revision' })
  form_revision_id: string;

  @ApiProperty({ description: 'form name' })
  form_name: string;

  @ApiProperty({ description: 'form description' })
  form_desc: string;

  @ApiProperty({ description: 'workflow id' })
  workflow_id: string;

  @ApiProperty({ description: 'the uuid of the latest availabe revision' })
  workflow_revision_id: string;

  @ApiProperty({ description: 'workflow name' })
  workflow_name: string;

  @ApiProperty({ description: 'workflow description' })
  workflow_desc: string;

  constructor(data: Partial<ApplicationDto>) {
    Object.assign(this, data);
  }

  public static fromPrisma(binding: appBindingDetails): ApplicationDto {
    return new ApplicationDto({
      binding_id: binding.id,
      form_id: binding.form.public_id,
      form_revision_id: binding.form.form_revisions[0].public_id,
      form_name: binding.form.form_revisions[0].name,
      form_desc: binding.form.form_revisions[0].description ?? undefined,
      workflow_id: binding.workflow.public_id,
      workflow_revision_id: binding.workflow.workflow_revisions[0].public_id,
      workflow_name: binding.workflow.workflow_revisions[0].name,
      workflow_desc:
        binding.workflow.workflow_revisions[0].description ?? undefined,
    });
  }
}
