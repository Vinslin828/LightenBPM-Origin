import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  ValidateNested,
  IsDateString,
  IsNotEmpty,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrgUnitType, AssignType } from '../../common/types/common.types';

export class UserImportDto {
  @ApiProperty({ example: 'EMP001' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ required: false, example: 'auth0|123' })
  @IsOptional()
  @IsString()
  sub?: string;

  @ApiProperty({ required: false, example: 'user@example.com' })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  jobGrade: number;

  @ApiProperty({ example: 'DEPT001' })
  @IsString()
  @IsNotEmpty()
  defaultOrgCode: string;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;
}

export class OrgUnitImportDto {
  @ApiProperty({ example: 'DEPT001' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: 'Engineering' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: OrgUnitType, example: OrgUnitType.ORG_UNIT })
  @IsEnum(OrgUnitType)
  type: OrgUnitType;

  @ApiProperty({ required: false, example: 'PARENT001' })
  @IsOptional()
  @IsString()
  parentCode?: string;

  @ApiProperty({ required: false, example: false })
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;
}

export class OrgMembershipImportDto {
  @ApiProperty({ example: 'DEPT001' })
  @IsString()
  @IsNotEmpty()
  orgUnitCode: string;

  @ApiProperty({ example: 'EMP001' })
  @IsString()
  @IsNotEmpty()
  userCode: string;

  @ApiProperty({ enum: AssignType, example: AssignType.USER })
  @IsEnum(AssignType)
  assignType: AssignType;

  @ApiProperty({ example: '2023-01-01T00:00:00.000Z' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2099-12-31T00:00:00.000Z' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ required: false, example: 'Initial import' })
  @IsOptional()
  @IsString()
  note?: string;

  /**
   * @deprecated Will be removed in a future import version. The external system
   * should end memberships by sending a record with an explicit endDate instead.
   * When present and true, closes the matching active membership by setting its
   * endDate to now. Has no effect on historical (already-ended) records.
   */
  @ApiProperty({ required: false, example: false, deprecated: true })
  @IsOptional()
  @IsBoolean()
  isDeleted?: boolean;
}

export class BulkImportDto {
  @ApiProperty({ type: [UserImportDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserImportDto)
  users: UserImportDto[];

  @ApiProperty({ type: [OrgUnitImportDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrgUnitImportDto)
  orgUnits: OrgUnitImportDto[];

  @ApiProperty({ type: [OrgMembershipImportDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrgMembershipImportDto)
  memberships: OrgMembershipImportDto[];
}
