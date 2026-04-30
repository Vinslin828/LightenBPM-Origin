import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export enum MembershipStatusFilter {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  SCHEDULED = 'scheduled',
  ALL = 'all',
}

export enum AssignTypeFilter {
  USER = 'USER',
  HEAD = 'HEAD',
  ALL = 'ALL',
}

export class ListOrgMembersQueryDto {
  @ApiProperty({
    required: false,
    enum: AssignTypeFilter,
    default: AssignTypeFilter.USER,
    description:
      'Filter by membership assign type. USER returns only regular members, HEAD returns only heads, ALL returns both. Defaults to USER.',
  })
  @IsOptional()
  @IsEnum(AssignTypeFilter)
  assignType?: AssignTypeFilter;

  @ApiProperty({
    required: false,
    enum: MembershipStatusFilter,
    default: MembershipStatusFilter.ACTIVE,
    description:
      'Filter by membership time status. ACTIVE returns currently active memberships (start_date <= now < end_date), EXPIRED returns past memberships (end_date <= now), SCHEDULED returns future memberships not yet in effect (start_date > now), ALL returns all. Defaults to ACTIVE.',
  })
  @IsOptional()
  @IsEnum(MembershipStatusFilter)
  status?: MembershipStatusFilter;

  @ApiProperty({
    required: false,
    default: false,
    description:
      'Include soft-deleted users in the response. Defaults to false.',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeleted?: boolean;
}
