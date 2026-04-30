import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { OrgUnitType } from '../../common/types/common.types';

export class CreateOrgUnitDto {
  @ApiProperty({
    description: 'Unique code for the organization unit',
    example: 'd001',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: 'Name of the organization unit',
    example: 'Engineering Department',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Type of the organization unit',
    enum: OrgUnitType,
    example: OrgUnitType.ORG_UNIT,
  })
  @IsEnum(OrgUnitType)
  @IsNotEmpty()
  type: OrgUnitType;

  @ApiProperty({
    description: 'Code of the parent organization unit',
    example: 'd001',
    required: false,
  })
  @IsString()
  @IsOptional()
  parentCode?: string;
}
