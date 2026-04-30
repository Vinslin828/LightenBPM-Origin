/**
 * Unit Tests - Case Converter Utilities
 */

import { snakeToCamel, camelToSnake, keysToCamelCase } from './case-converter';

describe('Case Converter Utilities', () => {
  describe('snakeToCamel', () => {
    describe('basic conversions', () => {
      it('should convert snake_case to camelCase', () => {
        expect(snakeToCamel('hello_world')).toBe('helloWorld');
        expect(snakeToCamel('user_name')).toBe('userName');
        expect(snakeToCamel('created_at')).toBe('createdAt');
      });

      it('should handle multiple underscores', () => {
        expect(snakeToCamel('first_middle_last')).toBe('firstMiddleLast');
        expect(snakeToCamel('job_grade_level')).toBe('jobGradeLevel');
      });
    });

    describe('edge cases', () => {
      it('should return same string if no underscores', () => {
        expect(snakeToCamel('hello')).toBe('hello');
        expect(snakeToCamel('userName')).toBe('userName');
      });

      it('should handle empty string', () => {
        expect(snakeToCamel('')).toBe('');
      });

      it('should handle leading/trailing underscores', () => {
        // Leading underscore followed by letter gets converted
        expect(snakeToCamel('_hello')).toBe('Hello');
        // Trailing underscore without following letter stays as-is
        expect(snakeToCamel('hello_')).toBe('hello_');
      });
    });
  });

  // ===========================================================================
  // camelToSnake
  // ===========================================================================

  describe('camelToSnake', () => {
    describe('basic conversions', () => {
      it('should convert camelCase to snake_case', () => {
        expect(camelToSnake('helloWorld')).toBe('hello_world');
        expect(camelToSnake('userName')).toBe('user_name');
        expect(camelToSnake('createdAt')).toBe('created_at');
      });

      it('should handle multiple uppercase letters', () => {
        expect(camelToSnake('firstMiddleLast')).toBe('first_middle_last');
        expect(camelToSnake('jobGradeLevel')).toBe('job_grade_level');
      });
    });

    describe('edge cases', () => {
      it('should return same string if no uppercase letters', () => {
        expect(camelToSnake('hello')).toBe('hello');
        expect(camelToSnake('id')).toBe('id');
      });

      it('should handle empty string', () => {
        expect(camelToSnake('')).toBe('');
      });

      it('should handle single character field names', () => {
        expect(camelToSnake('a')).toBe('a');
      });
    });
  });

  // ===========================================================================
  // keysToCamelCase
  // ===========================================================================

  describe('keysToCamelCase', () => {
    describe('object key conversion', () => {
      it('should convert object keys from snake_case to camelCase', () => {
        // Arrange
        const input = {
          user_name: 'John',
          job_grade: 'Senior',
          created_at: 'value',
        };

        // Act
        const result = keysToCamelCase(input);

        // Assert
        expect(result).toEqual({
          userName: 'John',
          jobGrade: 'Senior',
          createdAt: 'value',
        });
      });
    });

    describe('date conversion', () => {
      it('should convert Date objects to epoch time', () => {
        // Arrange
        const date = new Date('2024-01-15T10:30:00Z');
        const input = {
          created_at: date,
          name: 'test',
        };

        // Act
        const result = keysToCamelCase(input) as Record<string, unknown>;

        // Assert
        expect(result.createdAt).toBe(date.getTime());
        expect(result.name).toBe('test');
      });

      it('should convert nested dates in objects', () => {
        // Arrange
        const date = new Date('2024-01-15');
        const input = {
          user: {
            created_at: date,
          },
        };

        // Act
        const result = keysToCamelCase(input) as {
          user: { createdAt: number };
        };

        // Assert
        expect(result.user.createdAt).toBe(date.getTime());
      });
    });

    describe('nested structures', () => {
      it('should handle nested objects', () => {
        // Arrange
        const input = {
          user_profile: {
            first_name: 'John',
            last_name: 'Doe',
          },
        };

        // Act
        const result = keysToCamelCase(input);

        // Assert
        expect(result).toEqual({
          userProfile: {
            firstName: 'John',
            lastName: 'Doe',
          },
        });
      });

      it('should handle arrays of objects', () => {
        // Arrange
        const input = {
          user_list: [{ user_name: 'Alice' }, { user_name: 'Bob' }],
        };

        // Act
        const result = keysToCamelCase(input);

        // Assert
        expect(result).toEqual({
          userList: [{ userName: 'Alice' }, { userName: 'Bob' }],
        });
      });

      it('should handle mixed nested structure', () => {
        // Arrange
        const date = new Date('2024-06-01');
        const input = {
          workflow_instance: {
            serial_number: 'APP-001',
            created_at: date,
            form_data: {
              field_one: 'value1',
              field_two: 2,
            },
            tags: ['tag_one', 'tag_two'],
          },
        };

        // Act
        const result = keysToCamelCase(input) as {
          workflowInstance: {
            serialNumber: string;
            createdAt: number;
            formData: { fieldOne: string; fieldTwo: number };
            tags: string[];
          };
        };

        // Assert
        expect(result.workflowInstance.serialNumber).toBe('APP-001');
        expect(result.workflowInstance.createdAt).toBe(date.getTime());
        expect(result.workflowInstance.formData.fieldOne).toBe('value1');
        expect(result.workflowInstance.formData.fieldTwo).toBe(2);
        expect(result.workflowInstance.tags).toEqual(['tag_one', 'tag_two']);
      });
    });

    describe('edge cases', () => {
      it('should return null for null input', () => {
        expect(keysToCamelCase(null)).toBeNull();
      });

      it('should return undefined for undefined input', () => {
        expect(keysToCamelCase(undefined)).toBeUndefined();
      });

      it('should return primitives as-is', () => {
        expect(keysToCamelCase('hello')).toBe('hello');
        expect(keysToCamelCase(123)).toBe(123);
        expect(keysToCamelCase(true)).toBe(true);
      });

      it('should handle empty object', () => {
        expect(keysToCamelCase({})).toEqual({});
      });

      it('should handle empty array', () => {
        expect(keysToCamelCase([])).toEqual([]);
      });
    });
  });
});
