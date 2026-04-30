/**
 * Form Expression Validator Service
 *
 * Validates all expressions in form schemas:
 * 1. Component-level inline validators (componentValidator.code)
 * 2. Registry-based validators (registryValidators[].validatorId -> validation_code)
 * 3. Form-level validators (validation.validators[].code)
 * 4. Expression components (type: 'expression', attributes.expression)
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ValidationResult,
  ValidationIssue,
  ErrorCode,
} from '../../types/validation.types';
import {
  FormSchema,
  FormValidation,
  FORM_FIELD_TYPES,
} from '../../types/form-schema.types';
import {
  validateValidationExpression,
  validateExpressionSyntax,
  containsCurrentNodeCall,
  FunctionCallExtractor,
} from '../../expression-engine';
import { findMissingFieldsInSchema } from '../../shared/form/form-utils';
import { ValidationRegistryService } from '../../../validation-registry/validation-registry.service';

@Injectable()
export class FormExpressionValidatorService {
  private readonly logger = new Logger(FormExpressionValidatorService.name);

  constructor(
    private readonly validationRegistryService: ValidationRegistryService,
  ) {}

  /**
   * Validate all validation expressions in form schema and form-level validation
   *
   * @param formSchema - The form schema containing entity definitions
   * @param validation - The form-level validation configuration
   * @returns Validation result with any expression errors
   */
  async validateFormExpressions(
    formSchema: FormSchema | null | undefined,
    validation: FormValidation | null | undefined,
  ): Promise<ValidationResult> {
    const errors: ValidationIssue[] = [];

    if (formSchema?.entities) {
      // Validate component-level validators
      const componentErrors =
        await this.validateComponentValidators(formSchema);
      errors.push(...componentErrors);

      // Validate expression components
      const expressionErrors = this.validateExpressionComponents(formSchema);
      errors.push(...expressionErrors);
    }

    // Validate form-level validators
    if (validation?.required && validation?.validators) {
      const formLevelErrors = await this.validateFormLevelValidators(
        validation.validators,
      );
      errors.push(...formLevelErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate expression components (type: 'expression')
   * Checks: syntax, getCurrentNode restriction, field existence
   * Does NOT check return type (expression can return any value)
   */
  private validateExpressionComponents(
    formSchema: FormSchema,
  ): ValidationIssue[] {
    const errors: ValidationIssue[] = [];
    const extractor = new FunctionCallExtractor();

    for (const [entityId, entity] of Object.entries(
      formSchema?.entities || {},
    )) {
      if (entity.type !== FORM_FIELD_TYPES.EXPRESSION) {
        continue;
      }

      const expression = entity.attributes?.expression;
      const fieldName = entity.attributes?.name || entityId;

      if (!expression) {
        errors.push({
          code: ErrorCode.INVALID_EXPRESSION,
          message: `Expression component "${fieldName}" has no expression`,
        });
        continue;
      }

      // Syntax check
      const syntaxResult = validateExpressionSyntax(expression);
      if (!syntaxResult.isValid) {
        errors.push({
          code: ErrorCode.INVALID_EXPRESSION,
          message: `Expression component "${fieldName}" has invalid syntax: ${syntaxResult.errors[0]?.message}`,
        });
        continue;
      }

      // getCurrentNode restriction
      if (containsCurrentNodeCall(expression)) {
        errors.push({
          code: ErrorCode.INVALID_EXPRESSION,
          message: `Expression component "${fieldName}": getCurrentNode() can only be used in approval node expressions`,
        });
        continue;
      }

      // Field existence check
      const referencedFields = extractor.getFormFieldNames(expression);
      const missingFields = findMissingFieldsInSchema(
        referencedFields,
        formSchema,
      );

      for (const missing of missingFields) {
        errors.push({
          code: ErrorCode.FORM_FIELD_NOT_FOUND,
          message: `Expression component "${fieldName}" references non-existent field "${missing}"`,
        });
      }
    }

    return errors;
  }

  /**
   * Validate component-level validators (componentValidator and registryValidator)
   */
  private async validateComponentValidators(
    formSchema: FormSchema,
  ): Promise<ValidationIssue[]> {
    const errors: ValidationIssue[] = [];

    for (const [entityId, entity] of Object.entries(
      formSchema?.entities || {},
    )) {
      const validator = entity.attributes?.validator;

      // Only validate if validator.required is true
      if (!validator?.required) {
        continue;
      }

      const fieldName = entity.attributes?.name || entityId;

      // Validate componentValidator.code
      if (validator.componentValidator?.code) {
        if (containsCurrentNodeCall(validator.componentValidator.code)) {
          errors.push({
            code: ErrorCode.INVALID_EXPRESSION,
            message: `Component validator for field "${fieldName}": getCurrentNode() can only be used in approval node expressions`,
          });
        } else {
          const result = await validateValidationExpression(
            validator.componentValidator.code,
          );

          if (!result.isValid) {
            errors.push({
              code: ErrorCode.INVALID_EXPRESSION,
              message: `Component validator for field "${fieldName}" has invalid expression: ${result.errors[0]?.message}`,
            });
          }
        }
      }

      // Validate registryValidators (array)
      if (
        validator.registryValidators &&
        validator.registryValidators.length > 0
      ) {
        for (const registryValidator of validator.registryValidators) {
          if (!registryValidator.validatorId) {
            continue;
          }

          const registryError = await this.validateRegistryValidator(
            registryValidator.validatorId,
            fieldName,
          );

          if (registryError) {
            errors.push(registryError);
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate a registry validator by looking up its validation_code
   */
  private async validateRegistryValidator(
    validatorId: string,
    fieldName: string,
  ): Promise<ValidationIssue | null> {
    try {
      const registry =
        await this.validationRegistryService.findOne(validatorId);

      // Check if validation_code exists
      if (!registry.validationCode) {
        return {
          code: ErrorCode.INVALID_EXPRESSION,
          message: `Registry validator "${validatorId}" for field "${fieldName}" has no validation code`,
        };
      }

      // Check for getCurrentNode() usage
      if (containsCurrentNodeCall(registry.validationCode)) {
        return {
          code: ErrorCode.INVALID_EXPRESSION,
          message: `Registry validator "${validatorId}" for field "${fieldName}": getCurrentNode() can only be used in approval node expressions`,
        };
      }

      // Validate the expression
      const result = await validateValidationExpression(
        registry.validationCode,
      );

      if (!result.isValid) {
        return {
          code: ErrorCode.INVALID_EXPRESSION,
          message: `Registry validator "${validatorId}" for field "${fieldName}" has invalid expression: ${result.errors[0]?.message}`,
        };
      }

      return null;
    } catch (error) {
      // Handle case where registry validator is not found
      if (error instanceof Error && error.message.includes('not found')) {
        return {
          code: ErrorCode.REFERENCE_NOT_FOUND,
          message: `Registry validator "${validatorId}" for field "${fieldName}" not found`,
        };
      }

      this.logger.error(
        `Error validating registry validator ${validatorId}: ${error}`,
      );

      return {
        code: ErrorCode.CUSTOM,
        message: `Failed to validate registry validator "${validatorId}" for field "${fieldName}"`,
      };
    }
  }

  /**
   * Validate form-level validators
   */
  private async validateFormLevelValidators(
    validators: FormValidation['validators'],
  ): Promise<ValidationIssue[]> {
    const errors: ValidationIssue[] = [];

    if (!validators) {
      return errors;
    }

    for (let i = 0; i < validators.length; i++) {
      const validator = validators[i];
      const validatorKey = validator.key || `validator_${i}`;

      if (!validator.code) {
        continue;
      }

      if (containsCurrentNodeCall(validator.code)) {
        errors.push({
          code: ErrorCode.INVALID_EXPRESSION,
          message: `Form-level validator "${validatorKey}": getCurrentNode() can only be used in approval node expressions`,
        });
        continue;
      }

      const result = await validateValidationExpression(validator.code);

      if (!result.isValid) {
        errors.push({
          code: ErrorCode.INVALID_EXPRESSION,
          message: `Form-level validator "${validatorKey}" has invalid expression: ${result.errors[0]?.message}`,
        });
      }
    }

    return errors;
  }
}
