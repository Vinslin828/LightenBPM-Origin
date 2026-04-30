import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttachmentStatus } from '@prisma/client';

class UploadedByDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Robert Chen' })
  name: string;
}

export class AttachmentResponseDto {
  @ApiProperty({ example: 42 })
  id: number;

  @ApiProperty({ example: 'upload_receipt' })
  field_key: string;

  @ApiProperty({ example: 'invoice.pdf' })
  file_name: string;

  @ApiProperty({ example: 204800 })
  file_size: number;

  @ApiProperty({ example: 'application/pdf' })
  content_type: string;

  @ApiProperty({ enum: AttachmentStatus })
  status: AttachmentStatus;

  @ApiPropertyOptional({ example: 'SN-2026-0001' })
  serial_number?: string;

  @ApiPropertyOptional({ example: 'abc-123-uuid' })
  draft_id?: string;

  @ApiPropertyOptional({ example: 'March invoice' })
  remark?: string;

  @ApiProperty({ type: UploadedByDto })
  uploaded_by: UploadedByDto;

  @ApiPropertyOptional({
    example: 'Manager review',
    description:
      'Description of the workflow node the upload belongs to (start node for applicant uploads, approval node for approver uploads). Null when not configured.',
    nullable: true,
  })
  node_description: string | null;

  @ApiPropertyOptional({
    example: '5d2f1d96-94d4-44e9-bc97-8cf2c2a9f2ab',
    description:
      'Public ID of the approval task this upload was authorized under. Null for applicant uploads at the start node.',
    nullable: true,
  })
  approval_task_id: string | null;

  @ApiProperty({ example: '2026-03-17T08:00:00Z' })
  created_at: Date;
}
