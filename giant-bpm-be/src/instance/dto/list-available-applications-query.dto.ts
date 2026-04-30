import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export enum SortOrderEnum {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListAvailableApplicationsQueryDto extends PaginationQueryDto {
  @ApiProperty({
    required: false,
    description: 'Filter by binding form name',
  })
  @IsString()
  @IsOptional()
  formName?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by binding workflow name',
  })
  @IsString()
  @IsOptional()
  workflowName?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by binding form tag IDs',
    isArray: true,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    // Handle single values (number/string) or arrays
    const toArray = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',')
        : [value];
    return toArray.map((v) => Number(v));
  })
  @IsNumber({}, { each: true })
  formTagIds?: number[];

  @ApiProperty({
    required: false,
    description: 'Filter by binding workflow tag IDs',
    isArray: true,
    type: Number,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    const toArray = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(',')
        : [value];
    return toArray.map((v) => Number(v));
  })
  @IsNumber({}, { each: true })
  workflowTagIds?: number[];

  @ApiProperty({
    enum: SortOrderEnum,
    required: false,
    description: 'Sort order for created_at field',
    default: SortOrderEnum.DESC,
  })
  @IsEnum(SortOrderEnum)
  @IsOptional()
  sortOrder?: SortOrderEnum = SortOrderEnum.DESC;
}
