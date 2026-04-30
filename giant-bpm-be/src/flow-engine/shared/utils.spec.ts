/**
 * Unit Tests - Type Coercion Utilities
 *
 * Test Structure:
 *   1. coerceToNumber - Coerce values to number
 *   2. coerceToText - Coerce values to string
 *   3. coerceToBoolean - Coerce values to boolean
 *   4. coerceToTimestamp - Coerce values to Unix timestamp
 *   5. coerceToStringArray - Coerce values to string array
 *   6. coerceOptionObjectsToStringArray - Coerce option objects to string array
 */

import {
  coerceToNumber,
  coerceToText,
  coerceToBoolean,
  coerceToTimestamp,
  coerceToStringArray,
  coerceOptionObjectsToStringArray,
  coerceToCurrency,
} from './utils';

describe('Type Coercion Utils', () => {
  // ===========================================================================
  // coerceToNumber
  // ===========================================================================

  describe('coerceToNumber', () => {
    it('should return same number when value is already a number', () => {
      // Arrange
      const value = 42;

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBe(42);
    });

    it('should return zero when value is zero', () => {
      // Arrange
      const value = 0;

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBe(0);
    });

    it('should return negative number when value is negative', () => {
      // Arrange
      const value = -10;

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBe(-10);
    });

    it('should return decimal number when value is decimal', () => {
      // Arrange
      const value = 3.14;

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBe(3.14);
    });

    it('should return number when value is valid numeric string', () => {
      // Arrange
      const value = '123';

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBe(123);
    });

    it('should return negative number when value is negative numeric string', () => {
      // Arrange
      const value = '-456';

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBe(-456);
    });

    it('should return decimal when value is decimal string', () => {
      // Arrange
      const value = '3.14';

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBe(3.14);
    });

    it('should return number when string has leading and trailing whitespace', () => {
      // Arrange
      const value = '  123  ';

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBe(123);
    });

    it('should return null when value is NaN', () => {
      // Arrange
      const value = NaN;

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is Infinity', () => {
      // Arrange
      const value = Infinity;

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is negative Infinity', () => {
      // Arrange
      const value = -Infinity;

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is empty string', () => {
      // Arrange
      const value = '';

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is whitespace-only string', () => {
      // Arrange
      const value = '   ';

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is non-numeric string', () => {
      // Arrange
      const value = 'abc';

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is mixed alphanumeric string', () => {
      // Arrange
      const value = '12abc';

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is boolean true', () => {
      // Arrange
      const value = true;

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is boolean false', () => {
      // Arrange
      const value = false;

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is null', () => {
      // Arrange
      const value = null;

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is undefined', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is empty object', () => {
      // Arrange
      const value = {};

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is array', () => {
      // Arrange
      const value = [1, 2, 3];

      // Act
      const result = coerceToNumber(value);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // coerceToText
  // ===========================================================================

  describe('coerceToText', () => {
    it('should return same string when value is already a string', () => {
      // Arrange
      const value = 'hello';

      // Act
      const result = coerceToText(value);

      // Assert
      expect(result).toBe('hello');
    });

    it('should return empty string when value is empty string', () => {
      // Arrange
      const value = '';

      // Act
      const result = coerceToText(value);

      // Assert
      expect(result).toBe('');
    });

    it('should preserve whitespace when value is string with spaces', () => {
      // Arrange
      const value = '  spaces  ';

      // Act
      const result = coerceToText(value);

      // Assert
      expect(result).toBe('  spaces  ');
    });

    it('should return string representation when value is number', () => {
      // Arrange
      const value = 123;

      // Act
      const result = coerceToText(value);

      // Assert
      expect(result).toBe('123');
    });

    it('should return "0" when value is zero', () => {
      // Arrange
      const value = 0;

      // Act
      const result = coerceToText(value);

      // Assert
      expect(result).toBe('0');
    });

    it('should return negative string when value is negative number', () => {
      // Arrange
      const value = -456;

      // Act
      const result = coerceToText(value);

      // Assert
      expect(result).toBe('-456');
    });

    it('should return decimal string when value is decimal number', () => {
      // Arrange
      const value = 3.14;

      // Act
      const result = coerceToText(value);

      // Assert
      expect(result).toBe('3.14');
    });

    it('should return "true" when value is boolean true', () => {
      // Arrange
      const value = true;

      // Act
      const result = coerceToText(value);

      // Assert
      expect(result).toBe('true');
    });

    it('should return "false" when value is boolean false', () => {
      // Arrange
      const value = false;

      // Act
      const result = coerceToText(value);

      // Assert
      expect(result).toBe('false');
    });

    it('should return null when value is null', () => {
      // Arrange
      const value = null;

      // Act
      const result = coerceToText(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is undefined', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = coerceToText(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is object', () => {
      // Arrange
      const value = { name: 'test' };

      // Act
      const result = coerceToText(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is array', () => {
      // Arrange
      const value = ['a', 'b'];

      // Act
      const result = coerceToText(value);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // coerceToBoolean
  // ===========================================================================

  describe('coerceToBoolean', () => {
    it('should return true when value is boolean true', () => {
      // Arrange
      const value = true;

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when value is boolean false', () => {
      // Arrange
      const value = false;

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when value is string "true"', () => {
      // Arrange
      const value = 'true';

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when value is uppercase string "TRUE"', () => {
      // Arrange
      const value = 'TRUE';

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when value is mixed case string "True"', () => {
      // Arrange
      const value = 'True';

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true when value is string "true" with whitespace', () => {
      // Arrange
      const value = '  true  ';

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when value is string "false"', () => {
      // Arrange
      const value = 'false';

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when value is uppercase string "FALSE"', () => {
      // Arrange
      const value = 'FALSE';

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when value is string "false" with whitespace', () => {
      // Arrange
      const value = '  false  ';

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true when value is number 1', () => {
      // Arrange
      const value = 1;

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when value is number 0', () => {
      // Arrange
      const value = 0;

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBe(false);
    });

    it('should return null when value is string "yes"', () => {
      // Arrange
      const value = 'yes';

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is string "no"', () => {
      // Arrange
      const value = 'no';

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is empty string', () => {
      // Arrange
      const value = '';

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is number 2', () => {
      // Arrange
      const value = 2;

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is negative number', () => {
      // Arrange
      const value = -1;

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is decimal number', () => {
      // Arrange
      const value = 0.5;

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is null', () => {
      // Arrange
      const value = null;

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is undefined', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is object', () => {
      // Arrange
      const value = { value: true };

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is array', () => {
      // Arrange
      const value: unknown[] = [];

      // Act
      const result = coerceToBoolean(value);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // coerceToTimestamp
  // ===========================================================================

  describe('coerceToTimestamp', () => {
    it('should return same timestamp when value is valid positive number', () => {
      // Arrange
      const value = 1734299400;

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBe(1734299400);
    });

    it('should return zero when value is zero', () => {
      // Arrange
      const value = 0;

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBe(0);
    });

    it('should return timestamp when value is valid numeric string', () => {
      // Arrange
      const value = '1734299400';

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBe(1734299400);
    });

    it('should return timestamp when string has leading and trailing whitespace', () => {
      // Arrange
      const value = '  1734299400  ';

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBe(1734299400);
    });

    it('should return null when value is negative number', () => {
      // Arrange
      const value = -1;

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is decimal number', () => {
      // Arrange
      const value = 1734299400.5;

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is NaN', () => {
      // Arrange
      const value = NaN;

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is Infinity', () => {
      // Arrange
      const value = Infinity;

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is empty string', () => {
      // Arrange
      const value = '';

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is date format string', () => {
      // Arrange
      const value = '2024-12-16';

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is non-numeric string', () => {
      // Arrange
      const value = 'invalid-date';

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is boolean', () => {
      // Arrange
      const value = true;

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is null', () => {
      // Arrange
      const value = null;

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is undefined', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is object', () => {
      // Arrange
      const value = { timestamp: 1734299400 };

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is array', () => {
      // Arrange
      const value = [1734299400];

      // Act
      const result = coerceToTimestamp(value);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // coerceToStringArray
  // ===========================================================================

  describe('coerceToStringArray', () => {
    it('should return same array when value is string array', () => {
      // Arrange
      const value = ['a', 'b', 'c'];

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should return empty array when value is empty array', () => {
      // Arrange
      const value: string[] = [];

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toEqual([]);
    });

    it('should convert to string array when value is number array', () => {
      // Arrange
      const value = [1, 2, 3];

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toEqual(['1', '2', '3']);
    });

    it('should convert to string array when value is boolean array', () => {
      // Arrange
      const value = [true, false];

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toEqual(['true', 'false']);
    });

    it('should convert to string array when value is mixed array', () => {
      // Arrange
      const value = ['text', 123, true];

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toEqual(['text', '123', 'true']);
    });

    it('should wrap in array when value is single string', () => {
      // Arrange
      const value = 'single';

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toEqual(['single']);
    });

    it('should wrap in array when value is empty string', () => {
      // Arrange
      const value = '';

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toEqual(['']);
    });

    it('should wrap and convert when value is single number', () => {
      // Arrange
      const value = 123;

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toEqual(['123']);
    });

    it('should wrap and convert when value is single boolean', () => {
      // Arrange
      const value = true;

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toEqual(['true']);
    });

    it('should return null when value is null', () => {
      // Arrange
      const value = null;

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is undefined', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is object', () => {
      // Arrange
      const value = { value: 'test' };

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when array contains null', () => {
      // Arrange
      const value = ['a', null, 'c'];

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when array contains object', () => {
      // Arrange
      const value = [1, {}, 3];

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when array contains undefined', () => {
      // Arrange
      const value = [undefined];

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when array contains nested array', () => {
      // Arrange
      const value = [['a', 'b']];

      // Act
      const result = coerceToStringArray(value);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // coerceOptionObjectsToStringArray
  // ===========================================================================

  describe('coerceOptionObjectsToStringArray', () => {
    it('should extract values when array contains option objects', () => {
      // Arrange
      const value = [
        { key: 'opt1', label: 'Option 1', value: 'option_1' },
        { key: 'opt2', label: 'Option 2', value: 'option_2' },
      ];

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toEqual(['option_1', 'option_2']);
    });

    it('should extract single value when array contains one option object', () => {
      // Arrange
      const value = [{ key: 'opt1', label: 'Option 1', value: 'option_1' }];

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toEqual(['option_1']);
    });

    it('should convert numeric values when option objects have numeric values', () => {
      // Arrange
      const value = [
        { key: 'opt1', label: 'Option 1', value: 1 },
        { key: 'opt2', label: 'Option 2', value: 2 },
      ];

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toEqual(['1', '2']);
    });

    it('should wrap in array when value is single option object', () => {
      // Arrange
      const value = { key: 'opt1', label: 'Option 1', value: 'option_1' };

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toEqual(['option_1']);
    });

    it('should convert numeric value when single option object has numeric value', () => {
      // Arrange
      const value = { key: 'opt1', label: 'Option 1', value: 123 };

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toEqual(['123']);
    });

    it('should return same array when value is already string array', () => {
      // Arrange
      const value = ['a', 'b', 'c'];

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should return empty array when value is empty array', () => {
      // Arrange
      const value: string[] = [];

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toEqual([]);
    });

    it('should convert to string array when value is number array', () => {
      // Arrange
      const value = [1, 2, 3];

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toEqual(['1', '2', '3']);
    });

    it('should convert to string array when value is boolean array', () => {
      // Arrange
      const value = [true, false];

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toEqual(['true', 'false']);
    });

    it('should wrap in array when value is single string', () => {
      // Arrange
      const value = 'single';

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toEqual(['single']);
    });

    it('should wrap and convert when value is single number', () => {
      // Arrange
      const value = 123;

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toEqual(['123']);
    });

    it('should wrap and convert when value is single boolean', () => {
      // Arrange
      const value = true;

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toEqual(['true']);
    });

    it('should handle mixed array of option objects and primitives', () => {
      // Arrange
      const value = [{ value: 'option_1' }, 'primitive_value'];

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toEqual(['option_1', 'primitive_value']);
    });

    it('should handle mixed array of option objects and numbers', () => {
      // Arrange
      const value = [{ value: 'option_1' }, 123];

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toEqual(['option_1', '123']);
    });

    it('should return null when value is null', () => {
      // Arrange
      const value = null;

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is undefined', () => {
      // Arrange
      const value = undefined;

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when object has no value property', () => {
      // Arrange
      const value = { key: 'test' };

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when array contains object without value property', () => {
      // Arrange
      const value = [{ key: 'test', label: 'Test' }];

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when option object has null value', () => {
      // Arrange
      const value = [{ key: 'opt1', label: 'Option 1', value: null }];

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when array contains null', () => {
      // Arrange
      const value = ['a', null, 'c'];

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when array contains nested array', () => {
      // Arrange
      const value = [['a', 'b']];

      // Act
      const result = coerceOptionObjectsToStringArray(value);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ===========================================================================
  // coerceToCurrency
  // ===========================================================================

  describe('coerceToCurrency', () => {
    it('should return object as-is when value is a valid currency object', () => {
      // Arrange
      const value = { value: 9999, currencyCode: 'TWD' };

      // Act
      const result = coerceToCurrency(value);

      // Assert
      expect(result).toEqual({ value: 9999, currencyCode: 'TWD' });
    });

    it('should coerce numeric string to number when value field is a string', () => {
      // Arrange
      const value = { value: '9999', currencyCode: 'TWD' };

      // Act
      const result = coerceToCurrency(value);

      // Assert
      expect(result).toEqual({ value: 9999, currencyCode: 'TWD' });
    });

    it('should accept zero when value field is zero', () => {
      // Arrange
      const value = { value: 0, currencyCode: 'USD' };

      // Act
      const result = coerceToCurrency(value);

      // Assert
      expect(result).toEqual({ value: 0, currencyCode: 'USD' });
    });

    it('should return null when value is a plain number', () => {
      // Arrange
      const value = 9999;

      // Act
      const result = coerceToCurrency(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when currencyCode field is missing', () => {
      // Arrange
      const value = { value: 9999 };

      // Act
      const result = coerceToCurrency(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value field is missing', () => {
      // Arrange
      const value = { currencyCode: 'TWD' };

      // Act
      const result = coerceToCurrency(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value field is not numeric', () => {
      // Arrange
      const value = { value: 'abc', currencyCode: 'TWD' };

      // Act
      const result = coerceToCurrency(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when currencyCode is empty string', () => {
      // Arrange
      const value = { value: 9999, currencyCode: '   ' };

      // Act
      const result = coerceToCurrency(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when currencyCode is not a string', () => {
      // Arrange
      const value = { value: 9999, currencyCode: 123 };

      // Act
      const result = coerceToCurrency(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is null', () => {
      // Arrange
      const value = null;

      // Act
      const result = coerceToCurrency(value);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when value is an array', () => {
      // Arrange
      const value = [9999, 'TWD'];

      // Act
      const result = coerceToCurrency(value);

      // Assert
      expect(result).toBeNull();
    });
  });
});
