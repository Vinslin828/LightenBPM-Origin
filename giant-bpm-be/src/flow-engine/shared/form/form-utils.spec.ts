/**
 * Unit Tests - Form Utilities
 *
 * Test Structure:
 *   1. findFieldByName - Find field in form schema
 *   2. findMissingFieldsInSchema - Find missing fields in schema
 *   3. getFormFieldType - Get effective type of form field
 *   4. isOperatorCompatibleWithFormField - Check operator-field compatibility
 *   5. isReferenceValue - Check if value is a reference
 */

import {
  findFieldByName,
  findMissingFieldsInSchema,
  getFormFieldType,
  isOperatorCompatibleWithFormField,
  isReferenceValue,
} from './form-utils';
import {
  FormSchema,
  ComparisonOperator,
  FormFieldEntity,
  FORM_FIELD_VALUE_TYPES,
} from '../../types';

describe('Form Utilities', () => {
  // ===========================================================================
  // findFieldByName
  // ===========================================================================

  describe('findFieldByName', () => {
    it('should return field when name exists in schema', () => {
      // Arrange
      const schema: FormSchema = {
        root: ['field1-uuid'],
        entities: {
          'field1-uuid': {
            attributes: { name: 'amount' },
            type: 'number',
          },
        },
      };

      // Act
      const result = findFieldByName(schema, 'amount');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.attributes.name).toBe('amount');
    });

    it('should return correct field when multiple fields exist in schema', () => {
      // Arrange
      const schema: FormSchema = {
        root: ['field1-uuid', 'field2-uuid', 'field3-uuid'],
        entities: {
          'field1-uuid': {
            attributes: { name: 'amount' },
            type: 'number',
          },
          'field2-uuid': {
            attributes: { name: 'description' },
            type: 'text',
          },
          'field3-uuid': {
            attributes: { name: 'department', inputType: 'text' },
            type: 'input',
          },
        },
      };

      // Act
      const result = findFieldByName(schema, 'description');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.attributes.name).toBe('description');
    });

    it('should return field when name contains underscores', () => {
      // Arrange
      const schema: FormSchema = {
        root: ['field1-uuid'],
        entities: {
          'field1-uuid': {
            attributes: { name: 'user_name' },
            type: 'text',
          },
        },
      };

      // Act
      const result = findFieldByName(schema, 'user_name');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.attributes.name).toBe('user_name');
    });

    it('should return null when field does not exist in schema', () => {
      // Arrange
      const schema: FormSchema = {
        root: ['field1-uuid'],
        entities: {
          'field1-uuid': {
            attributes: { name: 'amount' },
            type: 'number',
          },
        },
      };

      // Act
      const result = findFieldByName(schema, 'nonexistent');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when schema has no entities', () => {
      // Arrange
      const schema: FormSchema = {
        root: [],
        entities: {},
      };

      // Act
      const result = findFieldByName(schema, 'amount');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when name case does not match', () => {
      // Arrange
      const schema: FormSchema = {
        root: ['field1-uuid'],
        entities: {
          'field1-uuid': {
            attributes: { name: 'Amount' },
            type: 'number',
          },
        },
      };

      // Act
      const result = findFieldByName(schema, 'amount');

      // Assert
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // findMissingFieldsInSchema
  // ===========================================================================

  describe('findMissingFieldsInSchema', () => {
    const createSchema = (fieldNames: string[]): FormSchema => {
      const entities: FormSchema['entities'] = {};
      const root: string[] = [];

      fieldNames.forEach((name, index) => {
        const uuid = `field-${index}-uuid`;
        root.push(uuid);
        entities[uuid] = {
          type: 'text',
          attributes: { name },
        };
      });

      return { root, entities };
    };

    it('should return empty array when all fields exist in schema', () => {
      // Arrange
      const schema = createSchema(['amount', 'description', 'status']);
      const fieldNames = ['amount', 'description'];

      // Act
      const result = findMissingFieldsInSchema(fieldNames, schema);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return missing field when one field does not exist', () => {
      // Arrange
      const schema = createSchema(['amount', 'description']);
      const fieldNames = ['amount', 'status'];

      // Act
      const result = findMissingFieldsInSchema(fieldNames, schema);

      // Assert
      expect(result).toEqual(['status']);
    });

    it('should return all missing fields when multiple fields do not exist', () => {
      // Arrange
      const schema = createSchema(['amount']);
      const fieldNames = ['description', 'status', 'department'];

      // Act
      const result = findMissingFieldsInSchema(fieldNames, schema);

      // Assert
      expect(result).toEqual(['description', 'status', 'department']);
    });

    it('should return unique missing fields when input has duplicates', () => {
      // Arrange
      const schema = createSchema(['amount']);
      const fieldNames = ['status', 'status', 'description', 'status'];

      // Act
      const result = findMissingFieldsInSchema(fieldNames, schema);

      // Assert
      expect(result).toEqual(['status', 'description']);
    });

    it('should return empty array when no fields to check', () => {
      // Arrange
      const schema = createSchema(['amount', 'description']);
      const fieldNames: string[] = [];

      // Act
      const result = findMissingFieldsInSchema(fieldNames, schema);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return all fields when schema is empty', () => {
      // Arrange
      const schema: FormSchema = { root: [], entities: {} };
      const fieldNames = ['amount', 'description'];

      // Act
      const result = findMissingFieldsInSchema(fieldNames, schema);

      // Assert
      expect(result).toEqual(['amount', 'description']);
    });
  });

  // ===========================================================================
  // getFormFieldType
  // ===========================================================================

  describe('getFormFieldType', () => {
    it('should return number when field type is number', () => {
      // Arrange
      const field: FormFieldEntity = {
        type: 'number',
        attributes: { name: 'amount' },
      };

      // Act
      const result = getFormFieldType(field);

      // Assert
      expect(result).toBe(FORM_FIELD_VALUE_TYPES.NUMBER);
    });

    it('should return text when field type is text', () => {
      // Arrange
      const field: FormFieldEntity = {
        type: 'text',
        attributes: { name: 'description' },
      };

      // Act
      const result = getFormFieldType(field);

      // Assert
      expect(result).toBe(FORM_FIELD_VALUE_TYPES.TEXT);
    });

    it('should return date when field type is date', () => {
      // Arrange
      const field: FormFieldEntity = {
        type: 'date',
        attributes: { name: 'submit_date' },
      };

      // Act
      const result = getFormFieldType(field);

      // Assert
      expect(result).toBe(FORM_FIELD_VALUE_TYPES.DATE);
    });

    it('should return radio when field type is radio', () => {
      // Arrange
      const field: FormFieldEntity = {
        type: 'radio',
        attributes: { name: 'gender' },
      };

      // Act
      const result = getFormFieldType(field);

      // Assert
      expect(result).toBe(FORM_FIELD_VALUE_TYPES.RADIO);
    });

    it('should return checkbox when field type is checkbox', () => {
      // Arrange
      const field: FormFieldEntity = {
        type: 'checkbox',
        attributes: { name: 'interests' },
      };

      // Act
      const result = getFormFieldType(field);

      // Assert
      expect(result).toBe(FORM_FIELD_VALUE_TYPES.CHECKBOX);
    });

    it('should return currency when field type is currency', () => {
      // Arrange
      const field: FormFieldEntity = {
        type: 'currency',
        attributes: { name: 'price' },
      };

      // Act
      const result = getFormFieldType(field);

      // Assert
      expect(result).toBe(FORM_FIELD_VALUE_TYPES.CURRENCY);
    });

    it('should return boolean when field type is toggle', () => {
      // Arrange
      const field: FormFieldEntity = {
        type: 'toggle',
        attributes: { name: 'is_enabled' },
      };

      // Act
      const result = getFormFieldType(field);

      // Assert
      expect(result).toBe(FORM_FIELD_VALUE_TYPES.BOOLEAN);
    });

    it('should return number when field type is input with inputType number', () => {
      // Arrange
      const field: FormFieldEntity = {
        type: 'input',
        attributes: { name: 'quantity', inputType: 'number' },
      };

      // Act
      const result = getFormFieldType(field);

      // Assert
      expect(result).toBe(FORM_FIELD_VALUE_TYPES.NUMBER);
    });

    it('should return text when field type is input with inputType text', () => {
      // Arrange
      const field: FormFieldEntity = {
        type: 'input',
        attributes: { name: 'user_name', inputType: 'text' },
      };

      // Act
      const result = getFormFieldType(field);

      // Assert
      expect(result).toBe(FORM_FIELD_VALUE_TYPES.TEXT);
    });

    it('should return text when field type is input without inputType', () => {
      // Arrange
      const field: FormFieldEntity = {
        type: 'input',
        attributes: { name: 'generic_input' },
      };

      // Act
      const result = getFormFieldType(field);

      // Assert
      expect(result).toBe(FORM_FIELD_VALUE_TYPES.TEXT);
    });

    it('should return dropdown when field type is dropdown with single selection', () => {
      // Arrange
      const field: FormFieldEntity = {
        type: 'dropdown',
        attributes: {
          name: 'category',
          selectAdvancedSetting: {
            multipleSelection: false,
          },
        },
      };

      // Act
      const result = getFormFieldType(field);

      // Assert
      expect(result).toBe(FORM_FIELD_VALUE_TYPES.DROPDOWN);
    });

    it('should return dropdown-multiple when field type is dropdown with multiple selection', () => {
      // Arrange
      const field: FormFieldEntity = {
        type: 'dropdown',
        attributes: {
          name: 'categories',
          selectAdvancedSetting: {
            multipleSelection: true,
          },
        },
      };

      // Act
      const result = getFormFieldType(field);

      // Assert
      expect(result).toBe(FORM_FIELD_VALUE_TYPES.DROPDOWN_MULTIPLE);
    });

    it('should return dropdown when field type is dropdown without selectAdvancedSetting', () => {
      // Arrange
      const field: FormFieldEntity = {
        type: 'dropdown',
        attributes: { name: 'category' },
      };

      // Act
      const result = getFormFieldType(field);

      // Assert
      expect(result).toBe(FORM_FIELD_VALUE_TYPES.DROPDOWN);
    });

    it('should return text when field type is unknown', () => {
      // Arrange
      const field: FormFieldEntity = {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        type: 'unknown' as any,
        attributes: { name: 'custom_field' },
      };

      // Act
      const result = getFormFieldType(field);

      // Assert
      expect(result).toBe(FORM_FIELD_VALUE_TYPES.TEXT);
    });
  });

  // ===========================================================================
  // isOperatorCompatibleWithFormField
  // ===========================================================================

  describe('isOperatorCompatibleWithFormField', () => {
    describe('numeric operators', () => {
      it('should return true for EQUAL when field type is number', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'number',
          attributes: { name: 'amount' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.EQUAL,
          field,
        );

        // Assert
        expect(result).toBe(true);
      });

      it('should return true for GREATER_THAN when field type is number', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'number',
          attributes: { name: 'amount' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.GREATER_THAN,
          field,
        );

        // Assert
        expect(result).toBe(true);
      });

      it('should return true for LESS_EQUAL when field type is input with inputType number', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'input',
          attributes: { name: 'quantity', inputType: 'number' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.LESS_EQUAL,
          field,
        );

        // Assert
        expect(result).toBe(true);
      });

      it('should return true for GREATER_THAN when field type is currency', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'currency',
          attributes: { name: 'price' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.GREATER_THAN,
          field,
        );

        // Assert
        expect(result).toBe(true);
      });

      it('should return true for EQUAL when field type is date', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'date',
          attributes: { name: 'submit_date' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.EQUAL,
          field,
        );

        // Assert
        expect(result).toBe(true);
      });

      it('should return true for GREATER_THAN when field type is date', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'date',
          attributes: { name: 'submit_date' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.GREATER_THAN,
          field,
        );

        // Assert
        expect(result).toBe(true);
      });

      it('should return false for EQUAL when field type is text', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'text',
          attributes: { name: 'description' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.EQUAL,
          field,
        );

        // Assert
        expect(result).toBe(false);
      });

      it('should return false for GREATER_THAN when field type is text', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'text',
          attributes: { name: 'description' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.GREATER_THAN,
          field,
        );

        // Assert
        expect(result).toBe(false);
      });
    });

    describe('string operators', () => {
      it('should return true for STRING_EQUAL when field type is text', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'text',
          attributes: { name: 'description' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.STRING_EQUAL,
          field,
        );

        // Assert
        expect(result).toBe(true);
      });

      it('should return true for CONTAINS when field type is text', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'text',
          attributes: { name: 'description' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.CONTAINS,
          field,
        );

        // Assert
        expect(result).toBe(true);
      });

      it('should return true for NOT_CONTAINS when field type is input with inputType text', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'input',
          attributes: { name: 'name', inputType: 'text' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.NOT_CONTAINS,
          field,
        );

        // Assert
        expect(result).toBe(true);
      });

      it('should return true for CONTAINS when field type is input without inputType', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'input',
          attributes: { name: 'name' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.CONTAINS,
          field,
        );

        // Assert
        expect(result).toBe(true);
      });

      it('should return false for STRING_EQUAL when field type is number', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'number',
          attributes: { name: 'amount' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.STRING_EQUAL,
          field,
        );

        // Assert
        expect(result).toBe(false);
      });

      it('should return false for CONTAINS when field type is number', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'number',
          attributes: { name: 'amount' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.CONTAINS,
          field,
        );

        // Assert
        expect(result).toBe(false);
      });

      it('should return false for STRING_EQUAL when field type is date', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'date',
          attributes: { name: 'submit_date' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.STRING_EQUAL,
          field,
        );

        // Assert
        expect(result).toBe(false);
      });

      it('should return false for CONTAINS when field type is date', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'date',
          attributes: { name: 'submit_date' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.CONTAINS,
          field,
        );

        // Assert
        expect(result).toBe(false);
      });

      it('should return true for STRING_EQUAL when field type is currency', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'currency',
          attributes: { name: 'price' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.STRING_EQUAL,
          field,
        );

        // Assert
        expect(result).toBe(true);
      });

      it('should return true for CONTAINS when field type is currency', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'currency',
          attributes: { name: 'price' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.CONTAINS,
          field,
        );

        // Assert
        expect(result).toBe(true);
      });

      it('should return false for GREATER_THAN when field type is input without inputType', () => {
        // Arrange
        const field: FormFieldEntity = {
          type: 'input',
          attributes: { name: 'name' },
        };

        // Act
        const result = isOperatorCompatibleWithFormField(
          ComparisonOperator.GREATER_THAN,
          field,
        );

        // Assert
        expect(result).toBe(false);
      });
    });
  });

  // ===========================================================================
  // isReferenceValue
  // ===========================================================================

  describe('isReferenceValue', () => {
    it('should return true when value has isReference true and reference string', () => {
      // Arrange
      const value = {
        isReference: true,
        reference: 'getApplicantProfile().name',
      };

      // Act
      const result = isReferenceValue(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when value has isReference true with existing resolved value', () => {
      // Arrange
      const value = {
        isReference: true,
        reference: 'getFormField("amount").value',
        value: 1000,
      };

      // Act
      const result = isReferenceValue(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when isReference is false', () => {
      // Arrange
      const value = {
        isReference: false,
        reference: 'getApplicantProfile().name',
      };

      // Act
      const result = isReferenceValue(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when isReference property is missing', () => {
      // Arrange
      const value = {
        reference: 'getApplicantProfile().name',
      };

      // Act
      const result = isReferenceValue(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when reference property is missing', () => {
      // Arrange
      const value = { isReference: true };

      // Act
      const result = isReferenceValue(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when reference is not a string', () => {
      // Arrange
      const value = { isReference: true, reference: 123 };

      // Act
      const result = isReferenceValue(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when value is null', () => {
      // Act
      const result = isReferenceValue(null);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when value is a string', () => {
      // Act
      const result = isReferenceValue('static value');

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when value is a number', () => {
      // Act
      const result = isReferenceValue(1000);

      // Assert
      expect(result).toBe(false);
    });
  });
});
