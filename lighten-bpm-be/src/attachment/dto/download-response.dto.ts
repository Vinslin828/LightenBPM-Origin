import { ApiProperty } from '@nestjs/swagger';

export class DownloadResponseDto {
  @ApiProperty({ description: 'The S3 pre-signed URL to GET the file' })
  download_url: string;

  @ApiProperty({ description: 'Original file name', example: 'invoice.pdf' })
  file_name: string;

  @ApiProperty({ description: 'Seconds until URL expiration', example: 300 })
  expires_in: number;
}
