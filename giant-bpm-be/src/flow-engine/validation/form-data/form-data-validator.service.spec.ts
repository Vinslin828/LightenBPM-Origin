/**
 * Unit Tests - FormDataValidatorService
 */

import { FormDataValidatorService } from './form-data-validator.service';
import {
  NodeType,
  ErrorCode,
  FlowDefinition,
  FormSchema,
  FormFieldAttributes,
} from '../../types';

describe('FormDataValidatorService', () => {
  let service: FormDataValidatorService;

  beforeEach(() => {
    service = new FormDataValidatorService();
  });

  // ===========================================================================
  // Helpers
  // ===========================================================================

  /**
   * Build a minimal flow definition that references the given field names via
   * a CONDITION node (so `getReferencedFieldNames` picks them up).
   */
  const createFlow = (fieldNames: string[]): FlowDefinition => ({
    version: 1,
    nodes: [
      { key: 'start', type: NodeType.START, next: 'condition' },
      {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          ...fieldNames.map((name) => ({
            branch: {
              field: `getFormField("${name}").value`,
              operator: 'equals',
              value: 'x',
            },
            next: 'end',
          })),
          { branch: null, next: 'end' },
        ],
      },
      { key: 'end', type: NodeType.END },
    ],
  });

  /**
   * Build a form schema from a simple list of field definitions.
   */
  const createSchema = (
    fields: Array<{
      name: string;
      type:
        | 'input'
        | 'text'
        | 'number'
        | 'date'
        | 'radio'
        | 'checkbox'
        | 'dropdown'
        | 'currency'
        | 'expression';
      inputType?: 'text' | 'number';
      multipleSelection?: boolean;
    }>,
  ): FormSchema => {
    const entities: FormSchema['entities'] = {};
    const root: string[] = [];

    fields.forEach((field) => {
      const uuid = `${field.name}-uuid`;
      root.push(uuid);

      const attributes: FormFieldAttributes = {
        name: field.name,
        inputType: field.inputType,
      };

      if (field.type === 'dropdown' && field.multipleSelection !== undefined) {
        attributes.selectAdvancedSetting = {
          multipleSelection: field.multipleSelection,
          searchInOptions: false,
        };
      }

      entities[uuid] = {
        type: field.type,
        attributes,
      };
    });

    return { root, entities };
  };

  // ===========================================================================
  // Number field
  // ===========================================================================

  describe('number field', () => {
    it('should accept value when input is a valid number', () => {
      // Arrange
      const flow = createFlow(['age']);
      const schema = createSchema([
        { name: 'age', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { age: 25 },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData).toEqual({ age: 25 });
    });

    it('should coerce value to number when input is numeric string', () => {
      // Arrange
      const flow = createFlow(['age']);
      const schema = createSchema([
        { name: 'age', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { age: '25' },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData).toEqual({ age: 25 });
    });

    it('should return TYPE_CONVERSION_FAILED when number input is not numeric', () => {
      // Arrange
      const flow = createFlow(['age']);
      const schema = createSchema([
        { name: 'age', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { age: 'invalid' },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(
        ErrorCode.FORM_DATA_TYPE_CONVERSION_FAILED,
      );
      expect(result.errors[0].message).toContain(
        "Field 'age' cannot be converted to number",
      );
    });

    it('should return TYPE_CONVERSION_FAILED when number input is null', () => {
      // Arrange
      const flow = createFlow(['age']);
      const schema = createSchema([
        { name: 'age', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { age: null },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(
        ErrorCode.FORM_DATA_TYPE_CONVERSION_FAILED,
      );
    });
  });

  // ===========================================================================
  // Text field
  // ===========================================================================

  describe('text field', () => {
    it('should accept value when input is a valid string', () => {
      // Arrange
      const flow = createFlow(['name']);
      const schema = createSchema([
        { name: 'name', type: 'input', inputType: 'text' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { name: 'John Doe' },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData).toEqual({ name: 'John Doe' });
    });

    it('should coerce value to string when input is a number', () => {
      // Arrange
      const flow = createFlow(['name']);
      const schema = createSchema([
        { name: 'name', type: 'input', inputType: 'text' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { name: 123 },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData).toEqual({ name: '123' });
    });

    it('should return TYPE_CONVERSION_FAILED when text input is null', () => {
      // Arrange
      const flow = createFlow(['name']);
      const schema = createSchema([
        { name: 'name', type: 'input', inputType: 'text' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { name: null },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(
        ErrorCode.FORM_DATA_TYPE_CONVERSION_FAILED,
      );
    });
  });

  // ===========================================================================
  // Date field
  // ===========================================================================

  describe('date field', () => {
    it('should accept value when input is a valid Unix timestamp', () => {
      // Arrange
      const flow = createFlow(['birthdate']);
      const schema = createSchema([{ name: 'birthdate', type: 'date' }]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { birthdate: 1609459200 },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData).toEqual({ birthdate: 1609459200 });
    });

    it('should coerce value to number when input is numeric timestamp string', () => {
      // Arrange
      const flow = createFlow(['birthdate']);
      const schema = createSchema([{ name: 'birthdate', type: 'date' }]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { birthdate: '1609459200' },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData).toEqual({ birthdate: 1609459200 });
    });

    it('should return TYPE_CONVERSION_FAILED when timestamp is negative', () => {
      // Arrange
      const flow = createFlow(['birthdate']);
      const schema = createSchema([{ name: 'birthdate', type: 'date' }]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { birthdate: -123 },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(
        ErrorCode.FORM_DATA_TYPE_CONVERSION_FAILED,
      );
      expect(result.errors[0].message).toContain('valid Unix timestamp');
    });

    it('should return TYPE_CONVERSION_FAILED when date input is non-numeric string', () => {
      // Arrange
      const flow = createFlow(['birthdate']);
      const schema = createSchema([{ name: 'birthdate', type: 'date' }]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { birthdate: 'invalid-date' },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(
        ErrorCode.FORM_DATA_TYPE_CONVERSION_FAILED,
      );
    });
  });

  // ===========================================================================
  // Checkbox field
  // ===========================================================================

  describe('checkbox field', () => {
    it('should accept value when input is a string array', () => {
      // Arrange
      const flow = createFlow(['interests']);
      const schema = createSchema([{ name: 'interests', type: 'checkbox' }]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { interests: ['sports', 'music'] },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData).toEqual({ interests: ['sports', 'music'] });
    });

    it('should coerce option objects to string array when input has value property', () => {
      // Arrange
      const flow = createFlow(['interests']);
      const schema = createSchema([{ name: 'interests', type: 'checkbox' }]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        {
          interests: [
            { key: 'option_1', label: 'Option 1', value: 'option_1' },
            { key: 'option_2', label: 'Option 2', value: 'option_2' },
          ],
        },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData).toEqual({
        interests: ['option_1', 'option_2'],
      });
    });
  });

  // ===========================================================================
  // Dropdown field
  // ===========================================================================

  describe('dropdown field', () => {
    it('should accept value when single-select dropdown input is a string', () => {
      // Arrange
      const flow = createFlow(['category']);
      const schema = createSchema([
        { name: 'category', type: 'dropdown', multipleSelection: false },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { category: 'electronics' },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData).toEqual({ category: 'electronics' });
    });

    it('should accept value when multi-select dropdown input is a string array', () => {
      // Arrange
      const flow = createFlow(['categories']);
      const schema = createSchema([
        { name: 'categories', type: 'dropdown', multipleSelection: true },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { categories: ['electronics', 'computers'] },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData).toEqual({
        categories: ['electronics', 'computers'],
      });
    });
  });

  // ===========================================================================
  // Currency field
  // ===========================================================================

  describe('currency field', () => {
    it('should accept value when input is a valid currency object', () => {
      // Arrange
      const flow = createFlow(['price']);
      const schema = createSchema([{ name: 'price', type: 'currency' }]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { price: { value: 9999, currencyCode: 'TWD' } },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData).toEqual({
        price: { value: 9999, currencyCode: 'TWD' },
      });
    });

    it('should coerce numeric string when value field is a string', () => {
      // Arrange
      const flow = createFlow(['price']);
      const schema = createSchema([{ name: 'price', type: 'currency' }]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { price: { value: '9999', currencyCode: 'TWD' } },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData).toEqual({
        price: { value: 9999, currencyCode: 'TWD' },
      });
    });

    it('should return TYPE_CONVERSION_FAILED when currency input is a plain number', () => {
      // Arrange
      const flow = createFlow(['price']);
      const schema = createSchema([{ name: 'price', type: 'currency' }]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { price: 9999 },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(
        ErrorCode.FORM_DATA_TYPE_CONVERSION_FAILED,
      );
      expect(result.errors[0].message).toContain('currency object');
    });

    it('should return TYPE_CONVERSION_FAILED when currencyCode is missing', () => {
      // Arrange
      const flow = createFlow(['price']);
      const schema = createSchema([{ name: 'price', type: 'currency' }]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { price: { value: 9999 } },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(
        ErrorCode.FORM_DATA_TYPE_CONVERSION_FAILED,
      );
    });
  });

  // ===========================================================================
  // Required field
  // ===========================================================================

  describe('required field', () => {
    it('should return FIELD_MISSING when required field is not provided', () => {
      // Arrange
      const flow = createFlow(['age']);
      const schema = createSchema([
        { name: 'age', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        {},
        new Set(['age']),
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.FORM_DATA_FIELD_MISSING);
      expect(result.errors[0].message).toContain(
        "Field 'age' is required by the workflow",
      );
    });

    it('should accept input when optional field is not provided', () => {
      // Arrange
      const flow = createFlow(['age']);
      const schema = createSchema([
        { name: 'age', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        {},
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept input when required field is provided', () => {
      // Arrange
      const flow = createFlow(['age']);
      const schema = createSchema([
        { name: 'age', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { age: 25 },
        new Set(['age']),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData).toEqual({ age: 25 });
    });
  });

  // ===========================================================================
  // Expression component field
  // ===========================================================================

  describe('expression field', () => {
    it('should accept null and store as null in coerced data', () => {
      // Arrange
      const flow = createFlow(['expression_a']);
      const schema = createSchema([
        { name: 'expression_a', type: 'expression' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { expression_a: null },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData?.expression_a).toBeNull();
    });

    it('should accept undefined and store as null in coerced data', () => {
      // Arrange
      const flow = createFlow(['expression_a']);
      const schema = createSchema([
        { name: 'expression_a', type: 'expression' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { expression_a: undefined },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData?.expression_a).toBeNull();
    });

    it('should coerce primitive values to string (default TEXT behaviour)', () => {
      // Arrange
      const flow = createFlow(['expression_a']);
      const schema = createSchema([
        { name: 'expression_a', type: 'expression' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { expression_a: 123 },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData?.expression_a).toBe('123');
    });

    it('should still reject objects (cannot be coerced to string)', () => {
      // Arrange
      const flow = createFlow(['expression_a']);
      const schema = createSchema([
        { name: 'expression_a', type: 'expression' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { expression_a: { nested: true } },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe(
        ErrorCode.FORM_DATA_TYPE_CONVERSION_FAILED,
      );
    });
  });

  // ===========================================================================
  // Extra fields (not referenced by flow)
  // ===========================================================================

  describe('extra fields', () => {
    it('should return FIELD_NOT_IN_SCHEMA when extra field is not in schema', () => {
      // Arrange
      const flow = createFlow(['age']);
      const schema = createSchema([
        { name: 'age', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { age: 25, extra_field: 'value' },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(
        ErrorCode.FORM_DATA_FIELD_NOT_IN_SCHEMA,
      );
      expect(result.errors[0].message).toContain(
        "Field 'extra_field' is not defined in form schema",
      );
    });

    it('should validate extra field when extra field exists in schema', () => {
      // Arrange
      const flow = createFlow(['age']);
      const schema = createSchema([
        { name: 'age', type: 'input', inputType: 'number' },
        { name: 'name', type: 'input', inputType: 'text' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { age: 25, name: 'John' },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.coercedData).toEqual({ age: 25, name: 'John' });
    });
  });

  // ===========================================================================
  // Multiple errors
  // ===========================================================================

  describe('multiple errors', () => {
    it('should return all errors when multiple fields fail validation', () => {
      // Arrange
      const flow = createFlow(['age', 'salary']);
      const schema = createSchema([
        { name: 'age', type: 'input', inputType: 'number' },
        { name: 'salary', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateAndCoerceFormData(
        flow,
        schema,
        { age: 'invalid', salary: 'also-invalid' },
        new Set(),
      );

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(result.errors.some((e) => e.message.includes("Field 'age'"))).toBe(
        true,
      );
      expect(
        result.errors.some((e) => e.message.includes("Field 'salary'")),
      ).toBe(true);
    });
  });
});
