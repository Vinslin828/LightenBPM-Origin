import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class UploadedByDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Robert Chen' })
  name: string;
}

export class PendingUploadResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiPropertyOptional({ example: 'APP-1734299400000' })
  serial_number?: string;

  @ApiPropertyOptional({ example: 'abc-123-uuid' })
  draft_id?: string;

  @ApiProperty({ example: 'upload_receipt' })
  field_key: string;

  @ApiProperty({ example: 'attachments/uuid_invoice.pdf' })
  s3_key: string;

  @ApiProperty({ example: 'invoice.pdf' })
  file_name: string;

  @ApiProperty({ example: 204800 })
  file_size: number;

  @ApiProperty({ example: 'application/pdf' })
  content_type: string;

  @ApiProperty({ type: UploadedByDto })
  uploaded_by: UploadedByDto;

  @ApiProperty({ example: '2026-03-20T08:55:00Z' })
  created_at: Date;

  @ApiProperty({ example: '2026-03-20T09:00:00Z' })
  expires_at: Date;
}
