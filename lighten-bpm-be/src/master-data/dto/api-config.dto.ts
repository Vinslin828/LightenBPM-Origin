import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsIn, IsOptional, IsObject, IsUrl } from 'class-validator';

export class ApiConfigDto {
  @ApiProperty({ example: 'https://api.example.com/vendors' })
  @IsString()
  @IsUrl({ require_tld: false })
  url: string;

  @ApiProperty({ example: 'GET', enum: ['GET', 'POST', 'PUT'] })
  @IsString()
  @IsIn(['GET', 'POST', 'PUT'])
  method: string;

  @ApiPropertyOptional({
    example: { Authorization: 'Bearer xxx' },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({ example: '{"key": "value"}' })
  @IsOptional()
  @IsString()
  body?: string;
}
