import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class PresignUploadRequestDto {
  @ApiProperty({
    description: 'The form component name',
    example: 'upload_receipt',
  })
  @IsString()
  @IsNotEmpty()
  field_key: string;

  @ApiProperty({ description: 'Original file name', example: 'invoice.pdf' })
  @IsString()
  @IsNotEmpty()
  file_name: string;

  @ApiProperty({
    description: 'MIME type of the file',
    example: 'application/pdf',
  })
  @IsString()
  @IsNotEmpty()
  content_type: string;

  @ApiProperty({ description: 'File size in bytes', example: 204800 })
  @IsInt()
  @Min(1)
  file_size: number;

  @ApiPropertyOptional({
    description:
      'Public ID of the approval task the upload is authorized under. Required when an approver uploads; omit for applicant uploads at the start node.',
    example: '5d2f1d96-94d4-44e9-bc97-8cf2c2a9f2ab',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  approval_task_id?: string;
}
