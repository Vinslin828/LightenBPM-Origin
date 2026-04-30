import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  ValidateNested,
  IsBoolean,
  IsEnum,
  Matches,
  ArrayMaxSize,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiConfigDto } from './api-config.dto';
import { DatasetFieldMappingsDto } from './field-mapping.dto';

export enum FieldType {
  TEXT = 'TEXT',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  DATE = 'DATE',
}

export enum SourceType {
  DATABASE = 'DATABASE',
  EXTERNAL_API = 'EXTERNAL_API',
}

export class DatasetFieldDto {
  @ApiProperty({ example: 'vendor_name' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/)
  name: string;

  @ApiProperty({ enum: FieldType, example: FieldType.TEXT })
  @IsEnum(FieldType)
  type: FieldType;

  @ApiProperty({ example: true })
  @IsBoolean()
  required: boolean;

  @ApiPropertyOptional({
    description: 'Default value applied when this field is omitted on insert.',
    example: 'pending',
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

export class CreateDatasetDto {
  @ApiProperty({ example: 'VENDORS' })
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/)
  code: string;

  @ApiProperty({ example: 'Vendors List' })
  @IsString()
  name: string;

  @ApiProperty({ type: [DatasetFieldDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => DatasetFieldDto)
  fields: DatasetFieldDto[];

  @ApiPropertyOptional({
    enum: SourceType,
    default: SourceType.DATABASE,
    description:
      'Data source type. DATABASE for stored data, EXTERNAL_API for external API-backed datasets.',
  })
  @IsOptional()
  @IsEnum(SourceType)
  source_type?: SourceType;

  @ApiPropertyOptional({
    type: ApiConfigDto,
    description: 'Required when source_type is EXTERNAL_API',
  })
  @ValidateIf(
    (o: CreateDatasetDto) => o.source_type === SourceType.EXTERNAL_API,
  )
  @ValidateNested()
  @Type(() => ApiConfigDto)
  api_config?: ApiConfigDto;

  @ApiPropertyOptional({
    type: DatasetFieldMappingsDto,
    description: 'Required when source_type is EXTERNAL_API',
  })
  @ValidateIf(
    (o: CreateDatasetDto) => o.source_type === SourceType.EXTERNAL_API,
  )
  @ValidateNested()
  @Type(() => DatasetFieldMappingsDto)
  field_mappings?: DatasetFieldMappingsDto;
}
