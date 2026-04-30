import { ApiProperty } from '@nestjs/swagger';
import { OrgUnitType } from '../../common/types/common.types';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class ListOrgQueryDto {
  @ApiProperty({
    enum: OrgUnitType,
    required: false,
    description:
      'Filter the application by OrgUnitType; API will return all if no filter',
  })
  @IsOptional()
  @IsEnum(OrgUnitType)
  filter?: OrgUnitType;

  @ApiProperty({
    required: false,
    description: 'Filter org units by partial name (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    required: false,
    description: 'Include soft-deleted org units in the response',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeleted?: boolean;
}
