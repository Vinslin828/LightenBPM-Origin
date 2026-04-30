import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { GranteeType, PermissionAction } from '../types/common.types';

export class DeletePermissionsQueryDto {
  @ApiPropertyOptional({ enum: GranteeType })
  @IsEnum(GranteeType)
  @IsOptional()
  grantee_type?: GranteeType;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  grantee_value?: string;

  @ApiPropertyOptional({ enum: PermissionAction })
  @IsEnum(PermissionAction)
  @IsOptional()
  action?: PermissionAction;
}
