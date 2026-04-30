import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateFormPermissionDto } from './form-permission.dto';

export class CreateFormDto {
  @ApiProperty({
    description: 'The name of the form',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'A brief description of the form',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Indicates whether the form is a template',
    default: false,
  })
  @IsBoolean()
  is_template: boolean;

  @ApiProperty({
    description: 'The schema of the form',
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  form_schema?: object | undefined;

  @ApiProperty({
    description: 'The validation logic of the form for frontend use',
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  @IsObject()
  @IsOptional()
  validation?: object | undefined;

  @ApiProperty({
    description: 'An array of tag IDs to associate with the form',
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tags?: number[];

  @ApiProperty({
    description: 'Initial permissions for the form',
    type: [CreateFormPermissionDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateFormPermissionDto)
  permissions?: CreateFormPermissionDto[];
}
