import { PartialType } from '@nestjs/swagger';
import { Validate } from 'class-validator';
import { CreateValidationRegistryDto } from './create-validation-registry.dto';
import { AtLeastOnePropertyConstraint } from '../../../common/validators/at-least-one-property.validator';

/**
 * Patch DTO for validation registry
 *
 * All fields are optional for PATCH operations.
 * **At least one field must be provided.**
 */
export class PatchValidationRegistryDto extends PartialType(
  CreateValidationRegistryDto,
) {
  @Validate(AtLeastOnePropertyConstraint, [
    [
      'name',
      'description',
      'validationType',
      'validationCode',
      'errorMessage',
      'isActive',
      'components',
    ],
  ])
  private readonly _atLeastOneProperty?: void;
}
