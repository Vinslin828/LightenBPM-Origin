import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GranteeType, PermissionAction } from '../../common/types/common.types';

export class CreateFormPermissionDto {
  @ApiProperty({ enum: GranteeType })
  @IsEnum(GranteeType)
  grantee_type: GranteeType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  grantee_value: string;

  @ApiProperty({ enum: PermissionAction })
  @IsEnum(PermissionAction)
  action: PermissionAction;
}

export class BatchCreateFormPermissionDto {
  @ApiProperty({ type: [CreateFormPermissionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormPermissionDto)
  permissions: CreateFormPermissionDto[];
}

export class FormPermissionDto extends CreateFormPermissionDto {
  @ApiProperty()
  @IsInt()
  id: number;

  @ApiProperty()
  @IsInt()
  form_id: number;
}

export class AggregatedPermissionActionDto {
  @ApiProperty()
  @IsInt()
  id: number;

  @ApiProperty({ enum: PermissionAction })
  @IsEnum(PermissionAction)
  action: PermissionAction;
}

export class AggregatedFormPermissionDto {
  @ApiProperty({ enum: GranteeType })
  @IsEnum(GranteeType)
  grantee_type: GranteeType;

  @ApiProperty()
  @IsString()
  grantee_value: string;

  @ApiProperty()
  @IsInt()
  form_id: number;

  @ApiProperty({ type: [AggregatedPermissionActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AggregatedPermissionActionDto)
  actions: AggregatedPermissionActionDto[];
}
