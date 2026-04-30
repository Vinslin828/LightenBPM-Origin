import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsEnum, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { ValidationType } from '../../../common/types/common.types';

/**
 * Query DTO for filtering and paginating validation registry list
 */
export class GetValidationRegistryDto extends PaginationQueryDto {
  @ApiProperty({
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }): boolean | undefined => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value as boolean | undefined;
  })
  isActive?: boolean;

  @ApiProperty({
    required: false,
    enum: ValidationType,
    description: 'Filter by validation type',
  })
  @IsOptional()
  @IsEnum(ValidationType)
  validationType?: ValidationType;

  @ApiProperty({
    required: false,
    type: String,
    description:
      'Filter by component (returns validation rules that support this component)',
  })
  @IsOptional()
  @IsString()
  component?: string;

  @ApiProperty({
    required: false,
    type: String,
    description: 'Filter by name (partial match, case-insensitive)',
  })
  @IsOptional()
  @IsString()
  name?: string;
}
