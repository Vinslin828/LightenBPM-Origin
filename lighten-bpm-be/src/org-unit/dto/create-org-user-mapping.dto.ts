import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';
import { AssignType } from '../../common/types/common.types';

export class CreateOrgUserMappingDto {
  @ApiProperty({ description: 'ID of the organization unit', example: 1 })
  @IsInt()
  @IsNotEmpty()
  orgUnitId: number;

  @ApiProperty({ description: 'ID of the user', example: 1 })
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    description: 'Assignment type',
    enum: AssignType,
    example: AssignType.USER,
  })
  @IsEnum(AssignType)
  @IsNotEmpty()
  assignType: AssignType;

  @ApiProperty({
    description: 'Start date of the mapping',
    example: '2023-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({
    description: 'End date of the mapping',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: Date;

  @ApiProperty({
    description: 'Optional note for the mapping',
    required: false,
  })
  @IsString()
  @IsOptional()
  note?: string;
}
