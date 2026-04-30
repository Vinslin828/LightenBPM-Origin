import { ApiProperty } from '@nestjs/swagger';
import {
  ApprovalStatus,
  InstanceStatus,
} from '../../common/types/common.types';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export enum ApplicationsFilterEnum {
  SUBMITTED = 'submitted',
  APPROVING = 'approving',
  SHARED = 'shared',
  ALL = 'all',
  VISIBLE = 'visible',
}

export enum ApplicationSortByEnum {
  CREATED_AT = 'created_at',
  APPLIED_AT = 'applied_at',
  UPDATED_AT = 'updated_at',
}

export enum SortOrderEnum {
  ASC = 'asc',
  DESC = 'desc',
}

export class ListApplicationsQueryDto extends PaginationQueryDto {
  @ApiProperty({
    enum: ApplicationsFilterEnum,
    required: false,
    description: 'Switch the application list context (Tab)',
    default: ApplicationsFilterEnum.SUBMITTED,
  })
  @IsEnum(ApplicationsFilterEnum)
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  filter?: ApplicationsFilterEnum = ApplicationsFilterEnum.SUBMITTED;

  @ApiProperty({
    required: false,
    description: 'Filter by application serial number',
  })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by applicant ID',
  })
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  applicantId?: number;

  @ApiProperty({
    enum: InstanceStatus,
    required: false,
    description: 'Filter the applications by status',
  })
  @IsEnum(InstanceStatus)
  @IsOptional()
  @Transform(({ value }: { value: string }) => value?.toUpperCase())
  overallStatus?: InstanceStatus;

  @ApiProperty({
    type: [ApprovalStatus],
    enum: ApprovalStatus,
    enumName: 'ApprovalStatus',
    isArray: true,
    required: false,
    description: "Filter the applications by current user's approval status",
  })
  @IsEnum(ApprovalStatus, { each: true })
  @IsOptional()
  @Transform(({ value }: { value: string | string[] | undefined }) => {
    if (!value) return value;
    const arr = Array.isArray(value) ? value : value.split(',');
    return arr.map((v: string) => v.trim().toUpperCase());
  })
  approvalStatus?: ApprovalStatus[];

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
    enum: ApplicationSortByEnum,
    required: false,
    description: 'Sort by field',
    default: ApplicationSortByEnum.CREATED_AT,
  })
  @IsEnum(ApplicationSortByEnum)
  @IsOptional()
  sortBy?: ApplicationSortByEnum = ApplicationSortByEnum.CREATED_AT;

  @ApiProperty({
    enum: SortOrderEnum,
    required: false,
    description: 'Sort order',
    default: SortOrderEnum.DESC,
  })
  @IsEnum(SortOrderEnum)
  @IsOptional()
  sortOrder?: SortOrderEnum = SortOrderEnum.DESC;
}
