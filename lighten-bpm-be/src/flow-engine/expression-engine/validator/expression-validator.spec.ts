/**
 * Unit Tests - ExpressionValidator
 */

import {
  validateExpressionSyntax,
  containsCurrentNodeCall,
} from './expression-validator';
import { ErrorCode } from '../../types/validation.types';

describe('ExpressionValidator', () => {
  // ===========================================================================
  // validateExpressionSyntax
  // ===========================================================================

  describe('validateExpressionSyntax', () => {
    it('should pass when expression is a simple expression', () => {
      // Arrange
      const expression = 'getFormField("amount").value + 100';

      // Act
      const result = validateExpressionSyntax(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression is a function definition', () => {
      // Arrange
      const expression = `
        function run() {
          const node = getCurrentNode();
          return node.id;
        }
      `;

      // Act
      const result = validateExpressionSyntax(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression has statements with return', () => {
      // Arrange
      const expression = `
        const node = getCurrentNode();
        const tasks = node.approverId;
        return tasks.length;
      `;

      // Act
      const result = validateExpressionSyntax(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression uses getCurrentNode', () => {
      // Arrange
      const expression = 'getCurrentNode()';

      // Act
      const result = validateExpressionSyntax(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression uses fetch', () => {
      // Arrange
      const expression = 'fetch("https://example.com/api")';

      // Act
      const result = validateExpressionSyntax(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression uses fetch with options', () => {
      // Arrange
      const expression =
        'fetch("https://example.com/api", { method: "POST", body: JSON.stringify(getCurrentNode()) })';

      // Act
      const result = validateExpressionSyntax(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should pass when expression uses multiple function calls', () => {
      // Arrange
      const expression = `
        const node = getCurrentNode();
        const profile = getApplicantProfile();
        fetch("https://example.com/api", { method: "POST", body: JSON.stringify({ node, profile }) });
      `;

      // Act
      const result = validateExpressionSyntax(expression);

      // Assert
      expect(result.isValid).toBe(true);
    });

    it('should return INVALID_EXPRESSION when expression has syntax error', () => {
      // Arrange
      const expression = 'getFormField("amount").value +';

      // Act
      const result = validateExpressionSyntax(expression);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.code).toBe(ErrorCode.INVALID_EXPRESSION);
      expect(result.errors[0]?.message).toContain('Syntax error');
    });

    it('should return INVALID_EXPRESSION when expression has unclosed parenthesis', () => {
      // Arrange
      const expression = 'getCurrentNode(.';

      // Act
      const result = validateExpressionSyntax(expression);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.code).toBe(ErrorCode.INVALID_EXPRESSION);
      expect(result.errors[0]?.message).toContain('Syntax error');
    });

    it('should return INVALID_EXPRESSION when expression is empty string', () => {
      // Arrange
      const expression = '';

      // Act
      const result = validateExpressionSyntax(expression);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.code).toBe(ErrorCode.INVALID_EXPRESSION);
      expect(result.errors[0]?.message).toContain('non-empty string');
    });

    it('should return INVALID_EXPRESSION when expression is null', () => {
      // Arrange
      const expression = null as unknown as string;

      // Act
      const result = validateExpressionSyntax(expression);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors[0]?.code).toBe(ErrorCode.INVALID_EXPRESSION);
    });
  });

  // ===========================================================================
  // containsCurrentNodeCall
  // ===========================================================================

  describe('containsCurrentNodeCall', () => {
    it('should return true when expression contains getCurrentNode()', () => {
      // Arrange
      const expression = 'getCurrentNode()';

      // Act & Assert
      expect(containsCurrentNodeCall(expression)).toBe(true);
    });

    it('should return true when expression contains getCurrentNode() with property access', () => {
      // Arrange
      const expression = 'getCurrentNode().approverId';

      // Act & Assert
      expect(containsCurrentNodeCall(expression)).toBe(true);
    });

    it('should return true when getCurrentNode() is nested in other calls', () => {
      // Arrange
      const expression =
        'fetch("https://example.com", { body: JSON.stringify(getCurrentNode()) })';

      // Act & Assert
      expect(containsCurrentNodeCall(expression)).toBe(true);
    });

    it('should return false when expression does not contain getCurrentNode()', () => {
      // Arrange
      const expression = 'getFormField("amount").value > 1000';

      // Act & Assert
      expect(containsCurrentNodeCall(expression)).toBe(false);
    });

    it('should return false when getCurrentNode appears as string literal', () => {
      // Arrange
      const expression = '"getCurrentNode()"';

      // Act & Assert
      expect(containsCurrentNodeCall(expression)).toBe(false);
    });

    it('should return false when expression is empty', () => {
      // Arrange
      const expression = '';

      // Act & Assert
      expect(containsCurrentNodeCall(expression)).toBe(false);
    });
  });
});
