/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
/**
 * Unit Tests - ValidationExecutorService
 */

import { ValidationExecutorService } from './validation-executor.service';
import { ExpressionEvaluatorService } from '..';
import { ValidationRegistryService } from '../../../validation-registry/validation-registry.service';
import { FormSchema, FormValidation } from '../../types/form-schema.types';

describe('ValidationExecutorService', () => {
  let service: ValidationExecutorService;
  let expressionEvaluator: jest.Mocked<ExpressionEvaluatorService>;
  let validationRegistryService: jest.Mocked<ValidationRegistryService>;

  const defaultContext = {
    formData: { amount: 100, name: 'test' },
    applicantId: 1,
    workflowInstanceId: 1,
  };

  beforeEach(() => {
    expressionEvaluator = {
      evaluate: jest.fn(),
    } as unknown as jest.Mocked<ExpressionEvaluatorService>;

    validationRegistryService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ValidationRegistryService>;

    service = new ValidationExecutorService(
      expressionEvaluator,
      validationRegistryService,
    );
  });

  // ===========================================================================
  // Component Validators
  // ===========================================================================

  describe('component validators', () => {
    it('should return valid when componentValidator returns true', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });

      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
              validator: {
                required: true,
                componentValidator: {
                  code: 'function validation(value) { return value > 0; }',
                },
              },
            },
          },
        },
      };

      // Act
      const result = await service.execute(formSchema, null, defaultContext);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should wrap code with validation(fieldValue) call', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });

      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
              validator: {
                required: true,
                componentValidator: {
                  code: 'function validation(value) { return value > 0; }',
                },
              },
            },
          },
        },
      };

      // Act
      await service.execute(formSchema, null, defaultContext);

      // Assert
      expect(expressionEvaluator.evaluate).toHaveBeenCalledWith(
        '(function validation(value) { return value > 0; })(100)',
        expect.any(Object),
      );
    });

    it('should return error with default message when componentValidator returns false', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: false,
      });

      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
              validator: {
                required: true,
                componentValidator: {
                  code: 'function validation(value) { return value > 0; }',
                },
              },
            },
          },
        },
      };

      // Act
      const result = await service.execute(formSchema, null, defaultContext);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Field "amount" validation failed');
    });

    it('should return error with custom message when componentValidator returns { isValid: false, error }', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: { isValid: false, error: 'Amount must be positive' },
      });

      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
              validator: {
                required: true,
                componentValidator: {
                  code: 'function validation(value) { return { isValid: false, error: "Amount must be positive" }; }',
                },
              },
            },
          },
        },
      };

      // Act
      const result = await service.execute(formSchema, null, defaultContext);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Amount must be positive');
    });

    it('should skip validation when validator.required is false', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
              validator: {
                required: false,
                componentValidator: {
                  code: 'function validation(value) { return value > 0; }',
                },
              },
            },
          },
        },
      };

      // Act
      const result = await service.execute(formSchema, null, defaultContext);

      // Assert
      expect(result.isValid).toBe(true);
      expect(expressionEvaluator.evaluate).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Registry Validators
  // ===========================================================================

  describe('registry validators', () => {
    it('should return valid when registryValidator returns true', async () => {
      // Arrange
      validationRegistryService.findOne.mockResolvedValueOnce({
        validationCode: 'function validation(value) { return value > 0; }',
      } as any);

      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });

      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
              validator: {
                required: true,
                registryValidators: [{ validatorId: 'validator-1' }],
              },
            },
          },
        },
      };

      // Act
      const result = await service.execute(formSchema, null, defaultContext);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return default error message when registryValidator returns false', async () => {
      // Arrange
      validationRegistryService.findOne.mockResolvedValueOnce({
        validationCode: 'function validation(value) { return value > 0; }',
      } as any);

      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: false,
      });

      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
              validator: {
                required: true,
                registryValidators: [{ validatorId: 'validator-1' }],
              },
            },
          },
        },
      };

      // Act
      const result = await service.execute(formSchema, null, defaultContext);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Field "amount" validation failed');
    });

    it('should return error with custom message when registryValidator returns { isValid: false, error }', async () => {
      // Arrange
      validationRegistryService.findOne.mockResolvedValueOnce({
        validationCode:
          'function validation(value) { return { isValid: false, error: "Custom error" }; }',
      } as any);

      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: { isValid: false, error: 'Custom error' },
      });

      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
              validator: {
                required: true,
                registryValidators: [{ validatorId: 'validator-1' }],
              },
            },
          },
        },
      };

      // Act
      const result = await service.execute(formSchema, null, defaultContext);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Custom error');
    });

    it('should validate multiple registryValidators', async () => {
      // Arrange
      validationRegistryService.findOne
        .mockResolvedValueOnce({
          validationCode: 'function validation(value) { return true; }',
        } as any)
        .mockResolvedValueOnce({
          validationCode: 'function validation(value) { return false; }',
        } as any);

      expressionEvaluator.evaluate
        .mockResolvedValueOnce({ success: true, value: true })
        .mockResolvedValueOnce({ success: true, value: false });

      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
              validator: {
                required: true,
                registryValidators: [
                  { validatorId: 'validator-1' },
                  { validatorId: 'validator-2' },
                ],
              },
            },
          },
        },
      };

      // Act
      const result = await service.execute(formSchema, null, defaultContext);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Field "amount" validation failed');
    });
  });

  // ===========================================================================
  // Form-level Validators
  // ===========================================================================

  describe('form-level validators', () => {
    it('should return valid when form-level validator returns true', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });

      const validation: FormValidation = {
        required: true,
        validators: [
          {
            key: 'cross_field_check',
            code: 'getFormField("amount").value > 0',
            errorMessage: 'Amount must be positive',
          },
        ],
      };

      // Act
      const result = await service.execute(null, validation, defaultContext);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error with validator errorMessage when form-level validator returns false', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: false,
      });

      const validation: FormValidation = {
        required: true,
        validators: [
          {
            key: 'cross_field_check',
            code: 'getFormField("amount").value > 0',
            errorMessage: 'Amount must be positive',
          },
        ],
      };

      // Act
      const result = await service.execute(null, validation, defaultContext);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Amount must be positive');
    });

    it('should return error with custom message when form-level validator returns { isValid: false, error }', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: { isValid: false, error: 'Custom validation error' },
      });

      const validation: FormValidation = {
        required: true,
        validators: [
          {
            key: 'cross_field_check',
            code: 'function validate() { return { isValid: false, error: "Custom validation error" }; }',
            errorMessage: 'Default error message',
          },
        ],
      };

      // Act
      const result = await service.execute(null, validation, defaultContext);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Custom validation error');
    });

    it('should use default message when validator has no errorMessage', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: false,
      });

      const validation: FormValidation = {
        required: true,
        validators: [
          {
            key: 'my_validator',
            code: 'false',
          },
        ],
      };

      // Act
      const result = await service.execute(null, validation, defaultContext);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe(
        'Form validation "my_validator" failed',
      );
    });

    it('should skip validation when validation.required is false', async () => {
      // Arrange
      const validation: FormValidation = {
        required: false,
        validators: [
          {
            key: 'cross_field_check',
            code: 'false',
            errorMessage: 'Should not run',
          },
        ],
      };

      // Act
      const result = await service.execute(null, validation, defaultContext);

      // Assert
      expect(result.isValid).toBe(true);
      expect(expressionEvaluator.evaluate).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Expression Execution Errors
  // ===========================================================================

  describe('expression execution errors', () => {
    it('should return error when expression execution fails', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: false,
        error: 'Syntax error in expression',
      });

      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
              validator: {
                required: true,
                componentValidator: {
                  code: 'invalid syntax !!!',
                },
              },
            },
          },
        },
      };

      // Act
      const result = await service.execute(formSchema, null, defaultContext);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Syntax error in expression');
    });

    it('should return error when expression returns unexpected type', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: 'not a boolean',
      });

      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
              validator: {
                required: true,
                componentValidator: {
                  code: '"not a boolean"',
                },
              },
            },
          },
        },
      };

      // Act
      const result = await service.execute(formSchema, null, defaultContext);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Invalid expression return type');
    });
  });

  // ===========================================================================
  // Combined Scenarios
  // ===========================================================================

  describe('combined scenarios', () => {
    it('should validate both component and form-level validators', async () => {
      // Arrange
      expressionEvaluator.evaluate
        .mockResolvedValueOnce({ success: true, value: false }) // component
        .mockResolvedValueOnce({ success: true, value: false }); // form-level

      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
              validator: {
                required: true,
                componentValidator: {
                  code: 'function validation(value) { return false; }',
                },
              },
            },
          },
        },
      };

      const validation: FormValidation = {
        required: true,
        validators: [
          {
            key: 'form_check',
            code: 'false',
            errorMessage: 'Form check failed',
          },
        ],
      };

      // Act
      const result = await service.execute(
        formSchema,
        validation,
        defaultContext,
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should return valid when formSchema and validation are null', async () => {
      // Act
      const result = await service.execute(null, null, defaultContext);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return message "Component validation failed" when only component fails', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: false,
      });

      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
              validator: {
                required: true,
                componentValidator: {
                  code: 'function validation(value) { return false; }',
                },
              },
            },
          },
        },
      };

      // Act
      const result = await service.execute(formSchema, null, defaultContext);

      // Assert
      expect(result.message).toBe('Component validation failed');
    });

    it('should return message "Form validation failed" when only form-level fails', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: false,
      });

      const validation: FormValidation = {
        required: true,
        validators: [{ key: 'check', code: 'false', errorMessage: 'fail' }],
      };

      // Act
      const result = await service.execute(null, validation, defaultContext);

      // Assert
      expect(result.message).toBe('Form validation failed');
    });

    it('should return message "Component and form validation failed" when both fail', async () => {
      // Arrange
      expressionEvaluator.evaluate
        .mockResolvedValueOnce({ success: true, value: false })
        .mockResolvedValueOnce({ success: true, value: false });

      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
              validator: {
                required: true,
                componentValidator: {
                  code: 'function validation(value) { return false; }',
                },
              },
            },
          },
        },
      };

      const validation: FormValidation = {
        required: true,
        validators: [{ key: 'check', code: 'false', errorMessage: 'fail' }],
      };

      // Act
      const result = await service.execute(
        formSchema,
        validation,
        defaultContext,
      );

      // Assert
      expect(result.message).toBe('Component and form validation failed');
    });

    it('should return no message when validation passes', async () => {
      // Act
      const result = await service.execute(null, null, defaultContext);

      // Assert
      expect(result.message).toBeUndefined();
    });
  });

  // ===========================================================================
  // executeValidators
  // ===========================================================================

  describe('executeValidators', () => {
    it('should return valid when inline code passes', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });

      // Act
      const result = await service.executeValidators(
        [{ code: 'function validation(value) { return value > 0; }' }],
        undefined,
        100,
        defaultContext,
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should wrap code with validation(fieldValue) call', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });

      // Act
      await service.executeValidators(
        [{ code: 'function validation(value) { return value > 0; }' }],
        undefined,
        100,
        defaultContext,
      );

      // Assert
      expect(expressionEvaluator.evaluate).toHaveBeenCalledWith(
        '(function validation(value) { return value > 0; })(100)',
        expect.any(Object),
      );
    });

    it('should serialize string fieldValue with quotes', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });

      // Act
      await service.executeValidators(
        [{ code: 'function validation(value) { return true; }' }],
        undefined,
        'hello',
        defaultContext,
      );

      // Assert
      expect(expressionEvaluator.evaluate).toHaveBeenCalledWith(
        '(function validation(value) { return true; })("hello")',
        expect.any(Object),
      );
    });

    it('should serialize null for undefined fieldValue', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });

      // Act
      await service.executeValidators(
        [{ code: 'function validation(value) { return true; }' }],
        undefined,
        undefined,
        defaultContext,
      );

      // Assert
      expect(expressionEvaluator.evaluate).toHaveBeenCalledWith(
        '(function validation(value) { return true; })(null)',
        expect.any(Object),
      );
    });

    it('should return default message when inline code fails without errorMessage', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: false,
      });

      // Act
      const result = await service.executeValidators(
        [{ code: 'function validation(value) { return value > 0; }' }],
        undefined,
        -1,
        defaultContext,
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Validation failed');
    });

    it('should use config errorMessage when expression returns boolean false', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: false,
      });

      // Act
      const result = await service.executeValidators(
        [
          {
            code: 'function validation(value) { return value > 0; }',
            errorMessage: 'Value must be positive',
          },
        ],
        undefined,
        -1,
        defaultContext,
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Value must be positive');
    });

    it('should prioritize result.error over config errorMessage', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: { isValid: false, error: 'Must be positive' },
      });

      // Act
      const result = await service.executeValidators(
        [
          {
            code: 'function validation(value) { return { isValid: false, error: "Must be positive" }; }',
            errorMessage: 'Config error message',
          },
        ],
        undefined,
        -1,
        defaultContext,
      );

      // Assert
      expect(result.errors[0].message).toBe('Must be positive');
    });

    it('should execute multiple inline codes', async () => {
      // Arrange
      expressionEvaluator.evaluate
        .mockResolvedValueOnce({ success: true, value: true })
        .mockResolvedValueOnce({ success: true, value: false });

      // Act
      const result = await service.executeValidators(
        [
          { code: 'function validation(value) { return value > 0; }' },
          { code: 'function validation(value) { return value < 0; }' },
        ],
        undefined,
        100,
        defaultContext,
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(expressionEvaluator.evaluate).toHaveBeenCalledTimes(2);
    });

    it('should execute registry validators by ID', async () => {
      // Arrange
      validationRegistryService.findOne.mockResolvedValueOnce({
        validationCode: 'function validation(value) { return value > 0; }',
      } as any);
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });

      // Act
      const result = await service.executeValidators(
        undefined,
        ['validator-1'],
        100,
        defaultContext,
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(validationRegistryService.findOne).toHaveBeenCalledWith(
        'validator-1',
      );
    });

    it('should use registry errorMessage when expression returns false', async () => {
      // Arrange
      validationRegistryService.findOne.mockResolvedValueOnce({
        validationCode: 'function validation(value) { return false; }',
        errorMessage: 'Registry configured error',
      } as any);
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: false,
      });

      // Act
      const result = await service.executeValidators(
        undefined,
        ['validator-1'],
        100,
        defaultContext,
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Registry configured error');
    });

    it('should return default message when registry has no errorMessage', async () => {
      // Arrange
      validationRegistryService.findOne.mockResolvedValueOnce({
        validationCode: 'function validation(value) { return false; }',
      } as any);
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: false,
      });

      // Act
      const result = await service.executeValidators(
        undefined,
        ['validator-1'],
        100,
        defaultContext,
      );

      // Assert
      expect(result.errors[0].message).toBe('Validation failed');
    });

    it('should return error when registry has no validation code', async () => {
      // Arrange
      validationRegistryService.findOne.mockResolvedValueOnce({
        validationCode: null,
      } as any);

      // Act
      const result = await service.executeValidators(
        undefined,
        ['validator-1'],
        100,
        defaultContext,
      );

      // Assert - null code returns null (skip), not an error
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when registry lookup throws', async () => {
      // Arrange
      validationRegistryService.findOne.mockRejectedValueOnce(
        new Error('Not found'),
      );

      // Act
      const result = await service.executeValidators(
        undefined,
        ['validator-1'],
        100,
        defaultContext,
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe(
        'Validator "validator-1" execution failed',
      );
    });

    it('should execute both codes and registryIds', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });
      validationRegistryService.findOne.mockResolvedValueOnce({
        validationCode: 'function validation(value) { return false; }',
      } as any);
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: false,
      });

      // Act
      const result = await service.executeValidators(
        [{ code: 'function validation(value) { return true; }' }],
        ['validator-1'],
        100,
        defaultContext,
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(expressionEvaluator.evaluate).toHaveBeenCalledTimes(2);
    });

    it('should return valid when both codes and registryIds are undefined', async () => {
      // Act
      const result = await service.executeValidators(
        undefined,
        undefined,
        100,
        defaultContext,
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(expressionEvaluator.evaluate).not.toHaveBeenCalled();
    });

    it('should return valid when both codes and registryIds are empty arrays', async () => {
      // Act
      const result = await service.executeValidators(
        [],
        [],
        100,
        defaultContext,
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(expressionEvaluator.evaluate).not.toHaveBeenCalled();
    });

    it('should extract function name from code (e.g. "validate" instead of "validation")', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });

      // Act
      await service.executeValidators(
        [{ code: 'function validate(value) { return value.length > 0; }' }],
        undefined,
        'hello',
        defaultContext,
      );

      // Assert
      expect(expressionEvaluator.evaluate).toHaveBeenCalledWith(
        '(function validate(value) { return value.length > 0; })("hello")',
        expect.any(Object),
      );
    });

    it('should execute inline expression directly when no function declaration', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });

      // Act
      const result = await service.executeValidators(
        [{ code: 'getFormField("amount").value > 0' }],
        undefined,
        100,
        defaultContext,
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(expressionEvaluator.evaluate).toHaveBeenCalledWith(
        'getFormField("amount").value > 0',
        expect.any(Object),
      );
    });
  });

  // ===========================================================================
  // executeValidators — formValidators
  // ===========================================================================

  describe('executeValidators — formValidators', () => {
    it('should return valid when formValidator passes', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });

      // Act
      const result = await service.executeValidators(
        undefined,
        undefined,
        null,
        defaultContext,
        [{ code: 'getFormField("amount").value > 0' }],
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error with errorMessage when formValidator fails', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: false,
      });

      // Act
      const result = await service.executeValidators(
        undefined,
        undefined,
        null,
        defaultContext,
        [
          {
            code: 'getFormField("amount").value > 0',
            errorMessage: 'Amount must be positive',
          },
        ],
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toBe('Amount must be positive');
    });

    it('should prioritize result.error over errorMessage when formValidator returns error object', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: { isValid: false, error: 'Custom error from code' },
      });

      // Act
      const result = await service.executeValidators(
        undefined,
        undefined,
        null,
        defaultContext,
        [
          {
            code: 'function validation() { return { isValid: false, error: "Custom error from code" }; }',
            errorMessage: 'Config error',
          },
        ],
      );

      // Assert
      expect(result.errors[0].message).toBe('Custom error from code');
    });

    it('should return default message when formValidator fails without errorMessage', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: false,
      });

      // Act
      const result = await service.executeValidators(
        undefined,
        undefined,
        null,
        defaultContext,
        [{ code: 'false' }],
      );

      // Assert
      expect(result.errors[0].message).toBe('Validation failed');
    });

    it('should execute formValidators without injecting fieldValue', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });

      // Act
      await service.executeValidators(
        undefined,
        undefined,
        null,
        defaultContext,
        [{ code: 'getFormField("amount").value > 0' }],
      );

      // Assert — should pass code directly, not wrapped with fieldValue
      expect(expressionEvaluator.evaluate).toHaveBeenCalledWith(
        'getFormField("amount").value > 0',
        expect.any(Object),
      );
    });

    it('should execute both codes and formValidators when both provided', async () => {
      // Arrange
      expressionEvaluator.evaluate
        .mockResolvedValueOnce({ success: true, value: true })
        .mockResolvedValueOnce({ success: true, value: false });

      // Act
      const result = await service.executeValidators(
        [{ code: 'function validation(value) { return true; }' }],
        undefined,
        100,
        defaultContext,
        [{ code: 'false', errorMessage: 'Form check failed' }],
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Form check failed');
      expect(expressionEvaluator.evaluate).toHaveBeenCalledTimes(2);
    });
  });
});
