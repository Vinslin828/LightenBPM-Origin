import { ApiProperty } from '@nestjs/swagger';

export class PresignUploadResponseDto {
  @ApiProperty({ description: 'The S3 pre-signed URL to PUT the file to' })
  upload_url: string;

  @ApiProperty({ description: 'The generated S3 object key' })
  s3_key: string;

  @ApiProperty({ description: 'Seconds until URL expiration', example: 300 })
  expires_in: number;
}
