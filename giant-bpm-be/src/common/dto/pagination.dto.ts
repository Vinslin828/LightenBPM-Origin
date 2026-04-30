import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export const DEFAULT_PAGINATION_LIMIT = 10;
export const DEFAULT_PAGE = 1;

export class PaginationQueryDto {
  @ApiProperty({
    required: false,
    description: 'Page number (1-based)',
    example: DEFAULT_PAGE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(DEFAULT_PAGE)
  page?: number;

  @ApiProperty({ required: false, description: 'Items per page', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true, description: 'Array of items' })
  items: T[];

  @ApiProperty({ description: 'Total number of items', example: 100 })
  total: number;

  @ApiProperty({ description: 'Current page number', example: 1 })
  page: number;

  @ApiProperty({ description: 'Number of items per page', example: 10 })
  limit: number;

  @ApiProperty({ description: 'Total number of pages', example: 10 })
  totalPages: number;
}
