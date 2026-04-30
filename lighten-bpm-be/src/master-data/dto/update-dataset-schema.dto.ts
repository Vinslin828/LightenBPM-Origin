import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FieldType } from './create-dataset.dto';

export class AddFieldDto {
  @ApiPropertyOptional({ example: 'status' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/)
  name: string;

  @ApiPropertyOptional({ enum: FieldType, example: FieldType.TEXT })
  @IsEnum(FieldType)
  type: FieldType;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({
    description:
      'Default value for existing rows when adding a required (NOT NULL) column to a table with data.',
    example: 'active',
  })
  @IsOptional()
  default_value?: string | number | boolean;

  @ApiPropertyOptional({
    description: 'Adds a UNIQUE constraint to the column.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  unique?: boolean;
}

export class UpdateDatasetSchemaDto {
  @ApiPropertyOptional({ type: [AddFieldDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddFieldDto)
  add_fields?: AddFieldDto[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Field names to remove',
    example: ['old_column'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Matches(/^[a-z][a-z0-9_]*$/, { each: true })
  remove_fields?: string[];
}
