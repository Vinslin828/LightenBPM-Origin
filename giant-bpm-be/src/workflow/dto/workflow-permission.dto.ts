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

export class CreateWorkflowPermissionDto {
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

export class BatchCreateWorkflowPermissionDto {
  @ApiProperty({ type: [CreateWorkflowPermissionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowPermissionDto)
  permissions: CreateWorkflowPermissionDto[];
}

export class WorkflowPermissionDto extends CreateWorkflowPermissionDto {
  @ApiProperty()
  @IsInt()
  id: number;

  @ApiProperty()
  @IsInt()
  workflow_id: number;
}

export class AggregatedPermissionActionDto {
  @ApiProperty()
  @IsInt()
  id: number;

  @ApiProperty({ enum: PermissionAction })
  @IsEnum(PermissionAction)
  action: PermissionAction;
}

export class AggregatedWorkflowPermissionDto {
  @ApiProperty({ enum: GranteeType })
  @IsEnum(GranteeType)
  grantee_type: GranteeType;

  @ApiProperty()
  @IsString()
  grantee_value: string;

  @ApiProperty()
  @IsInt()
  workflow_id: number;

  @ApiProperty({ type: [AggregatedPermissionActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AggregatedPermissionActionDto)
  actions: AggregatedPermissionActionDto[];
}
