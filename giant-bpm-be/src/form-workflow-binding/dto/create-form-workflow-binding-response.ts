import { ApiProperty } from '@nestjs/swagger';
import { FormRevisionWithTagsDto } from '../../form/dto/form-revision-with-tags.dto';
import { IsString, Length } from 'class-validator';

export class CreateFormWorkflowBindingResponseDto {
  @ApiProperty({
    description: 'Bining Record ID',
  })
  id: number;

  @ApiProperty()
  @IsString()
  @Length(12, 36)
  form_id: string;

  @ApiProperty()
  @IsString()
  @Length(12, 36)
  workflow_id: string;

  @ApiProperty({
    description: 'current form revision detail',
    type: () => FormRevisionWithTagsDto,
  })
  formRevision: FormRevisionWithTagsDto;
}
