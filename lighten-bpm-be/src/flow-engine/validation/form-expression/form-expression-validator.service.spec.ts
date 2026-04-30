/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/unbound-method */
/**
 * Unit Tests - FormExpressionValidatorService
 */

import { FormExpressionValidatorService } from './form-expression-validator.service';
import { ValidationRegistryService } from '../../../validation-registry/validation-registry.service';
import { ErrorCode } from '../../types/validation.types';
import { FormSchema, FormValidation } from '../../types/form-schema.types';

describe('FormExpressionValidatorService', () => {
  let service: FormExpressionValidatorService;
  let validationRegistryService: jest.Mocked<ValidationRegistryService>;

  beforeEach(() => {
    validationRegistryService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<ValidationRegistryService>;

    service = new FormExpressionValidatorService(validationRegistryService);
  });

  // =========================================================================
  // validateFormExpressions - Component Validators
  // =========================================================================

  describe('component validators', () => {
    it('should return valid when componentValidator has valid boolean expression', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'text',
            attributes: {
              name: 'text_field',
              validator: {
                required: true,
                componentValidator: {
                  code: 'getFormField("text_field").value.length > 0',
                },
              },
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid when componentValidator has valid validation result expression', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'text',
            attributes: {
              name: 'text_field',
              validator: {
                required: true,
                componentValidator: {
                  code: 'function validate() { return { isValid: true, error: "" }; }',
                },
              },
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when componentValidator has invalid expression', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'text',
            attributes: {
              name: 'text_field',
              validator: {
                required: true,
                componentValidator: {
                  code: 'getFormField("text_field").value + 100', // Returns number, not boolean
                },
              },
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.INVALID_EXPRESSION);
      expect(result.errors[0].message).toContain('text_field');
    });

    it('should skip validation when validator.required is false', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'text',
            attributes: {
              name: 'text_field',
              validator: {
                required: false,
                componentValidator: {
                  code: 'invalid expression !!!',
                },
              },
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip validation when componentValidator.code is not provided', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'text',
            attributes: {
              name: 'text_field',
              validator: {
                required: true,
                componentValidator: {},
              },
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // =========================================================================
  // validateFormExpressions - Registry Validators
  // =========================================================================

  describe('registry validators', () => {
    it('should return valid when registryValidator has valid expression', async () => {
      // Arrange
      validationRegistryService.findOne.mockResolvedValueOnce({
        validationCode: 'getFormField("amount").value > 0',
      } as any);

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
                  {
                    validatorId: 'validator-123',
                  },
                ],
              },
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when registryValidator has invalid expression', async () => {
      // Arrange
      validationRegistryService.findOne.mockResolvedValueOnce({
        validationCode: '"not a boolean expression"',
      } as any);

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
                  {
                    validatorId: 'validator-123',
                  },
                ],
              },
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.INVALID_EXPRESSION);
    });

    it('should return invalid when registryValidator is not found', async () => {
      // Arrange
      validationRegistryService.findOne.mockRejectedValueOnce(
        new Error('Validation rule with ID "invalid-id" not found'),
      );

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
                  {
                    validatorId: 'invalid-id',
                  },
                ],
              },
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.REFERENCE_NOT_FOUND);
    });

    it('should return invalid when registryValidator has no validation code', async () => {
      // Arrange
      validationRegistryService.findOne.mockResolvedValueOnce({
        validationCode: null,
      } as any);

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
                  {
                    validatorId: 'validator-123',
                  },
                ],
              },
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.INVALID_EXPRESSION);
      expect(result.errors[0].message).toContain('no validation code');
    });

    it('should validate multiple registryValidators in array', async () => {
      // Arrange
      validationRegistryService.findOne
        .mockResolvedValueOnce({
          validationCode: 'getFormField("amount").value > 0',
        } as any)
        .mockResolvedValueOnce({
          validationCode: '"invalid expression"', // Invalid - returns string
        } as any);

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
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(validationRegistryService.findOne).toHaveBeenCalledTimes(2);
    });

    it('should skip registryValidator without validatorId', async () => {
      // Arrange
      validationRegistryService.findOne.mockResolvedValueOnce({
        validationCode: 'true',
      } as any);

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
                  { validatorId: undefined }, // Should be skipped
                  { validatorId: 'validator-1' },
                ],
              },
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(true);
      expect(validationRegistryService.findOne).toHaveBeenCalledTimes(1);
      expect(validationRegistryService.findOne).toHaveBeenCalledWith(
        'validator-1',
      );
    });
  });

  // =========================================================================
  // validateFormExpressions - Form-level Validators
  // =========================================================================

  describe('form-level validators', () => {
    it('should return valid when form-level validator has valid expression', async () => {
      // Arrange
      const validation: FormValidation = {
        required: true,
        validators: [
          {
            key: 'validator_1',
            code: 'getFormField("amount").value > 0',
          },
        ],
      };

      // Act
      const result = await service.validateFormExpressions(null, validation);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return invalid when form-level validator has invalid expression', async () => {
      // Arrange
      const validation: FormValidation = {
        required: true,
        validators: [
          {
            key: 'validator_1',
            code: 'getFormField("amount").value + 100',
          },
        ],
      };

      // Act
      const result = await service.validateFormExpressions(null, validation);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.INVALID_EXPRESSION);
      expect(result.errors[0].message).toContain('validator_1');
    });

    it('should skip validation when validation.required is false', async () => {
      // Arrange
      const validation: FormValidation = {
        required: false,
        validators: [
          {
            key: 'validator_1',
            code: 'invalid expression !!!',
          },
        ],
      };

      // Act
      const result = await service.validateFormExpressions(null, validation);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate multiple form-level validators', async () => {
      // Arrange
      const validation: FormValidation = {
        required: true,
        validators: [
          {
            key: 'validator_1',
            code: 'true',
          },
          {
            key: 'validator_2',
            code: '"invalid"', // Returns string, not boolean
          },
          {
            key: 'validator_3',
            code: 'false',
          },
        ],
      };

      // Act
      const result = await service.validateFormExpressions(null, validation);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('validator_2');
    });

    it('should use index as key when validator.key is not provided', async () => {
      // Arrange
      const validation: FormValidation = {
        required: true,
        validators: [
          {
            code: '"invalid"',
          },
        ],
      };

      // Act
      const result = await service.validateFormExpressions(null, validation);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('validator_0');
    });
  });

  // =========================================================================
  // getCurrentNode() restriction
  // =========================================================================

  describe('getCurrentNode() restriction', () => {
    it('should return invalid when componentValidator uses getCurrentNode()', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'text',
            attributes: {
              name: 'text_field',
              validator: {
                required: true,
                componentValidator: {
                  code: 'getCurrentNode().approverId.length > 0',
                },
              },
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.INVALID_EXPRESSION);
      expect(result.errors[0].message).toContain(
        'can only be used in approval node expressions',
      );
    });

    it('should return invalid when registryValidator uses getCurrentNode()', async () => {
      // Arrange
      validationRegistryService.findOne.mockResolvedValueOnce({
        validationCode: 'getCurrentNode().approverId.length > 0',
      } as any);

      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
              validator: {
                required: true,
                registryValidators: [{ validatorId: 'validator-123' }],
              },
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.INVALID_EXPRESSION);
      expect(result.errors[0].message).toContain(
        'can only be used in approval node expressions',
      );
    });

    it('should return invalid when form-level validator uses getCurrentNode()', async () => {
      // Arrange
      const validation: FormValidation = {
        required: true,
        validators: [
          {
            key: 'validator_1',
            code: 'getCurrentNode().approverId.length > 0',
          },
        ],
      };

      // Act
      const result = await service.validateFormExpressions(null, validation);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.INVALID_EXPRESSION);
      expect(result.errors[0].message).toContain(
        'can only be used in approval node expressions',
      );
    });
  });

  // =========================================================================
  // validateFormExpressions - Combined Scenarios
  // =========================================================================

  describe('combined scenarios', () => {
    it('should validate both form schema and form-level validators', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'text',
            attributes: {
              name: 'text_field',
              validator: {
                required: true,
                componentValidator: {
                  code: '"invalid component"',
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
            key: 'form_validator',
            code: '"invalid form"',
          },
        ],
      };

      // Act
      const result = await service.validateFormExpressions(
        formSchema,
        validation,
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should return valid when formSchema and validation are null', async () => {
      // Act
      const result = await service.validateFormExpressions(null, null);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid when formSchema has no entities', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: [],
        entities: {},
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // =========================================================================
  // validateFormExpressions - Expression Components
  // =========================================================================

  describe('expression components', () => {
    it('should return valid when expression component has valid syntax', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: ['field-1', 'expr-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: { name: 'amount' },
          },
          'expr-1': {
            type: 'expression',
            attributes: {
              name: 'expression_abc',
              expression: 'getFormField("amount").value * 1.05',
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when expression component has no expression', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: ['expr-1'],
        entities: {
          'expr-1': {
            type: 'expression',
            attributes: {
              name: 'expression_abc',
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.INVALID_EXPRESSION);
      expect(result.errors[0].message).toContain('has no expression');
    });

    it('should return error when expression component has syntax error', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: ['expr-1'],
        entities: {
          'expr-1': {
            type: 'expression',
            attributes: {
              name: 'expression_abc',
              expression: 'getFormField("amount").value >',
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.INVALID_EXPRESSION);
      expect(result.errors[0].message).toContain('invalid syntax');
    });

    it('should return error when expression component uses getCurrentNode()', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: ['expr-1'],
        entities: {
          'expr-1': {
            type: 'expression',
            attributes: {
              name: 'expression_abc',
              expression: 'getCurrentNode().approverId',
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.INVALID_EXPRESSION);
      expect(result.errors[0].message).toContain(
        'can only be used in approval node expressions',
      );
    });

    it('should return error when expression component references non-existent field', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: ['expr-1'],
        entities: {
          'expr-1': {
            type: 'expression',
            attributes: {
              name: 'expression_abc',
              expression: 'getFormField("non_existent").value * 2',
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.FORM_FIELD_NOT_FOUND);
      expect(result.errors[0].message).toContain('non_existent');
    });

    it('should skip non-expression type components', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: ['field-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when expression references existing field', async () => {
      // Arrange
      const formSchema: FormSchema = {
        root: ['field-1', 'expr-1'],
        entities: {
          'field-1': {
            type: 'number',
            attributes: {
              name: 'amount',
            },
          },
          'expr-1': {
            type: 'expression',
            attributes: {
              name: 'expression_calc',
              expression: 'getFormField("amount").value * 1.05',
            },
          },
        },
      };

      // Act
      const result = await service.validateFormExpressions(formSchema, null);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
