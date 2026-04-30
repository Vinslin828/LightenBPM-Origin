import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, ValidateNested, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class FieldMappingEntryDto {
  @ApiProperty({
    example: 'vendor_name',
    description: 'Target field name in the dataset',
  })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/)
  field_name: string;

  @ApiProperty({
    example: 'data.name',
    description: 'Dot-notation JSON path from the source record',
  })
  @IsString()
  json_path: string;
}

export class DatasetFieldMappingsDto {
  @ApiProperty({
    example: 'data.items',
    description:
      'Dot-notation path to the array of records in the API response. Use empty string for root array.',
  })
  @IsString()
  records_path: string;

  @ApiProperty({ type: [FieldMappingEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingEntryDto)
  mappings: FieldMappingEntryDto[];
}
