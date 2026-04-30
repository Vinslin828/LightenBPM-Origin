import { ApiProperty } from '@nestjs/swagger';
import { TagDto } from '../../tag/dto/tag.dto';
import { Optional } from '@nestjs/common';

export class ListWorkflowRespDto {
  @ApiProperty({
    description: 'The public ID of the workflow',
    format: 'uuid',
  })
  workflow_id: string;

  @ApiProperty({
    description: 'The name of the latest workflow revision',
  })
  name: string;

  @ApiProperty({
    description: 'The description of the latest workflow revision',
  })
  @Optional()
  description?: string;

  @ApiProperty({
    description: 'The latest revision uuid',
  })
  revisionId: string;

  @ApiProperty({
    description: 'The tags associated with the workflow',
    type: () => [TagDto],
  })
  tags: TagDto[];

  @ApiProperty({
    description: 'Indicates whether the workflow is active',
  })
  is_active: boolean;

  @ApiProperty({
    description: 'The date and time when the workflow was created',
    format: 'date-time',
  })
  created_at: Date;
}
