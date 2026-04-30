import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsObject,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
} from 'class-validator';
import { RevisionState } from '../../common/types/common.types';

export class CreateFormRevisionDto {
  @ApiProperty({
    description: 'The name of the form revision',
    example: 'My Awesome Form v2',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'A brief description of the form revision',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

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
    description: 'The status of the new form revision',
    enum: RevisionState,
    default: RevisionState.DRAFT,
  })
  @IsEnum(RevisionState)
  @IsOptional()
  status?: RevisionState;

  @ApiProperty({
    description: 'An array of tag IDs to associate with the form',
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tags?: number[];
}
