import { ApiProperty } from '@nestjs/swagger';
import { TagDto } from '../../tag/dto/tag.dto';
import {
  WorkflowRevisionDto,
  toWorkflowRevisionDto,
} from './workflow-revision.dto';
import {
  Workflow,
  WorkflowRevisions,
  WorkflowTag,
  Tag,
} from '../../common/types/common.types';
import { FormDto, toFormDto } from '../../form/dto/form.dto';
import { FormWithRevision } from '../../form/types';

export class WorkflowDto {
  @ApiProperty({
    description: 'The public ID of the workflow',
  })
  id: string;

  @ApiProperty({
    description: 'Indicates whether the workflow is currently active',
  })
  is_active: boolean;

  @ApiProperty({
    description: 'Current revision of the workflow',
    type: () => WorkflowRevisionDto,
  })
  revision: WorkflowRevisionDto;

  @ApiProperty({
    description: 'The tags associated with the workflow',
    type: () => [TagDto],
  })
  tags: TagDto[];

  @ApiProperty({
    description: 'The form binding to this workflow',
    type: () => FormDto,
  })
  bindingForm?: FormDto;

  @ApiProperty({
    description: 'Serial number prefix for applications in this workflow',
    example: 'APP',
  })
  serial_prefix: string;
}

export function toWorkflowDto(
  workflow: Workflow & { workflow_tags: (WorkflowTag & { tag: Tag })[] },
  revision: WorkflowRevisions,
  bindingForm?: FormWithRevision,
): WorkflowDto {
  const dto = new WorkflowDto();
  dto.id = workflow.public_id;
  dto.is_active = workflow.is_active;
  dto.serial_prefix = workflow.serial_prefix;
  dto.revision = toWorkflowRevisionDto(workflow, revision);
  dto.tags = workflow.workflow_tags.map((wt) => TagDto.fromPrisma(wt.tag));

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
