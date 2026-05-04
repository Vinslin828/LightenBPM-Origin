import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CallExternalApiDto {
  @ApiProperty({
    description: 'The URL of the external API to call',
    example: 'https://api.example.com/data',
  })
  @IsString()
  @IsUrl({ require_tld: false })
  url: string;

  @ApiPropertyOptional({
    description: 'HTTP method',
    enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    default: 'GET',
  })
  @IsOptional()
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  @ApiPropertyOptional({
    description: 'Query parameters to append to the URL',
    example: { id: '123', type: 'active' },
  })
  @IsOptional()
  @IsObject()
  params?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'HTTP headers to include in the request',
    example: { Authorization: 'Bearer token', Accept: 'application/json' },
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Request body (will be JSON-serialized)',
  })
  @IsOptional()
  body?: unknown;
}
