import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsEnum,
  IsDateString,
  IsOptional,
  IsString,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { AssignType } from '../../common/types/common.types';

export class CreateOrgMembershipDto {
  @ApiProperty({
    description: 'Code of the organization unit',
    example: 'd001',
  })
  @IsString()
  @IsNotEmpty()
  orgUnitCode: string;

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
    description:
      'If true, endDate will be ignored and set to the system maximum (indefinite).',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isIndefinite?: boolean;

  @ApiProperty({
    description: 'End date of the mapping. Required if isIndefinite is false.',
    example: '2024-01-01T00:00:00Z',
    required: false,
  })
  @ValidateIf((o: CreateOrgMembershipDto) => !o.isIndefinite)
  @IsDateString()
  @IsNotEmpty()
  endDate?: Date;

  @ApiProperty({
    description: 'Optional note for the mapping',
    required: false,
  })
  @IsString()
  @IsOptional()
  note?: string;
}
