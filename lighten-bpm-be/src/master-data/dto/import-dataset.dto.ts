import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsObject, IsOptional } from 'class-validator';
import { CreateDatasetDto } from './create-dataset.dto';

export class ImportDefinitionDto {
  @ApiProperty({ type: CreateDatasetDto })
  @IsObject()
  definition: CreateDatasetDto & {
    created_by?: string;
    updated_by?: string;
    /** ISO 8601 date string */
    created_at?: string;
  };

  /** @deprecated Silently ignored. Use CSV import for records. */
  @ApiPropertyOptional({
    type: 'array',
    items: { type: 'object' },
    description:
      'Deprecated — silently discarded. Use POST /:code/records/import-csv instead.',
  })
  @IsOptional()
  @IsArray()
  records?: unknown[];
}
