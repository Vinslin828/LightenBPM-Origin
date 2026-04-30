import { ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiConfigDto } from './api-config.dto';
import { DatasetFieldMappingsDto } from './field-mapping.dto';

export class UpdateExternalConfigDto {
  @ApiPropertyOptional({ type: ApiConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ApiConfigDto)
  api_config?: ApiConfigDto;

  @ApiPropertyOptional({ type: DatasetFieldMappingsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => DatasetFieldMappingsDto)
  field_mappings?: DatasetFieldMappingsDto;
}
