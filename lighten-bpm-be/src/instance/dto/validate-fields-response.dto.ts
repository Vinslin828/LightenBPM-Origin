import { ApiProperty } from '@nestjs/swagger';

export class FieldValidationErrorDto {
  @ApiProperty({ example: 100 })
  code: number;

  @ApiProperty({ example: 'Amount must be greater than 0' })
  message: string;

  constructor(partial: Partial<FieldValidationErrorDto>) {
    Object.assign(this, partial);
  }
}

export class ValidateFieldsResponseDto {
  @ApiProperty({ example: true })
  isValid: boolean;

  @ApiProperty({ example: 'Component validation failed' })
  message: string;

  @ApiProperty({ type: [FieldValidationErrorDto] })
  errors: FieldValidationErrorDto[];

  constructor(partial: Partial<ValidateFieldsResponseDto>) {
    Object.assign(this, partial);
  }
}
