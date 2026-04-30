import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export const DEFAULT_USER_LIMIT = 50;

export class ListUserQueryDto extends PaginationQueryDto {
  @ApiProperty({
    required: false,
    description:
      // 'Filter users by partial user name, email, or default organization name (case-insensitive)',
      'Filter users by partial user name or email (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    required: false,
    description: 'Include soft-deleted users in the response',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeDeleted?: boolean;
}
