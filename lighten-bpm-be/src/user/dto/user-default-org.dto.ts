import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty } from 'class-validator';

export class UpdateUserDefaultOrgDto {
  @ApiProperty({ description: 'Organization Unit ID' })
  @IsInt()
  @IsNotEmpty()
  orgUnitId: number;
}

export class UserDefaultOrgDto {
  @ApiProperty({ description: 'User ID' })
  userId: number;

  @ApiProperty({ description: 'Organization Unit ID' })
  orgUnitId: number;

  @ApiProperty({ description: 'Organization Unit Code' })
  orgUnitCode: string;

  @ApiProperty({ description: 'Organization Unit Name' })
  orgUnitName: string;

  @ApiProperty({ description: 'Last updated timestamp' })
  updatedAt: Date;
}
