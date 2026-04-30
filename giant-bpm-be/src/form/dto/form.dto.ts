import { ApiProperty } from '@nestjs/swagger';
import { TagDto } from '../../tag/dto/tag.dto';
import { FormRevisionDto, toFormRevisionDto } from './form-revision.dto';
import {
  Form,
  FormOptions,
  FormRevision,
} from '../../common/types/common.types';

export class FormDto {
  @ApiProperty({
    description: 'The id of the form',
  })
  id: string;

  @ApiProperty({
    description: 'Is a form template',
  })
  is_template: boolean;

  @ApiProperty({
    description: 'Indicates whether the form is currently active',
  })
  is_active: boolean;

  @ApiProperty({
    description: 'current Reivision of the form',
    type: () => FormRevisionDto,
  })
  revision: FormRevisionDto;

  @ApiProperty({
    description: 'The tags associated with the form',
    type: () => [TagDto],
  })
  tags: TagDto[]; // Optional, as a form may not have any tags
}

export function toFormDto(
  form: Form,
  revision: FormRevision,
  form_options: FormOptions,
  tags: TagDto[],
): FormDto {
  const dto = new FormDto();
  dto.id = form.public_id;
  dto.is_template = form.is_template;
  dto.is_active = form.is_active;
  dto.revision = toFormRevisionDto(form.public_id, revision, form_options);
  dto.tags = tags;
  return dto;
}
