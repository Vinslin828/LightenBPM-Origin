import { ApiProperty } from '@nestjs/swagger';
import { PriorityLevel } from '../../common/types/common.types';
import {
  IsObject,
  IsOptional,
  IsEnum,
  IsNumber,
  IsString,
} from 'class-validator';

export class CreateApplicationInstanceDto {
  @ApiProperty({
    description: 'The ID of the form-workflow binding',
  })
  @IsNumber()
  binding_id: number;

  // @ApiProperty({
  //   description:
  //     'The public ID of the workflow to use. Required if the form is bound to multiple workflows.',
  //   required: false,
  //   format: 'uuid',
  // })
  // @IsUUID()
  // workflow_id: string;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  form_data: any;

  @ApiProperty({
    description: 'The draft ID of attachments to bind',
    required: false,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  draft_id?: string;

  @ApiProperty({
    description: 'Priority Level of application',
    required: false,
    default: PriorityLevel.NORMAL,
  })
  @IsOptional()
  @IsEnum(PriorityLevel)
  priority: PriorityLevel;

  @ApiProperty({
    description:
      'The ID of the applicant user. If not provided, the authenticated user is used as the applicant.',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  applicant_id?: number;
}
