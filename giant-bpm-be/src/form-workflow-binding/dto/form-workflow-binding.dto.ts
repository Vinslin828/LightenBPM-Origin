import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Length } from 'class-validator';

export class FormWorkflowBindingDto {
  @ApiProperty({ description: 'The ID of the binding record' })
  @IsInt()
  id: number;

  @ApiProperty()
  @IsString()
  @Length(12, 36)
  form_id: string;

  @ApiProperty()
  @IsString()
  @Length(12, 36)
  workflow_id: string;

  constructor(id: number, formId: string, workflowId: string) {
    this.id = id;
    this.form_id = formId;
    this.workflow_id = workflowId;
  }
}
