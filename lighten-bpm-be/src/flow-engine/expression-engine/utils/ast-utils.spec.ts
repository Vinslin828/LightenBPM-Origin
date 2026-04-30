/**
 * Unit Tests - AST Utils
 */

import { parse } from 'acorn';
import type { Node } from 'acorn';
import {
  findReturnStatements,
  findReturnStatementsInBlock,
  validateNonEmptyString,
} from './ast-utils';

describe('AstUtils', () => {
  // =========================================================================
  // validateNonEmptyString
  // =========================================================================

  describe('validateNonEmptyString', () => {
    it('should return valid when input is non-empty string', () => {
      // Arrange
      const input = 'some expression';

      // Act
      const result = validateNonEmptyString(input);

      // Assert
      expect(result.valid).toBe(true);
    });

    it('should return invalid when input is empty string', () => {
      // Arrange
      const input = '';

      // Act
      const result = validateNonEmptyString(input);

      // Assert
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain('non-empty string');
      }
    });

    it('should return invalid when input is null', () => {
      // Arrange
      const input = null;

      // Act
      const result = validateNonEmptyString(input);

      // Assert
      expect(result.valid).toBe(false);
    });

    it('should return invalid when input is undefined', () => {
      // Arrange
      const input = undefined;

      // Act
      const result = validateNonEmptyString(input);

      // Assert
      expect(result.valid).toBe(false);
    });

    it('should return invalid when input is number', () => {
      // Arrange
      const input = 123;

      // Act
      const result = validateNonEmptyString(input);

      // Assert
      expect(result.valid).toBe(false);
    });

    it('should return invalid when input is object', () => {
      // Arrange
      const input = { key: 'value' };

      // Act
      const result = validateNonEmptyString(input);

      // Assert
      expect(result.valid).toBe(false);
    });
  });

  // =========================================================================
  // findReturnStatements
  // =========================================================================

  describe('findReturnStatements', () => {
    const parseOptions = {
      ecmaVersion: 2020 as const,
      allowReturnOutsideFunction: true,
    };

    it('should find single return statement', () => {
      // Arrange
      const code = 'return true;';
      const ast = parse(code, parseOptions);
      const statements = (ast as { body: Node[] }).body;

      // Act
      const result = findReturnStatements(statements);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('Literal');
    });

    it('should find multiple return statements', () => {
      // Arrange
      const code = `
        if (x) {
          return true;
        }
        return false;
      `;
      const ast = parse(code, parseOptions);
      const statements = (ast as { body: Node[] }).body;

      // Act
      const result = findReturnStatements(statements);

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should find return statements in if-else branches', () => {
      // Arrange
      const code = `
        if (x) {
          return true;
        } else {
          return false;
        }
      `;
      const ast = parse(code, parseOptions);
      const statements = (ast as { body: Node[] }).body;

      // Act
      const result = findReturnStatements(statements);

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should find return statements in nested blocks', () => {
      // Arrange
      const code = `
        {
          {
            return true;
          }
        }
      `;
      const ast = parse(code, parseOptions);
      const statements = (ast as { body: Node[] }).body;

      // Act
      const result = findReturnStatements(statements);

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should return empty array when no return statements', () => {
      // Arrange
      const code = 'const x = 1;';
      const ast = parse(code, parseOptions);
      const statements = (ast as { body: Node[] }).body;

      // Act
      const result = findReturnStatements(statements);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should skip return statements without argument', () => {
      // Arrange
      const code = 'return;';
      const ast = parse(code, parseOptions);
      const statements = (ast as { body: Node[] }).body;

      // Act
      const result = findReturnStatements(statements);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should find return statements in else-if chains', () => {
      // Arrange
      const code = `
        if (a) {
          return 1;
        } else if (b) {
          return 2;
        } else {
          return 3;
        }
      `;
      const ast = parse(code, parseOptions);
      const statements = (ast as { body: Node[] }).body;

      // Act
      const result = findReturnStatements(statements);

      // Assert
      expect(result).toHaveLength(3);
    });
  });

  // =========================================================================
  // findReturnStatementsInBlock
  // =========================================================================

  describe('findReturnStatementsInBlock', () => {
    const parseOptions = {
      ecmaVersion: 2020 as const,
      allowReturnOutsideFunction: true,
    };

    it('should find return statements in block statement', () => {
      // Arrange
      const code = '{ return true; }';
      const ast = parse(code, parseOptions);
      const block = (ast as { body: Node[] }).body[0];

      // Act
      const result = findReturnStatementsInBlock(block);

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should find return statement when node is return statement', () => {
      // Arrange
      const code = 'return true;';
      const ast = parse(code, parseOptions);
      const returnStmt = (ast as { body: Node[] }).body[0];

      // Act
      const result = findReturnStatementsInBlock(returnStmt);

      // Assert
      expect(result).toHaveLength(1);
    });

    it('should return empty array when return statement has no argument', () => {
      // Arrange
      const code = 'return;';
      const ast = parse(code, parseOptions);
      const returnStmt = (ast as { body: Node[] }).body[0];

      // Act
      const result = findReturnStatementsInBlock(returnStmt);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should return empty array for non-block non-return node', () => {
      // Arrange
      const code = 'const x = 1;';
      const ast = parse(code, parseOptions);
      const varDecl = (ast as { body: Node[] }).body[0];

      // Act
      const result = findReturnStatementsInBlock(varDecl);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should find multiple return statements in block', () => {
      // Arrange
      const code = `{
        if (x) return true;
        return false;
      }`;
      const ast = parse(code, parseOptions);
      const block = (ast as { body: Node[] }).body[0];

      // Act
      const result = findReturnStatementsInBlock(block);

      // Assert
      expect(result).toHaveLength(2);
    });
  });
});
