import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsArray,
  IsNumber,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export class UpdateWorkflowDto {
  @ApiProperty({
    description: 'An array of tag IDs to associate with the workflow',
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  tags?: number[];

  @ApiProperty({
    description: 'The new active status of the workflow',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiProperty({
    description:
      'Serial number prefix for applications in this workflow (e.g. "APP", "HR", "IT"). Uppercase alphanumeric, max 3 chars.',
    example: 'HR',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  @Matches(/^[A-Z0-9]+$/, {
    message: 'serial_prefix must be uppercase alphanumeric',
  })
  serial_prefix?: string;
}
