/**
 * Unit Tests - Condition Node Executor
 *
 * Tests the condition node executor which evaluates conditions and determines
 * the next node(s) to execute in a workflow.
 *
 * Test Structure follows Google's "Given-When-Then" / AAA pattern:
 *   - Arrange: Set up test data and mocks
 *   - Act: Execute the method under test
 *   - Assert: Verify the expected outcome
 *
 * Naming Convention: "should [expected behavior] when [condition]"
 */

import { ConditionNodeExecutor } from './condition-node.executor';
import { NodeType, ComparisonOperator, LogicOperator } from '../../types';
import { FlowExecutionError, ErrorCode } from '../../types';
import { ExpressionEvaluatorService } from '../../expression-engine';

describe('ConditionNodeExecutor', () => {
  let executor: ConditionNodeExecutor;
  let expressionEvaluator: jest.Mocked<ExpressionEvaluatorService>;

  beforeEach(() => {
    expressionEvaluator = {
      evaluate: jest.fn(),
      isSimpleExpression: jest.fn(),
    } as unknown as jest.Mocked<ExpressionEvaluatorService>;

    executor = new ConditionNodeExecutor(expressionEvaluator);
  });

  // =========================================================================
  // Simple Conditions (field operator value)
  // =========================================================================

  describe('SimpleCondition', () => {
    describe('numeric comparisons', () => {
      it('should match GREATER_THAN when field value exceeds threshold', async () => {
        // Arrange
        expressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: 1000,
        });
        const nodeConfig = createConditionNode([
          {
            branch: {
              field: 'getFormField("amount").value',
              operator: ComparisonOperator.GREATER_THAN,
              value: 500,
            },
            next: 'approved',
          },
          { branch: null, next: 'rejected' },
        ]);

        // Act
        const result = await executor.execute(nodeConfig, { amount: 1000 });

        // Assert
        expect(result.nextNodeKeys).toEqual(['approved']);
      });

      it('should match LESS_THAN when field value is below threshold', async () => {
        // Arrange
        expressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: 500,
        });
        const nodeConfig = createConditionNode([
          {
            branch: {
              field: 'getFormField("amount").value',
              operator: ComparisonOperator.LESS_THAN,
              value: 1000,
            },
            next: 'small_purchase',
          },
          { branch: null, next: 'large_purchase' },
        ]);

        // Act
        const result = await executor.execute(nodeConfig, { amount: 500 });

        // Assert
        expect(result.nextNodeKeys).toEqual(['small_purchase']);
      });

      it('should match EQUAL when field value equals expected', async () => {
        // Arrange
        expressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: 100,
        });
        const nodeConfig = createConditionNode([
          {
            branch: {
              field: 'getFormField("quantity").value',
              operator: ComparisonOperator.EQUAL,
              value: 100,
            },
            next: 'exact_match',
          },
          { branch: null, next: 'no_match' },
        ]);

        // Act
        const result = await executor.execute(nodeConfig, { quantity: 100 });

        // Assert
        expect(result.nextNodeKeys).toEqual(['exact_match']);
      });

      it('should match NOT_EQUAL when field value differs', async () => {
        // Arrange
        expressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: 200,
        });
        const nodeConfig = createConditionNode([
          {
            branch: {
              field: 'getFormField("quantity").value',
              operator: ComparisonOperator.NOT_EQUAL,
              value: 100,
            },
            next: 'different',
          },
          { branch: null, next: 'same' },
        ]);

        // Act
        const result = await executor.execute(nodeConfig, { quantity: 200 });

        // Assert
        expect(result.nextNodeKeys).toEqual(['different']);
      });

      it('should match GREATER_EQUAL when field value meets minimum', async () => {
        // Arrange
        expressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: 1000,
        });
        const nodeConfig = createConditionNode([
          {
            branch: {
              field: 'getFormField("amount").value',
              operator: ComparisonOperator.GREATER_EQUAL,
              value: 1000,
            },
            next: 'qualifies',
          },
          { branch: null, next: 'not_qualifies' },
        ]);

        // Act
        const result = await executor.execute(nodeConfig, { amount: 1000 });

        // Assert
        expect(result.nextNodeKeys).toEqual(['qualifies']);
      });

      it('should match LESS_EQUAL when field value meets maximum', async () => {
        // Arrange
        expressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: 500,
        });
        const nodeConfig = createConditionNode([
          {
            branch: {
              field: 'getFormField("amount").value',
              operator: ComparisonOperator.LESS_EQUAL,
              value: 500,
            },
            next: 'within_limit',
          },
          { branch: null, next: 'over_limit' },
        ]);

        // Act
        const result = await executor.execute(nodeConfig, { amount: 500 });

        // Assert
        expect(result.nextNodeKeys).toEqual(['within_limit']);
      });
    });

    describe('string comparisons', () => {
      it('should match STRING_EQUAL when strings are identical', async () => {
        // Arrange
        expressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: 'IT',
        });
        const nodeConfig = createConditionNode([
          {
            branch: {
              field: 'getFormField("department").value',
              operator: ComparisonOperator.STRING_EQUAL,
              value: 'IT',
            },
            next: 'it_flow',
          },
          { branch: null, next: 'other_flow' },
        ]);

        // Act
        const result = await executor.execute(nodeConfig, { department: 'IT' });

        // Assert
        expect(result.nextNodeKeys).toEqual(['it_flow']);
      });

      it('should match STRING_NOT_EQUAL when strings differ', async () => {
        // Arrange
        expressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: 'IT',
        });
        const nodeConfig = createConditionNode([
          {
            branch: {
              field: 'getFormField("department").value',
              operator: ComparisonOperator.STRING_NOT_EQUAL,
              value: 'HR',
            },
            next: 'not_hr',
          },
          { branch: null, next: 'is_hr' },
        ]);

        // Act
        const result = await executor.execute(nodeConfig, { department: 'IT' });

        // Assert
        expect(result.nextNodeKeys).toEqual(['not_hr']);
      });

      it('should match CONTAINS when substring exists', async () => {
        // Arrange
        expressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: 'urgent request',
        });
        const nodeConfig = createConditionNode([
          {
            branch: {
              field: 'getFormField("description").value',
              operator: ComparisonOperator.CONTAINS,
              value: 'urgent',
            },
            next: 'priority',
          },
          { branch: null, next: 'normal' },
        ]);

        // Act
        const result = await executor.execute(nodeConfig, {
          description: 'urgent request',
        });

        // Assert
        expect(result.nextNodeKeys).toEqual(['priority']);
      });

      it('should match NOT_CONTAINS when substring is absent', async () => {
        // Arrange
        expressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: 'normal request',
        });
        const nodeConfig = createConditionNode([
          {
            branch: {
              field: 'getFormField("description").value',
              operator: ComparisonOperator.NOT_CONTAINS,
              value: 'urgent',
            },
            next: 'normal',
          },
          { branch: null, next: 'priority' },
        ]);

        // Act
        const result = await executor.execute(nodeConfig, {
          description: 'normal request',
        });

        // Assert
        expect(result.nextNodeKeys).toEqual(['normal']);
      });
    });

    describe('boolean comparisons', () => {
      it('should match EQUAL when boolean values are same', async () => {
        // Arrange
        expressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: true,
        });
        const nodeConfig = createConditionNode([
          {
            branch: {
              field: 'getFormField("approved").value',
              operator: ComparisonOperator.EQUAL,
              value: true,
            },
            next: 'approved_flow',
          },
          { branch: null, next: 'pending_flow' },
        ]);

        // Act
        const result = await executor.execute(nodeConfig, { approved: true });

        // Assert
        expect(result.nextNodeKeys).toEqual(['approved_flow']);
      });
    });
  });

  // =========================================================================
  // Complex Conditions (left logic right)
  // =========================================================================

  describe('ComplexCondition', () => {
    it('should match AND when both conditions are true', async () => {
      // Arrange
      expressionEvaluator.evaluate
        .mockResolvedValueOnce({ success: true, value: 15000 }) // left
        .mockResolvedValueOnce({ success: true, value: 15000 }); // right
      const nodeConfig = createConditionNode([
        {
          branch: {
            left: {
              field: 'getFormField("amount").value',
              operator: ComparisonOperator.GREATER_EQUAL,
              value: 10000,
            },
            logic: LogicOperator.AND,
            right: {
              field: 'getFormField("amount").value',
              operator: ComparisonOperator.LESS_THAN,
              value: 20000,
            },
          },
          next: 'mid_range',
        },
        { branch: null, next: 'other' },
      ]);

      // Act
      const result = await executor.execute(nodeConfig, { amount: 15000 });

      // Assert
      expect(result.nextNodeKeys).toEqual(['mid_range']);
    });

    it('should not match AND when one condition is false', async () => {
      // Arrange
      expressionEvaluator.evaluate
        .mockResolvedValueOnce({ success: true, value: 5000 }) // left: 5000 >= 10000 = false
        .mockResolvedValueOnce({ success: true, value: 5000 }); // right: not evaluated due to short-circuit? No, we evaluate both
      const nodeConfig = createConditionNode([
        {
          branch: {
            left: {
              field: 'getFormField("amount").value',
              operator: ComparisonOperator.GREATER_EQUAL,
              value: 10000,
            },
            logic: LogicOperator.AND,
            right: {
              field: 'getFormField("amount").value',
              operator: ComparisonOperator.LESS_THAN,
              value: 20000,
            },
          },
          next: 'mid_range',
        },
        { branch: null, next: 'other' },
      ]);

      // Act
      const result = await executor.execute(nodeConfig, { amount: 5000 });

      // Assert
      expect(result.nextNodeKeys).toEqual(['other']);
    });

    it('should match OR when at least one condition is true', async () => {
      // Arrange
      expressionEvaluator.evaluate
        .mockResolvedValueOnce({ success: true, value: 'IT' }) // left: IT == IT = true
        .mockResolvedValueOnce({ success: true, value: 'IT' }); // right: IT == HR = false
      const nodeConfig = createConditionNode([
        {
          branch: {
            left: {
              field: 'getFormField("department").value',
              operator: ComparisonOperator.EQUAL,
              value: 'IT',
            },
            logic: LogicOperator.OR,
            right: {
              field: 'getFormField("department").value',
              operator: ComparisonOperator.EQUAL,
              value: 'HR',
            },
          },
          next: 'special_flow',
        },
        { branch: null, next: 'normal_flow' },
      ]);

      // Act
      const result = await executor.execute(nodeConfig, { department: 'IT' });

      // Assert
      expect(result.nextNodeKeys).toEqual(['special_flow']);
    });

    it('should not match OR when all conditions are false', async () => {
      // Arrange
      expressionEvaluator.evaluate
        .mockResolvedValueOnce({ success: true, value: 'Finance' })
        .mockResolvedValueOnce({ success: true, value: 'Finance' });
      const nodeConfig = createConditionNode([
        {
          branch: {
            left: {
              field: 'getFormField("department").value',
              operator: ComparisonOperator.EQUAL,
              value: 'IT',
            },
            logic: LogicOperator.OR,
            right: {
              field: 'getFormField("department").value',
              operator: ComparisonOperator.EQUAL,
              value: 'HR',
            },
          },
          next: 'special_flow',
        },
        { branch: null, next: 'normal_flow' },
      ]);

      // Act
      const result = await executor.execute(nodeConfig, {
        department: 'Finance',
      });

      // Assert
      expect(result.nextNodeKeys).toEqual(['normal_flow']);
    });
  });

  // =========================================================================
  // Expression Conditions (JavaScript expressions)
  // =========================================================================

  describe('ExpressionCondition', () => {
    it('should match when expression evaluates to true', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });
      const nodeConfig = createConditionNode([
        {
          branch: {
            expression: 'getFormField("amount").value > 10000',
          },
          next: 'high_amount',
        },
        { branch: null, next: 'low_amount' },
      ]);

      // Act
      const result = await executor.execute(nodeConfig, { amount: 15000 });

      // Assert
      expect(result.nextNodeKeys).toEqual(['high_amount']);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(expressionEvaluator.evaluate).toHaveBeenCalledWith(
        'getFormField("amount").value > 10000',
        expect.objectContaining({ formData: { amount: 15000 } }),
      );
    });

    it('should not match when expression evaluates to false', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: false,
      });
      const nodeConfig = createConditionNode([
        {
          branch: {
            expression: 'getFormField("amount").value > 10000',
          },
          next: 'high_amount',
        },
        { branch: null, next: 'low_amount' },
      ]);

      // Act
      const result = await executor.execute(nodeConfig, { amount: 5000 });

      // Assert
      expect(result.nextNodeKeys).toEqual(['low_amount']);
    });

    it('should evaluate function definition expressions', async () => {
      // Arrange
      const functionExpression = `function condition() {
        const a = getFormField("a").value;
        const b = getFormField("b").value;
        return a + b > 100;
      }`;
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: true,
      });
      const nodeConfig = createConditionNode([
        {
          branch: { expression: functionExpression },
          next: 'sum_exceeded',
        },
        { branch: null, next: 'sum_ok' },
      ]);

      // Act
      const result = await executor.execute(nodeConfig, { a: 60, b: 50 });

      // Assert
      expect(result.nextNodeKeys).toEqual(['sum_exceeded']);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(expressionEvaluator.evaluate).toHaveBeenCalledWith(
        functionExpression,
        expect.any(Object),
      );
    });

    it('should convert truthy values to true', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: 1, // truthy number
      });
      const nodeConfig = createConditionNode([
        {
          branch: { expression: 'getFormField("count").value' },
          next: 'has_count',
        },
        { branch: null, next: 'no_count' },
      ]);

      // Act
      const result = await executor.execute(nodeConfig, { count: 1 });

      // Assert
      expect(result.nextNodeKeys).toEqual(['has_count']);
    });

    it('should convert falsy values to false', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: 0, // falsy number
      });
      const nodeConfig = createConditionNode([
        {
          branch: { expression: 'getFormField("count").value' },
          next: 'has_count',
        },
        { branch: null, next: 'no_count' },
      ]);

      // Act
      const result = await executor.execute(nodeConfig, { count: 0 });

      // Assert
      expect(result.nextNodeKeys).toEqual(['no_count']);
    });

    it('should throw INVALID_EXPRESSION when evaluation fails', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValue({
        success: false,
        error: 'Field "nonexistent" not found',
      });
      const nodeConfig = createConditionNode([
        {
          branch: { expression: 'getFormField("nonexistent").value > 0' },
          next: 'next',
        },
        { branch: null, next: 'default' },
      ]);

      // Act & Assert
      await expect(executor.execute(nodeConfig, {})).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute(nodeConfig, {})).rejects.toMatchObject({
        code: ErrorCode.EXEC_INVALID_EXPRESSION,
      });
    });
  });

  // =========================================================================
  // Mixed Condition Types
  // =========================================================================

  describe('mixed condition types', () => {
    it('should support SimpleCondition and ExpressionCondition in same node', async () => {
      // Arrange
      expressionEvaluator.evaluate
        .mockResolvedValueOnce({ success: true, value: 'IT' }) // SimpleCondition field
        .mockResolvedValueOnce({ success: true, value: true }); // ExpressionCondition
      const nodeConfig = createConditionNode([
        {
          branch: {
            field: 'getFormField("department").value',
            operator: ComparisonOperator.EQUAL,
            value: 'HR', // will not match
          },
          next: 'hr_flow',
        },
        {
          branch: { expression: 'getFormField("amount").value > 10000' },
          next: 'high_amount',
        },
        { branch: null, next: 'default' },
      ]);

      // Act
      const result = await executor.execute(nodeConfig, {
        department: 'IT',
        amount: 15000,
      });

      // Assert
      expect(result.nextNodeKeys).toEqual(['high_amount']);
    });
  });

  // =========================================================================
  // Else Branch (default fallback)
  // =========================================================================

  describe('else branch handling', () => {
    it('should use else branch when no conditions match', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: 500,
      });
      const nodeConfig = createConditionNode([
        {
          branch: {
            field: 'getFormField("amount").value',
            operator: ComparisonOperator.GREATER_THAN,
            value: 1000,
          },
          next: 'high',
        },
        { branch: null, next: 'default' },
      ]);

      // Act
      const result = await executor.execute(nodeConfig, { amount: 500 });

      // Assert
      expect(result.nextNodeKeys).toEqual(['default']);
    });

    it('should find else branch regardless of position in array', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: 500,
      });
      const nodeConfig = createConditionNode([
        { branch: null, next: 'default' }, // else branch first
        {
          branch: {
            field: 'getFormField("amount").value',
            operator: ComparisonOperator.GREATER_THAN,
            value: 1000,
          },
          next: 'high',
        },
      ]);

      // Act
      const result = await executor.execute(nodeConfig, { amount: 500 });

      // Assert
      expect(result.nextNodeKeys).toEqual(['default']);
    });
  });

  // =========================================================================
  // Error Cases
  // =========================================================================

  describe('error handling', () => {
    it('should throw NO_CONDITION_MATCHED when no match and no else branch', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValue({
        success: true,
        value: 500,
      });
      const nodeConfig = createConditionNode([
        {
          branch: {
            field: 'getFormField("amount").value',
            operator: ComparisonOperator.GREATER_THAN,
            value: 1000,
          },
          next: 'high',
        },
        // No else branch!
      ]);

      // Act & Assert
      await expect(
        executor.execute(nodeConfig, { amount: 500 }),
      ).rejects.toThrow(FlowExecutionError);

      try {
        await executor.execute(nodeConfig, { amount: 500 });
        fail('Expected FlowExecutionError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FlowExecutionError);
        expect((error as FlowExecutionError).code).toBe(
          ErrorCode.NO_CONDITION_MATCHED,
        );
      }
    });

    it('should throw INVALID_EXPRESSION when field evaluation fails', async () => {
      // Arrange
      expressionEvaluator.evaluate.mockResolvedValue({
        success: false,
        error: 'Field "missing" not found in form data',
      });
      const nodeConfig = createConditionNode([
        {
          branch: {
            field: 'getFormField("missing").value',
            operator: ComparisonOperator.EQUAL,
            value: 100,
          },
          next: 'next',
        },
        { branch: null, next: 'default' },
      ]);

      // Act & Assert
      await expect(executor.execute(nodeConfig, {})).rejects.toMatchObject({
        code: ErrorCode.EXEC_INVALID_EXPRESSION,
      });
    });
  });
});

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Creates a condition node configuration for testing.
 * Reduces boilerplate while keeping tests readable.
 */
function createConditionNode(
  conditions: Array<{
    branch: Record<string, unknown> | null;
    next: string;
  }>,
): {
  key: string;
  type: NodeType.CONDITION;
  conditions: typeof conditions;
} {
  return {
    key: 'test_condition',
    type: NodeType.CONDITION,
    conditions,
  };
}
