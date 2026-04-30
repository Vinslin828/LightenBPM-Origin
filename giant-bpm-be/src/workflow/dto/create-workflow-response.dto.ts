import { ApiProperty } from '@nestjs/swagger';
import {
  Workflow,
  WorkflowRevisions,
  Tag,
} from '../../common/types/common.types';
import { TagDto } from '../../tag/dto/tag.dto';
import {
  WorkflowRevisionDto,
  toWorkflowRevisionDto,
} from './workflow-revision.dto';

export class CreateWorkflowResponseDto {
  @ApiProperty({
    description: 'The public ID of the workflow',
    format: 'uuid',
    example: '4fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  workflow_id: string;

  @ApiProperty({
    description: 'The initial workflow revision',
    type: () => WorkflowRevisionDto,
    example: {
      revision_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      workflow_id: '4fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'string',
      description: 'string',
      flow_definition: null,
      version: 1,
      status: 'DRAFT',
      created_by: 0,
      created_at: '2025-10-23T08:38:16.707Z',
    },
  })
  revision: WorkflowRevisionDto;

  @ApiProperty({
    description: 'The tags associated with the workflow',
    type: () => [TagDto],
  })
  tags: TagDto[];

  @ApiProperty({
    description: 'Indicates whether the workflow is currently active',
  })
  is_active: boolean;

  @ApiProperty({
    description: 'The timestamp when the workflow was created',
  })
  created_at: Date;
}

export function toCreateWorkflowResponseDto(
  workflow: Workflow & {
    workflow_tags: Array<{ tag: Tag }>;
    workflow_revisions: WorkflowRevisions[];
  },
): CreateWorkflowResponseDto {
  return {
    workflow_id: workflow.public_id,
    revision: toWorkflowRevisionDto(workflow, workflow.workflow_revisions[0]),
    tags: workflow.workflow_tags.map((wt) => TagDto.fromPrisma(wt.tag)),
    is_active: workflow.is_active,
    created_at: workflow.created_at,
  };
}
