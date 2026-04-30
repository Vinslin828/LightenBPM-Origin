import { ApiProperty } from '@nestjs/swagger';
import {
  ValidationType,
  ValidationRegistry,
} from '../../../common/types/common.types';

/**
 * Response DTO for validation registry
 * Used for single record responses (GET /:id, POST, PATCH)
 */
export class ValidationRegistryResponseDto {
  @ApiProperty({
    description: 'The unique identifier (UUID)',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'The unique name of the validation rule',
    example: 'emailValidator',
  })
  name: string;

  @ApiProperty({
    description: 'A description of the validation rule',
    nullable: true,
    example: 'Validates email format',
  })
  description: string | null;

  @ApiProperty({
    description: 'The type of validation',
    enum: ValidationType,
    nullable: true,
    example: 'CODE',
  })
  validationType: ValidationType | null;

  @ApiProperty({
    description: 'JavaScript validation code',
    nullable: true,
    example:
      'function validate(value) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value); }',
  })
  validationCode: string | null;

  @ApiProperty({
    description: 'Default error message',
    nullable: true,
    example: 'Invalid email format',
  })
  errorMessage: string | null;

  @ApiProperty({
    description: 'Whether the validation rule is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'The ID of the user who created this validation rule',
    example: 1,
  })
  createdBy: number;

  @ApiProperty({
    description: 'The ID of the user who last updated this validation rule',
    example: 1,
  })
  updatedBy: number;

  @ApiProperty({
    description:
      'The timestamp when the validation rule was created (epoch milliseconds)',
    example: 1704096000000,
  })
  createdAt: number;

  @ApiProperty({
    description:
      'The timestamp when the validation rule was last updated (epoch milliseconds)',
    example: 1704096000000,
  })
  updatedAt: number;

  @ApiProperty({
    description: 'List of component types bound to this validation rule',
    type: [String],
    example: ['TextField', 'EmailField'],
  })
  components: string[];

  constructor(data: Partial<ValidationRegistryResponseDto>) {
    Object.assign(this, data);
  }

  /**
   * Convert Prisma model to DTO
   */
  static fromPrisma(
    validation: ValidationRegistry,
    components: string[] = [],
  ): ValidationRegistryResponseDto {
    return new ValidationRegistryResponseDto({
      id: validation.public_id,
      name: validation.name,
      description: validation.description ?? null,
      validationType: validation.validation_type ?? null,
      validationCode: validation.validation_code ?? null,
      errorMessage: validation.error_message ?? null,
      isActive: validation.is_active,
      createdBy: validation.created_by,
      updatedBy: validation.updated_by,
      createdAt: validation.created_at.getTime(), // Convert to epoch
      updatedAt: validation.updated_at.getTime(), // Convert to epoch
      components,
    });
  }
}
