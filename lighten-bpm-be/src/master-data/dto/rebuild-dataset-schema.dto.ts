import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DatasetFieldDto } from './create-dataset.dto';

export class RebuildDatasetSchemaDto {
  @ApiProperty({
    type: [DatasetFieldDto],
    description: 'Complete new schema — replaces old schema entirely.',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DatasetFieldDto)
  fields: DatasetFieldDto[];

  @ApiProperty({
    description: 'Must be true to confirm permanent data loss.',
    example: true,
  })
  @IsBoolean()
  confirm_data_loss: boolean;
}
