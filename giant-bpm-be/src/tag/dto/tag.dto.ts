import { ApiProperty } from '@nestjs/swagger';
import { Tag } from '../../common/types/common.types';

export class TagDto {
  @ApiProperty({ description: 'The unique identifier of the tag' })
  id: number;

  @ApiProperty({ description: 'The name of the tag' })
  name: string;

  @ApiProperty({ description: 'The description of the tag', required: false })
  description?: string;

  @ApiProperty({ description: 'The color code of the tag', required: false })
  color?: string;

  @ApiProperty({ description: 'The ID of the user who created the tag' })
  createdBy: number;

  @ApiProperty({ description: 'The creation date of the tag' })
  createdAt: Date;

  constructor(data: Partial<TagDto>) {
    Object.assign(this, data);
  }

  static fromPrisma(tag: Tag): TagDto {
    return new TagDto({
      id: tag.id,
      name: tag.name,
      description: tag.description ?? undefined,
      color: tag.color ?? undefined,
      createdBy: tag.created_by,
      createdAt: tag.created_at,
    });
  }
}
