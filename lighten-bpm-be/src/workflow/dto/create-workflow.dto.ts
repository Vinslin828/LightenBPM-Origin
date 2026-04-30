import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateWorkflowPermissionDto } from './workflow-permission.dto';

export class CreateWorkflowDto {
  @ApiProperty({
    description: 'The name of the workflow',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'A brief description of the workflow',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Config workflow active or not; Default True',
    required: false,
  })
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'An array of tag IDs to associate with the workflow',
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tags?: number[];

  @ApiProperty({
    description: 'Initial permissions for the workflow',
    type: [CreateWorkflowPermissionDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWorkflowPermissionDto)
  permissions?: CreateWorkflowPermissionDto[];
}
