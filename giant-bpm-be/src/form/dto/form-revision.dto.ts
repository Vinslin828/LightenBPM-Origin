import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';
import {
  FormOptions,
  FormRevision,
  RevisionState,
} from '../../common/types/common.types';

export class FormOptionsDto implements Partial<FormOptions> {
  @ApiProperty({
    description: 'Indicates if the form can be withdrawn',
  })
  can_withdraw: boolean;

  @ApiProperty({
    description: 'Indicates if the form can be copied',
  })
  can_copy: boolean;

  @ApiProperty({
    description: 'Indicates if the form can be saved as draft',
  })
  can_draft: boolean;

  @ApiProperty({
    description: 'Indicates if the form can be delegated',
  })
  can_delegate: boolean;
}

export class FormRevisionDto {
  @ApiProperty({
    description: 'The uuid of specific form_revision',
  })
  revision_id: string;

  @ApiProperty({
    description: 'The ID of the form',
  })
  form_id: string;

  @ApiProperty({
    description: 'The name of the form',
  })
  name: string;

  @ApiProperty({
    description: 'A brief description of the form',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'The schema of the form',
    type: 'object',
    nullable: true,
    additionalProperties: true, // Allows any properties in the object
  })
  @IsObject()
  form_schema: object | null;

  @ApiProperty({
    description: 'The validation logic of the form for frontend use',
    type: 'object',
    nullable: true,
    additionalProperties: true,
  })
  @IsObject()
  validation: object | null;

  @ApiProperty({
    description: 'The version number of the form',
  })
  version: number;

  @ApiProperty({
    description: 'The status of the form revision',
    enum: RevisionState,
  })
  status: RevisionState;

  @ApiProperty({
    description: 'The effective date of the form',
    format: 'date-time',
  })
  @IsOptional()
  effective_date?: Date;

  @ApiProperty({
    description: 'The date when the form was retired, if applicable',
    format: 'date-time',
    required: false,
  })
  @IsOptional()
  retired_date?: Date;

  @ApiProperty({
    description: 'The ID of the user who created the form',
  })
  created_by: number;

  @ApiProperty({
    description: 'The date and time when the form was created',
    format: 'date-time',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Options of Form Revision',
    type: () => FormOptionsDto,
  })
  options: FormOptionsDto;
}

export function toFormRevisionDto(
  form_uuid: string,
  formRevision: FormRevision,
  options: FormOptionsDto,
): FormRevisionDto {
  const dto = new FormRevisionDto();
  dto.revision_id = formRevision.public_id;
  dto.form_id = form_uuid;
  dto.name = formRevision.name;
  dto.description = formRevision.description || undefined;
  dto.form_schema = formRevision.form_schema
    ? (formRevision.form_schema as object)
    : null;
  dto.validation = formRevision.fe_validation
    ? (formRevision.fe_validation as object)
    : null;
  dto.version = formRevision.version;
  dto.status = formRevision.state;
  dto.effective_date = formRevision.effective_date || undefined;
  dto.retired_date = formRevision.retired_date || undefined;
  dto.created_by = formRevision.created_by;
  dto.created_at = formRevision.created_at;
  dto.options = options;
  return dto;
}
