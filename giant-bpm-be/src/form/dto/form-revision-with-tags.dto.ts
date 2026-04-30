import { ApiProperty } from '@nestjs/swagger';
import { TagDto } from '../../tag/dto/tag.dto';
import {
  FormOptionsDto,
  FormRevisionDto,
  toFormRevisionDto,
} from './form-revision.dto';
import { FormRevision } from '../../common/types/common.types';

export class FormRevisionWithTagsDto extends FormRevisionDto {
  @ApiProperty({
    type: () => TagDto,
    isArray: true,
  })
  tags: TagDto[];
}

export function toFormRevisionWithTagsDto(
  form_uuid: string,
  formRevision: FormRevision,
  options: FormOptionsDto,
  tags: TagDto[],
): FormRevisionWithTagsDto {
  const formRevisionDto = toFormRevisionDto(form_uuid, formRevision, options);
  const dto = new FormRevisionWithTagsDto();
  Object.assign(dto, formRevisionDto);
  dto.tags = tags;

  return dto;
}
