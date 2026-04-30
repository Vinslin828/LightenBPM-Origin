/**
 * Unit Tests - BooleanExpressionValidator
 */

import { validateBooleanExpression } from './boolean-expression-validator';

describe('BooleanExpressionValidator', () => {
  // =========================================================================
  // validateBooleanExpression - AST Validation
  // =========================================================================

  describe('validateBooleanExpression', () => {
    // -----------------------------------------------------------------------
    // Comparison Operators
    // -----------------------------------------------------------------------

    describe('comparison operators', () => {
      it('should pass when expression uses greater than operator', async () => {
        // Arrange
        const expression = 'getFormField("amount").value > 5000';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when expression uses less than operator', async () => {
        // Arrange
        const expression = 'getFormField("amount").value < 5000';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when expression uses greater than or equal operator', async () => {
        // Arrange
        const expression = 'getFormField("amount").value >= 5000';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when expression uses less than or equal operator', async () => {
        // Arrange
        const expression = 'getFormField("amount").value <= 5000';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when expression uses equality operator', async () => {
        // Arrange
        const expression = 'getFormField("status").value == "approved"';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when expression uses strict equality operator', async () => {
        // Arrange
        const expression = 'getFormField("status").value === "approved"';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when expression uses not equal operator', async () => {
        // Arrange
        const expression = 'getFormField("status").value != "rejected"';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when expression uses strict not equal operator', async () => {
        // Arrange
        const expression = 'getFormField("status").value !== "rejected"';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // Logical Operators
    // -----------------------------------------------------------------------

    describe('logical operators', () => {
      it('should pass when expression uses logical AND', async () => {
        // Arrange
        const expression =
          'getFormField("a").value > 100 && getFormField("b").value < 200';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when expression uses logical OR', async () => {
        // Arrange
        const expression =
          'getFormField("a").value > 100 || getFormField("b").value < 200';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when expression uses logical NOT', async () => {
        // Arrange
        const expression = '!getFormField("flag").value';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when expression uses double NOT for truthy check', async () => {
        // Arrange
        const expression = '!!getFormField("text").value';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when expression uses complex logical combination', async () => {
        // Arrange
        const expression =
          '(getFormField("a").value > 100 && getFormField("b").value < 200) || getFormField("c").value == "special"';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // Boolean Methods
    // -----------------------------------------------------------------------

    describe('boolean methods', () => {
      it('should pass when expression uses includes method', async () => {
        // Arrange
        const expression = 'getFormField("name").value.includes("test")';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when expression uses startsWith method', async () => {
        // Arrange
        const expression = 'getFormField("name").value.startsWith("prefix")';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when expression uses endsWith method', async () => {
        // Arrange
        const expression = 'getFormField("name").value.endsWith("suffix")';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when expression uses isNaN function', async () => {
        // Arrange
        const expression = 'isNaN(getFormField("amount").value)';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // Boolean Literals
    // -----------------------------------------------------------------------

    describe('boolean literals', () => {
      it('should pass when expression is true literal', async () => {
        // Arrange
        const expression = 'true';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when expression is false literal', async () => {
        // Arrange
        const expression = 'false';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // Ternary Expressions
    // -----------------------------------------------------------------------

    describe('ternary expressions', () => {
      it('should pass when ternary returns boolean in both branches', async () => {
        // Arrange
        const expression =
          'getFormField("type").value == "A" ? getFormField("a").value > 100 : getFormField("b").value < 50';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when ternary returns boolean literals', async () => {
        // Arrange
        const expression = 'getFormField("amount").value > 5000 ? true : false';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should fail when ternary returns non-boolean in both branches', async () => {
        // Arrange
        const expression =
          'getFormField("amount").value > 5000 ? "high" : "low"';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors[0]?.message).toContain(
          'must return a boolean value',
        );
      });

      it('should fail when ternary returns non-boolean in one branch', async () => {
        // Arrange
        const expression =
          'getFormField("amount").value > 5000 ? true : "invalid"';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(false);
      });

      it('should pass when nested ternary returns boolean', async () => {
        // Arrange
        const expression =
          'getFormField("a").value > 100 ? getFormField("b").value < 50 : getFormField("c").value == "x" ? true : false';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });
    });

    // -----------------------------------------------------------------------
    // Function Definition Format
    // -----------------------------------------------------------------------

    describe('function definition format', () => {
      it('should pass when function returns boolean comparison', async () => {
        // Arrange
        const expression = `
          function condition() {
            return getFormField("amount").value > 5000;
          }
        `;

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when function has conditional returns with boolean', async () => {
        // Arrange
        const expression = `
          function condition() {
            if (true) {
              return getFormField("a").value > 100;
            } else {
              return getFormField("b").value < 50;
            }
          }
        `;

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should fail when function has no return statement', async () => {
        // Arrange
        const expression = `
          function condition() {
            const x = 1;
          }
        `;

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors[0]?.message).toContain(
          'must return a boolean value',
        );
      });

      it('should fail when function returns non-boolean', async () => {
        // Arrange
        const expression = `
          function condition() {
            return "not boolean";
          }
        `;

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors[0]?.message).toContain(
          'must return a boolean value',
        );
      });
    });

    // -----------------------------------------------------------------------
    // Statements with Return
    // -----------------------------------------------------------------------

    describe('statements with return', () => {
      it('should pass when statements end with boolean return', async () => {
        // Arrange
        const expression = `
          const threshold = 5000;
          return getFormField("amount").value > threshold;
        `;

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should pass when if-else statements return boolean', async () => {
        // Arrange
        const expression = `
          if (true) {
            return getFormField("a").value > 100;
          }
          return false;
        `;

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(true);
      });

      it('should fail when return statement has non-boolean', async () => {
        // Arrange
        const expression = `
          const value = 100;
          return value + 50;
        `;

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(false);
      });
    });

    // -----------------------------------------------------------------------
    // Invalid Expressions (Non-boolean Return)
    // -----------------------------------------------------------------------

    describe('invalid expressions', () => {
      it('should fail when expression returns arithmetic result', async () => {
        // Arrange
        const expression = 'getFormField("amount").value + 100';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors[0]?.message).toContain(
          'must return a boolean value',
        );
      });

      it('should fail when expression returns string concatenation', async () => {
        // Arrange
        const expression = 'getFormField("name").value + " suffix"';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(false);
      });

      it('should fail when expression returns simple field access', async () => {
        // Arrange
        const expression = 'getFormField("amount").value';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(false);
      });

      it('should fail when expression returns string literal', async () => {
        // Arrange
        const expression = '"hello"';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(false);
      });

      it('should fail when expression returns number literal', async () => {
        // Arrange
        const expression = '123';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(false);
      });

      it('should fail when expression calls non-boolean method', async () => {
        // Arrange
        const expression = 'getFormField("name").value.toUpperCase()';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(false);
      });
    });

    // -----------------------------------------------------------------------
    // Error Handling
    // -----------------------------------------------------------------------

    describe('error handling', () => {
      it('should fail when expression is empty string', async () => {
        // Arrange
        const expression = '';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors[0]?.message).toContain('non-empty string');
      });

      it('should fail when expression is null', async () => {
        // Arrange
        const expression = null as unknown as string;

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(false);
      });

      it('should fail when expression has syntax error', async () => {
        // Arrange
        const expression = 'getFormField("amount").value >';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors[0]?.message).toContain('Syntax error');
      });

      it('should fail when expression is incomplete', async () => {
        // Arrange
        const expression = 'getFormField("amount").';

        // Act
        const result = await validateBooleanExpression(expression);

        // Assert
        expect(result.isValid).toBe(false);
      });
    });
  });

  // =========================================================================
  // Execution Fallback (via validateBooleanExpression)
  // =========================================================================

  describe('execution fallback', () => {
    it('should pass when expression with function calls evaluates to boolean', async () => {
      // Arrange — AST can't determine this returns boolean, execution fallback kicks in
      const expression =
        '!!getFormField("amount").value || getFormField("name").value > 0';

      // Act
      const result = await validateBooleanExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should fail when expression evaluates to number', async () => {
      // Arrange
      const expression = '10 + 5';

      // Act
      const result = await validateBooleanExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it('should fail when expression evaluates to string', async () => {
      // Arrange
      const expression = '"hello" + " world"';

      // Act
      const result = await validateBooleanExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it('should fail when expression has syntax error', async () => {
      // Arrange
      const expression = 'true &&';

      // Act
      const result = await validateBooleanExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });
  });
});
