import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';
import {
  Workflow,
  WorkflowRevisions,
  RevisionState,
} from '../../common/types/common.types';
import type { FlowDefinition } from '../../flow-engine/types';
import { FormDto, toFormDto } from '../../form/dto/form.dto';
import { FormWithRevision } from '../../form/types';
import { TagDto } from '../../tag/dto/tag.dto';

export class WorkflowRevisionDto {
  @ApiProperty({
    description: 'The public ID of the workflow revision',
  })
  revision_id: string;

  @ApiProperty({
    description: 'The public ID of the workflow',
  })
  workflow_id: string;

  @ApiProperty({
    description: 'The name of the workflow revision',
  })
  name: string;

  @ApiProperty({
    description: 'A brief description of the workflow revision',
    type: String,
    nullable: true,
  })
  description: string | null;

  @ApiProperty({
    description: 'The flow definition JSON of the workflow revision',
    type: 'object',
    nullable: true,
    additionalProperties: false,
    example: {
      version: 1,
      nodes: [
        { key: 'start', type: 'start', next: 'end' },
        { key: 'end', type: 'end' },
      ],
    },
  })
  @IsObject()
  flow_definition: FlowDefinition | null;

  @ApiProperty({
    description: 'The version number of the workflow',
  })
  version: number;

  @ApiProperty({
    description: 'The status of the workflow revision',
    enum: RevisionState,
  })
  status: RevisionState;

  @ApiProperty({
    description: 'The ID of the user who created the workflow revision',
  })
  created_by: number;

  @ApiProperty({
    description: 'The date and time when the workflow revision was created',
    format: 'date-time',
  })
  created_at: Date;

  @ApiProperty({
    description: 'The binding form details',
    type: () => FormDto,
  })
  bindingForm?: FormDto;
}

export function toWorkflowRevisionDto(
  workflow: Workflow,
  revision: WorkflowRevisions,
  bindingForm?: FormWithRevision,
): WorkflowRevisionDto {
  const dto = new WorkflowRevisionDto();
  dto.revision_id = revision.public_id;
  dto.workflow_id = workflow.public_id;
  dto.name = revision.name;
  dto.description = revision.description || null;
  dto.flow_definition = revision.flow_definition as unknown as FlowDefinition;
  dto.version = revision.version;
  dto.status = revision.state;
  dto.created_by = revision.created_by;
  dto.created_at = revision.created_at;
  if (bindingForm) {
    const formRevision = bindingForm.form_revisions
      ? bindingForm.form_revisions[0]
      : undefined;
    const tags =
      bindingForm?.form_tag.map((ft) => TagDto.fromPrisma(ft.tag)) ?? [];
    if (formRevision && formRevision.options) {
      dto.bindingForm = toFormDto(
        bindingForm,
        formRevision,
        formRevision.options,
        tags,
      );
    }
  }
  return dto;
}
