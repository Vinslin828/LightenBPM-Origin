/**
 * Validation Executor Service
 *
 * Executes validation expressions against form data.
 * Used at submit time (full validation) and in real-time (single field validation).
 * Handles three types of validators:
 * 1. Component-level inline validators (componentValidator.code)
 * 2. Registry-based validators (registryValidators[].validatorId)
 * 3. Form-level validators (validation.validators[].code)
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
  FormValidator,
} from '../../types/form-schema.types';
import { ExpressionEvaluatorService, ExecutionContext } from '..';
import { ValidationRegistryService } from '../../../validation-registry/validation-registry.service';

/**
 * Execution context for validation
 */
export interface ValidationExecutionContext {
  formData?: Record<string, unknown>;
  applicantId: number;
  workflowInstanceId?: number;
}

/**
 * Result of a single expression execution
 */
interface ExpressionExecutionResult {
  isValid: boolean;
  error?: string;
}

@Injectable()
export class ValidationExecutorService {
  private readonly logger = new Logger(ValidationExecutorService.name);

  constructor(
    private readonly expressionEvaluator: ExpressionEvaluatorService,
    private readonly validationRegistryService: ValidationRegistryService,
  ) {}

  /**
   * Execute all validation expressions against form data
   *
   * @param formSchema - The form schema containing field definitions and validators
   * @param validation - The form-level validation configuration
   * @param context - The execution context with form data and user info
   * @returns Validation result with any errors
   */
  async execute(
    formSchema: FormSchema | null | undefined,
    validation: FormValidation | null | undefined,
    context: ValidationExecutionContext,
  ): Promise<ValidationResult & { message?: string }> {
    const executionContext: ExecutionContext = {
      formData: context.formData,
      applicantId: context.applicantId,
      workflowInstanceId: context.workflowInstanceId,
    };

    // Execute component-level validators
    let componentErrors: ValidationIssue[] = [];
    if (formSchema?.entities) {
      componentErrors = await this.executeComponentValidators(
        formSchema,
        executionContext,
      );
    }

    // Execute form-level validators
    let formLevelErrors: ValidationIssue[] = [];
    if (validation?.required && validation?.validators) {
      formLevelErrors = await this.executeFormLevelValidators(
        validation.validators,
        executionContext,
      );
    }

    const errors = [...componentErrors, ...formLevelErrors];
    const hasComponent = componentErrors.length > 0;
    const hasFormLevel = formLevelErrors.length > 0;

    let message: string | undefined;
    if (hasComponent && hasFormLevel) {
      message = 'Component and form validation failed';
    } else if (hasComponent) {
      message = 'Component validation failed';
    } else if (hasFormLevel) {
      message = 'Form validation failed';
    }

    return {
      isValid: errors.length === 0,
      errors,
      message,
    };
  }

  /**
   * Execute inline codes, registry validators, and/or form-level validators.
   * Used for real-time field validation and preview form submission.
   *
   * @param codes - Array of inline validation expression codes (component-level)
   * @param registryIds - Array of registry validator IDs (component-level)
   * @param fieldValue - The current value of the field being validated
   * @param context - The execution context with form data and user info
   * @param formValidators - Array of form-level validators (no field value injection)
   * @returns Validation result with any errors
   */
  async executeValidators(
    codes: { code: string; errorMessage?: string }[] | undefined,
    registryIds: string[] | undefined,
    fieldValue: unknown,
    context: ValidationExecutionContext,
    formValidators?: { code: string; errorMessage?: string }[],
  ): Promise<ValidationResult> {
    const errors: ValidationIssue[] = [];

    const executionContext: ExecutionContext = {
      formData: context.formData,
      applicantId: context.applicantId,
      workflowInstanceId: context.workflowInstanceId,
    };

    // Execute inline codes
    // Error message priority: result.error → config errorMessage → default
    if (codes && codes.length > 0) {
      for (const { code, errorMessage } of codes) {
        const result = await this.executeValidationExpression(
          code,
          fieldValue,
          executionContext,
        );

        if (!result.isValid) {
          errors.push({
            code: ErrorCode.CUSTOM,
            message: result.error || errorMessage || 'Validation failed',
          });
        }
      }
    }

    // Execute registry validators
    // Error message priority: result.error → registry errorMessage → default
    if (registryIds && registryIds.length > 0) {
      for (const registryId of registryIds) {
        const registryResult = await this.executeRegistryValidator(
          registryId,
          fieldValue,
          executionContext,
        );

        if (registryResult && !registryResult.result.isValid) {
          errors.push({
            code: ErrorCode.CUSTOM,
            message:
              registryResult.result.error ||
              registryResult.errorMessage ||
              'Validation failed',
          });
        }
      }
    }

    // Execute form-level validators (no field value injection)
    // Error message priority: result.error → config errorMessage → default
    if (formValidators && formValidators.length > 0) {
      for (const { code, errorMessage } of formValidators) {
        const result = await this.executeExpression(code, executionContext);

        if (!result.isValid) {
          errors.push({
            code: ErrorCode.CUSTOM,
            message: result.error || errorMessage || 'Validation failed',
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Execute component-level and component-registry validators for all fields
   */
  private async executeComponentValidators(
    formSchema: FormSchema,
    context: ExecutionContext,
  ): Promise<ValidationIssue[]> {
    const errors: ValidationIssue[] = [];

    for (const [entityId, entity] of Object.entries(
      formSchema?.entities || {},
    )) {
      const validator = entity.attributes?.validator;
      if (!validator?.required) {
        continue;
      }

      const fieldName = entity.attributes?.name || entityId;
      const fieldValue = context.formData?.[fieldName];

      const defaultMessage = `Field "${fieldName}" validation failed`;

      // Execute componentValidator.code
      if (validator.componentValidator?.code) {
        const result = await this.executeValidationExpression(
          validator.componentValidator.code,
          fieldValue,
          context,
        );

        if (!result.isValid) {
          errors.push({
            code: ErrorCode.CUSTOM,
            message:
              result.error ||
              validator.componentValidator.errorMessage ||
              defaultMessage,
          });
        }
      }

      // Execute registryValidators (array)
      if (
        validator.registryValidators &&
        validator.registryValidators.length > 0
      ) {
        for (const registryValidator of validator.registryValidators) {
          if (!registryValidator.validatorId) {
            continue;
          }

          const registryResult = await this.executeRegistryValidator(
            registryValidator.validatorId,
            fieldValue,
            context,
          );

          if (registryResult && !registryResult.result.isValid) {
            errors.push({
              code: ErrorCode.CUSTOM,
              message:
                registryResult.result.error ||
                registryResult.errorMessage ||
                defaultMessage,
            });
          }
        }
      }
    }

    return errors;
  }

  /**
   * Execute a component-registry validator
   * Returns null if registry has no validation code.
   * Returns { result, errorMessage } so the caller can apply the 3-tier priority.
   */
  private async executeRegistryValidator(
    validatorId: string,
    fieldValue: unknown,
    context: ExecutionContext,
  ): Promise<{
    result: ExpressionExecutionResult;
    errorMessage?: string;
  } | null> {
    try {
      const registry =
        await this.validationRegistryService.findOne(validatorId);

      if (!registry.validationCode) {
        this.logger.warn(
          `Registry validator "${validatorId}" has no validation code`,
        );
        return null;
      }

      const result = await this.executeValidationExpression(
        registry.validationCode,
        fieldValue,
        context,
      );

      return { result, errorMessage: registry.errorMessage ?? undefined };
    } catch (error) {
      this.logger.error(
        `Error executing registry validator ${validatorId}: ${error}`,
      );
      return {
        result: {
          isValid: false,
          error: `Validator "${validatorId}" execution failed`,
        },
      };
    }
  }

  /**
   * Execute form-level validators
   */
  private async executeFormLevelValidators(
    validators: FormValidator[],
    context: ExecutionContext,
  ): Promise<ValidationIssue[]> {
    const errors: ValidationIssue[] = [];

    for (let i = 0; i < validators.length; i++) {
      const validator = validators[i];
      const validatorKey = validator.key || `validator_${i}`;

      if (!validator.code) {
        continue;
      }

      const result = await this.executeExpression(validator.code, context);

      if (!result.isValid) {
        // Use error from result, or errorMessage from validator, or default
        const errorMessage =
          result.error ||
          validator.errorMessage ||
          `Form validation "${validatorKey}" failed`;

        errors.push({
          code: ErrorCode.CUSTOM,
          message: errorMessage,
        });
      }
    }

    return errors;
  }

  /**
   * Execute a validation expression that expects a field value as its parameter.
   *
   * Supports two formats:
   * 1. Named function — extracts function name and calls it with fieldValue:
   *      function validation(value) { return value > 0; }
   *      function validate(value) { return value.length > 0; }
   * 2. Inline expression — executed directly (fieldValue not injected):
   *      getFormField('amount').value > 0
   */
  private async executeValidationExpression(
    code: string,
    fieldValue: unknown,
    context: ExecutionContext,
  ): Promise<ExpressionExecutionResult> {
    const fnNameMatch = code.match(/function\s+(\w+)\s*\(/);
    if (fnNameMatch) {
      const valueJson = JSON.stringify(fieldValue ?? null);
      // Wrap function as expression: (function xxx(...){...})(value)
      // Parentheses ensure wrapCode treats it as an expression, not
      // a function declaration (which would get a no-arg call appended)
      const wrappedCode = `(${code})(${valueJson})`;
      return this.executeExpression(wrappedCode, context);
    }

    // Inline expression — execute directly
    return this.executeExpression(code, context);
  }

  /**
   * Execute an expression and normalize the result
   *
   * Handles two return formats:
   * 1. boolean - true = valid, false = invalid
   * 2. { isValid: boolean, error?: string } - validation result object
   */
  private async executeExpression(
    code: string,
    context: ExecutionContext,
  ): Promise<ExpressionExecutionResult> {
    try {
      const result = await this.expressionEvaluator.evaluate(code, context);

      if (!result.success) {
        this.logger.warn(`Expression execution failed: ${result.error}`);
        return {
          isValid: false,
          error: result.error || 'Expression execution failed',
        };
      }

      const value = result.value;

      // Handle boolean result
      if (typeof value === 'boolean') {
        return { isValid: value };
      }

      // Handle { isValid, error } result
      if (typeof value === 'object' && value !== null && 'isValid' in value) {
        const validationResult = value as { isValid: boolean; error?: string };
        return {
          isValid: validationResult.isValid,
          error: validationResult.error,
        };
      }

      return {
        isValid: false,
        error: 'Invalid expression return type',
      };
    } catch (error) {
      this.logger.error(`Expression execution error: ${error}`);
      return {
        isValid: false,
        error: 'Expression execution error',
      };
    }
  }
}
