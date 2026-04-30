import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class CreateFormWorkflowBindingDto {
  @ApiProperty()
  @IsString()
  @Length(12, 36)
  form_id: string;

  @ApiProperty()
  @IsString()
  @Length(12, 36)
  workflow_id: string;
}
