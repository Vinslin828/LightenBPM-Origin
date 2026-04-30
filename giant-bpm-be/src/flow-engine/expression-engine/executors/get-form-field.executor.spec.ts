/**
 * Unit Tests - GetFormFieldExecutor
 */

import { GetFormFieldExecutor } from './get-form-field.executor';
import { ExecutionContext } from '../types/execution-context';
import { FlowExecutionError } from '../../types';

describe('GetFormFieldExecutor', () => {
  let executor: GetFormFieldExecutor;

  beforeEach(() => {
    executor = new GetFormFieldExecutor();
  });

  describe('Success cases', () => {
    it('should return field object with value for existing field', async () => {
      const context: ExecutionContext = {
        formData: {
          amount: 1000,
          name: 'John Doe',
        },
      };

      const result = await executor.execute(['amount'], context);

      expect(result).toEqual({ value: 1000 });
    });

    it('should handle string field values', async () => {
      const context: ExecutionContext = {
        formData: {
          name: 'John Doe',
        },
      };

      const result = await executor.execute(['name'], context);

      expect(result).toEqual({ value: 'John Doe' });
    });

    it('should handle boolean field values', async () => {
      const context: ExecutionContext = {
        formData: {
          approved: true,
        },
      };

      const result = await executor.execute(['approved'], context);

      expect(result).toEqual({ value: true });
    });

    it('should handle null field values', async () => {
      const context: ExecutionContext = {
        formData: {
          optional: null,
        },
      };

      const result = await executor.execute(['optional'], context);

      expect(result).toEqual({ value: null });
    });

    it('should handle zero as valid value', async () => {
      const context: ExecutionContext = {
        formData: {
          count: 0,
        },
      };

      const result = await executor.execute(['count'], context);

      expect(result).toEqual({ value: 0 });
    });

    it('should handle empty string as valid value', async () => {
      const context: ExecutionContext = {
        formData: {
          description: '',
        },
      };

      const result = await executor.execute(['description'], context);

      expect(result).toEqual({ value: '' });
    });
  });

  describe('Error cases', () => {
    it('should throw error when no arguments provided', async () => {
      const context: ExecutionContext = {
        formData: { amount: 1000 },
      };

      await expect(executor.execute([], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute([], context)).rejects.toThrow(
        'getFormField() expects exactly 1 argument, got 0',
      );
    });

    it('should throw error when multiple arguments provided', async () => {
      const context: ExecutionContext = {
        formData: { amount: 1000 },
      };

      await expect(
        executor.execute(['amount', 'extra'], context),
      ).rejects.toThrow(FlowExecutionError);
      await expect(
        executor.execute(['amount', 'extra'], context),
      ).rejects.toThrow('getFormField() expects exactly 1 argument, got 2');
    });

    it('should throw error when formData is not provided in context', async () => {
      const context: ExecutionContext = {};

      await expect(executor.execute(['amount'], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute(['amount'], context)).rejects.toThrow(
        'formData is required in execution context',
      );
    });
  });

  describe('Missing field handling', () => {
    it('should return undefined when field does not exist in formData', async () => {
      // Arrange
      const context: ExecutionContext = {
        formData: { amount: 1000 },
      };

      // Act
      const result = await executor.execute(['nonexistent'], context);

      // Assert
      expect(result).toEqual({ value: undefined });
    });

    it('should return undefined when field is not provided by user', async () => {
      // Arrange
      const context: ExecutionContext = {
        formData: {
          required_field: 'value',
          // optional_field is not provided
        },
      };

      // Act
      const result = await executor.execute(['optional_field'], context);

      // Assert
      expect(result).toEqual({ value: undefined });
    });
  });

  describe('Currency field', () => {
    it('should return currency object directly when value is currency-shaped', async () => {
      // Arrange
      const context: ExecutionContext = {
        formData: {
          price: { value: 9999, currencyCode: 'TWD' },
        },
      };

      // Act
      const result = await executor.execute(['price'], context);

      // Assert
      expect(result).toEqual({ value: 9999, currencyCode: 'TWD' });
    });

    it('should wrap as value when object has numeric value but missing currencyCode', async () => {
      // Arrange
      const context: ExecutionContext = {
        formData: {
          partial: { value: 9999 },
        },
      };

      // Act
      const result = await executor.execute(['partial'], context);

      // Assert
      expect(result).toEqual({ value: { value: 9999 } });
    });

    it('should wrap as value when currencyCode is not a string', async () => {
      // Arrange
      const context: ExecutionContext = {
        formData: {
          weird: { value: 9999, currencyCode: 123 },
        },
      };

      // Act
      const result = await executor.execute(['weird'], context);

      // Assert
      expect(result).toEqual({ value: { value: 9999, currencyCode: 123 } });
    });
  });

  describe('Edge cases', () => {
    it('should handle field names with special characters', async () => {
      const context: ExecutionContext = {
        formData: {
          'field-with-dash': 100,
          field_with_underscore: 200,
        },
      };

      const result1 = await executor.execute(['field-with-dash'], context);
      const result2 = await executor.execute(
        ['field_with_underscore'],
        context,
      );

      expect(result1).toEqual({ value: 100 });
      expect(result2).toEqual({ value: 200 });
    });

    it('should handle nested object values', async () => {
      const context: ExecutionContext = {
        formData: {
          user: {
            name: 'John',
            age: 30,
          },
        },
      };

      const result = await executor.execute(['user'], context);

      expect(result).toEqual({
        value: { name: 'John', age: 30 },
      });
    });

    it('should handle array values', async () => {
      const context: ExecutionContext = {
        formData: {
          tags: ['tag1', 'tag2', 'tag3'],
        },
      };

      const result = await executor.execute(['tags'], context);

      expect(result).toEqual({
        value: ['tag1', 'tag2', 'tag3'],
      });
    });
  });
});
