import { ApiProperty } from '@nestjs/swagger';
import { TagDto } from '../../tag/dto/tag.dto';

export class ListFormRespDto {
  @ApiProperty({
    description: 'The public ID of the form',
  })
  form_id: string;

  @ApiProperty({
    description: 'The public ID of current active form revision',
  })
  form_revision_id: string;

  @ApiProperty({
    description: 'The description of the form',
  })
  form_description?: string;

  @ApiProperty({
    description: 'The name of the form',
  })
  name: string;

  @ApiProperty({
    description: 'Indicates whether the form is currently active',
  })
  is_active: boolean;

  @ApiProperty({
    description: 'The date and time when the form was created',
    format: 'date-time',
  })
  created_at: Date;

  @ApiProperty({
    description: 'The tags associated with the form',
    type: () => [TagDto],
  })
  tags: TagDto[];
}
