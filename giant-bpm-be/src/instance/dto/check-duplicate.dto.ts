import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CheckDuplicateDto {
  @ApiProperty({
    description: 'Form public ID to search across',
    example: 'abc123XYZ',
  })
  @IsString()
  @IsNotEmpty()
  formId: string;

  @ApiProperty({
    description: 'Field name in form data to check',
    example: 'business_trip_id',
  })
  @IsString()
  @IsNotEmpty()
  fieldName: string;

  @ApiProperty({
    description: 'Field value to match (string, number, or boolean)',
    example: 'BT-2026-001',
  })
  @IsNotEmpty()
  fieldValue: string | number | boolean;
}
