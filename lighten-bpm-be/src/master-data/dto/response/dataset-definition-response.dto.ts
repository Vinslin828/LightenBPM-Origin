import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DatasetFieldDto } from '../create-dataset.dto';
import { ApiConfigDto } from '../api-config.dto';
import { DatasetFieldMappingsDto } from '../field-mapping.dto';

export class DatasetDefinitionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'VENDORS' })
  code: string;

  @ApiProperty({ example: 'Vendors List' })
  name: string;

  @ApiProperty({ type: [DatasetFieldDto] })
  fields: DatasetFieldDto[];

  @ApiProperty({ example: 'DATABASE', enum: ['DATABASE', 'EXTERNAL_API'] })
  source_type: string;

  @ApiPropertyOptional({ type: ApiConfigDto })
  api_config?: ApiConfigDto;

  @ApiPropertyOptional({ type: DatasetFieldMappingsDto })
  field_mappings?: DatasetFieldMappingsDto;

  @ApiProperty({ example: 'EMP001' })
  created_by: string;

  @ApiProperty({ example: 'EMP001' })
  updated_by: string;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  updated_at: Date;
}
