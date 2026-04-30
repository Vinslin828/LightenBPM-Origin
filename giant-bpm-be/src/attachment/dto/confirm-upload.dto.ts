import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ConfirmUploadDto {
  @ApiProperty({ description: 'The S3 object key generated from presign step' })
  @IsString()
  @IsNotEmpty()
  s3_key: string;

  @ApiPropertyOptional({
    description: 'Optional user remark',
    example: 'March invoice',
  })
  @IsString()
  @IsOptional()
  remark?: string;
}
