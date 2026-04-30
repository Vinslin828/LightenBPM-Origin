/**
 * Unit Tests - ValidationExpressionValidator
 *
 * Tests the combined validator that accepts:
 * 1. boolean expressions
 * 2. { isValid: boolean, error: string } expressions
 */

import { validateValidationExpression } from './validation-expression-validator';

describe('ValidationExpressionValidator', () => {
  // =========================================================================
  // Boolean Expressions
  // =========================================================================

  describe('boolean expressions', () => {
    it('should pass when expression returns boolean from comparison', async () => {
      // Arrange
      const expression = 'getFormField("amount").value > 1000';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression uses logical operators', async () => {
      // Arrange
      const expression =
        'getFormField("amount").value > 0 && getFormField("amount").value < 10000';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression uses double negation', async () => {
      // Arrange
      const expression = '!!getFormField("name").value';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression is simple boolean literal', async () => {
      // Arrange
      const expression = 'true';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when ternary returns boolean in both branches', async () => {
      // Arrange
      const expression =
        'getFormField("type").value === "A" ? getFormField("amount").value > 100 : true';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when ternary returns boolean at runtime (execution validation)', async () => {
      // Arrange
      // Note: AST validation fails because branches have mixed types,
      // but execution validation passes because it returns boolean at runtime
      const expression = 'true ? true : "error"';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });
  });

  // =========================================================================
  // Validation Result Object Expressions
  // =========================================================================

  describe('validation result object expressions', () => {
    it('should pass when expression returns { isValid, error } object', async () => {
      // Arrange
      const expression = '({ isValid: true, error: "" })';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression returns validation result with error message', async () => {
      // Arrange
      const expression =
        '({ isValid: false, error: "Value must be positive" })';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when ternary returns validation result objects', async () => {
      // Arrange
      const expression =
        'true ? { isValid: true, error: "" } : { isValid: false, error: "Invalid" }';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when function returns validation result object', async () => {
      // Arrange
      const expression = `
        function validate() {
          return { isValid: true, error: "" };
        }
      `;

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when function has conditional validation result returns', async () => {
      // Arrange
      const expression = `
        function validate() {
          const value = 100;
          if (value > 0) {
            return { isValid: true, error: "" };
          }
          return { isValid: false, error: "Must be positive" };
        }
      `;

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when using statements with return', async () => {
      // Arrange
      const expression = `
        const valid = true;
        return ({ isValid: valid, error: "" });
      `;

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when object has extra properties (extra properties are allowed)', async () => {
      // Arrange
      const expression = '{ isValid: true, error: "", extra: 123 }';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert - extra properties are allowed for flexibility
      expect(result.isValid).toBe(true);
    });
  });

  // =========================================================================
  // Invalid Expressions
  // =========================================================================

  describe('invalid expressions', () => {
    it('should fail when expression is empty', async () => {
      // Arrange
      const expression = '';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.message).toContain('non-empty string');
    });

    it('should fail when expression is null', async () => {
      // Arrange
      const expression = null as unknown as string;

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it('should fail when expression returns number', async () => {
      // Arrange
      const expression = 'getFormField("amount").value + 100';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.message).toContain(
        'boolean or { isValid: boolean, error: string }',
      );
    });

    it('should fail when expression returns string', async () => {
      // Arrange
      const expression = 'getFormField("name").value';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it('should fail when expression concatenates strings', async () => {
      // Arrange
      const expression =
        'getFormField("firstName").value + " " + getFormField("lastName").value';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it('should fail when object is missing isValid property', async () => {
      // Arrange
      const expression = '{ error: "Error message" }';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it('should fail when object is missing error property', async () => {
      // Arrange
      const expression = '{ isValid: true }';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it('should fail for syntax errors', async () => {
      // Arrange
      const expression = 'getFormField("amount").value >';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });
  });

  // =========================================================================
  // Real-world Use Cases
  // =========================================================================

  describe('real-world use cases', () => {
    it('should pass for required field validation (boolean)', async () => {
      // Arrange
      const expression = '!!getFormField("email").value';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass for range validation (boolean)', async () => {
      // Arrange
      const expression =
        'getFormField("age").value >= 18 && getFormField("age").value <= 100';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass for email format validation with custom error', async () => {
      // Arrange
      const expression = `
        function validate() {
          const email = "test@example.com";
          if (email.includes("@")) {
            return { isValid: true, error: "" };
          }
          return { isValid: false, error: "Please enter a valid email address" };
        }
      `;

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass for conditional validation with custom error', async () => {
      // Arrange
      const expression =
        'true ? { isValid: true, error: "" } : { isValid: false, error: "Field is required when type is A" }';

      // Act
      const result = await validateValidationExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });
  });
});
