/**
 * Unit Tests - NumberArrayExpressionValidator
 */

import { validateNumberArrayExpression } from './number-array-expression-validator';

describe('NumberArrayExpressionValidator', () => {
  // ===========================================================================
  // Syntax errors
  // ===========================================================================

  describe('syntax errors', () => {
    it('should fail when expression has a syntax error', () => {
      // Arrange
      const expression = 'getCurrentNode(.approverId.prev';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it('should fail when expression is empty', () => {
      // Arrange
      const expression = '';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });
  });

  // ===========================================================================
  // AST static rejection
  // ===========================================================================

  describe('AST rejects obviously wrong return types', () => {
    it('should fail when expression returns a boolean literal', () => {
      // Arrange
      const expression = 'true';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it('should fail when expression returns a string literal', () => {
      // Arrange
      const expression = '"abc"';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it('should fail when expression returns a number literal', () => {
      // Arrange
      const expression = '123';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it('should fail when expression returns an object literal', () => {
      // Arrange
      const expression = '({ user_id: 1 })';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it('should fail when expression returns a comparison result', () => {
      // Arrange
      const expression = '1 > 0';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });

    it('should fail when function body returns a non-array literal', () => {
      // Arrange
      const expression = 'function f() { return "abc"; }';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(false);
    });
  });

  // ===========================================================================
  // AST pass-through (runtime-dependent expressions deferred to runtime check)
  // ===========================================================================

  describe('AST passes through runtime-dependent expressions', () => {
    it('should pass when expression is a literal number array', () => {
      // Arrange
      const expression = '[1, 2, 3]';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression accesses getCurrentNode().approverId.prev', () => {
      // Arrange
      const expression = 'getCurrentNode().approverId.prev';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression reads getFormField value', () => {
      // Arrange
      const expression = 'getFormField("user_ids").value';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression chains map on getFormField value', () => {
      // Arrange
      const expression = 'getFormField("user_ids").value.map(Number)';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression wraps getApplicantProfile().id in array', () => {
      // Arrange
      const expression = '[getApplicantProfile().id]';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression spreads getCurrentNode prev with applicant id', () => {
      // Arrange
      const expression =
        '[...getCurrentNode().approverId.prev, getApplicantProfile().id]';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression maps master data', () => {
      // Arrange
      const expression = 'getMasterData("approver_group").map(r => r.user_id)';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when function returns getFormField value', () => {
      // Arrange
      const expression =
        'function f() { return getFormField("user_ids").value; }';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when function returns a literal number array', () => {
      // Arrange
      const expression = 'function f() { return [1, 2, 3]; }';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression returns an empty array literal', () => {
      // Arrange
      const expression = '[]';

      // Act
      const result = validateNumberArrayExpression(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });
  });
});
