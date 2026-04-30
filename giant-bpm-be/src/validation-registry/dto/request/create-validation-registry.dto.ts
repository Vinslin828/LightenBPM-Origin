import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { ValidationType } from '../../../common/types/common.types';

/**
 * Request DTO for creating validation registry
 * Used for POST operations
 */
export class CreateValidationRegistryDto {
  @ApiProperty({
    description: 'The unique name of the validation rule',
    example: 'emailValidator',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'A description of the validation rule',
    required: false,
    example: 'Validates email format',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'The type of validation (CODE or API)',
    enum: ValidationType,
    required: false,
    example: 'CODE',
  })
  @IsOptional()
  @IsEnum(ValidationType)
  validationType?: ValidationType;

  @ApiProperty({
    description:
      'JavaScript validation code. ' +
      'Must return boolean or { isValid: boolean, error: string }.',
    required: false,
    example:
      'function validate(value) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value); }',
  })
  @IsOptional()
  @IsString()
  validationCode?: string;

  @ApiProperty({
    description: 'Default error message for validation failure',
    required: false,
    example: 'Invalid email format',
  })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiProperty({
    description: 'Whether the validation rule is active',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description:
      'Optional list of component types to bind to this validation rule. ' +
      'If provided, will set component bindings after creating/updating the validation rule.',
    required: false,
    type: [String],
    example: ['TextField', 'EmailField', 'PasswordField'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  components?: string[];
}
