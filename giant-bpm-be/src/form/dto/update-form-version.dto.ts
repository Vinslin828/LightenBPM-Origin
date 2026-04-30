import { ApiProperty } from '@nestjs/swagger';
import { RevisionState } from '../../common/types/common.types';
import {
  IsOptional,
  IsString,
  IsObject,
  IsDate,
  IsEnum,
} from 'class-validator';
import { FormOptionsDto } from './form-revision.dto';

export class UpdateFormRevisionDto {
  @ApiProperty({ description: 'The name of the form version', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'The description of the form version',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'The JSON schema for the form', required: false })
  @IsOptional()
  @IsObject()
  form_schema?: object;

  @ApiProperty({
    description: 'The validation logic of the form for frontend use',
    required: false,
  })
  @IsOptional()
  @IsObject()
  validation?: object;

  @ApiProperty({
    enum: RevisionState,
    description: 'The status of the form version',
    required: false,
  })
  @IsOptional()
  @IsEnum(RevisionState)
  status?: RevisionState;

  @ApiProperty({
    description: 'The date the form version becomes effective',
    required: false,
  })
  @IsOptional()
  @IsDate()
  effective_date?: Date;

  @ApiProperty({
    description: 'The date the form version is retired',
    required: false,
  })
  @IsOptional()
  @IsDate()
  retired_date?: Date;

  @ApiProperty({
    description: 'form options (can_withdraw, can_copy, etc.)',
    required: false,
    type: FormOptionsDto,
    additionalProperties: { type: 'boolean', description: 'option values' },
    default: {
      can_withdraw: true,
      can_copy: true,
      can_draft: true,
      can_delegate: false,
    },
  })
  @IsOptional()
  @IsObject()
  options?: {
    can_withdraw?: boolean;
    can_copy?: boolean;
    can_draft?: boolean;
    can_delegate?: boolean;
  };
}
