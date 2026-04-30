import { ApiProperty } from '@nestjs/swagger';
import {
  Form,
  FormRevision,
  FormOptions,
  Tag,
} from '../../common/types/common.types';
import { TagDto } from '../../tag/dto/tag.dto';
import { FormRevisionDto, toFormRevisionDto } from './form-revision.dto';

export class CreateFormResponseDto {
  @ApiProperty({
    description: 'The public ID of the form',
  })
  form_id: string;

  @ApiProperty({
    description: 'The initial form revision',
    type: () => FormRevisionDto,
    example: {
      revision_id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      form_id: '4fa85f64-5717-4562-b3fc-2c963f66afa6',
      name: 'string',
      description: 'string',
      form_schema: null,
      version: 1,
      status: 'DRAFT',
      effective_date: undefined,
      retired_date: undefined,
      created_by: 0,
      created_at: '2025-10-23T08:38:16.707Z',
      options: {
        can_withdraw: true,
        can_copy: true,
        can_draft: true,
        can_delegate: false,
      },
    },
  })
  revision: FormRevisionDto;

  @ApiProperty({
    description: 'Is a form template',
  })
  is_template: boolean;

  @ApiProperty({
    description: 'Indicates whether the form is currently active',
  })
  is_active: boolean;

  @ApiProperty({
    description: 'The tags associated with the form',
    type: () => [TagDto],
  })
  tags: TagDto[];

  @ApiProperty({
    description: 'The timestamp when the form was created',
  })
  created_at: Date;
}

export function toCreateFormResponseDto(
  form: Form & {
    form_tag: Array<{ tag: Tag }>;
    form_revisions: Array<FormRevision & { options: FormOptions | null }>;
  },
): CreateFormResponseDto {
  const revision = form.form_revisions[0];
  return {
    form_id: form.public_id,
    revision: toFormRevisionDto(
      form.public_id,
      revision,
      revision.options || {
        can_withdraw: true,
        can_copy: true,
        can_draft: true,
        can_delegate: false,
      },
    ),
    is_template: form.is_template,
    is_active: form.is_active,
    tags: form.form_tag.map((ft) => TagDto.fromPrisma(ft.tag)),
    created_at: form.created_at,
  };
}
