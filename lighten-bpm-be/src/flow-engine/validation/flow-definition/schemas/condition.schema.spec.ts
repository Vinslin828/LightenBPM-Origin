import { ConditionNodeSchema } from './condition.schema';
import { NodeType } from '../../../types';

describe('ConditionNodeSchema', () => {
  describe('Valid condition nodes', () => {
    it('should accept condition node with simple condition', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'amount', operator: '>', value: 1000 },
            next: 'approval',
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept condition node with multiple conditions', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'amount', operator: '>', value: 5000 },
            next: 'high_approval',
          },
          {
            branch: { field: 'amount', operator: '>', value: 1000 },
            next: 'medium_approval',
          },
          {
            branch: null,
            next: 'low_approval',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept condition with description', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        description: 'Check amount threshold',
        conditions: [
          {
            branch: { field: 'amount', operator: '>', value: 1000 },
            next: 'approval',
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept condition with == operator for numbers', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'count', operator: '==', value: 5 },
            next: 'next_step',
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept condition with != operator for numbers', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'status_code', operator: '!=', value: 0 },
            next: 'continue',
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept condition with equals operator for strings', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'status', operator: 'equals', value: 'approved' },
            next: 'next_step',
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept condition with not_equals operator for strings', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: {
              field: 'status',
              operator: 'not_equals',
              value: 'rejected',
            },
            next: 'continue',
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept condition with < operator', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'age', operator: '<', value: 18 },
            next: 'minor',
          },
          {
            branch: null,
            next: 'adult',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept condition with >= operator', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'score', operator: '>=', value: 80 },
            next: 'pass',
          },
          {
            branch: null,
            next: 'fail',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept condition with <= operator', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'priority', operator: '<=', value: 3 },
            next: 'low_priority',
          },
          {
            branch: null,
            next: 'high_priority',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept condition with complex (AND) logic', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: {
              left: { field: 'amount', operator: '>', value: 1000 },
              logic: 'AND',
              right: { field: 'department_id', operator: '==', value: 5 },
            },
            next: 'it_high_approval',
          },
          {
            branch: null,
            next: 'standard_approval',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept condition with complex (OR) logic', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: {
              left: { field: 'urgent', operator: '==', value: 1 },
              logic: 'OR',
              right: { field: 'priority', operator: '>', value: 5 },
            },
            next: 'urgent_path',
          },
          {
            branch: null,
            next: 'normal_path',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept nested complex conditions', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: {
              left: { field: 'amount', operator: '>', value: 1000 },
              logic: 'AND',
              right: {
                left: { field: 'urgent', operator: '==', value: 1 },
                logic: 'OR',
                right: { field: 'vip', operator: '==', value: 1 },
              },
            },
            next: 'special_approval',
          },
          {
            branch: null,
            next: 'standard',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });
  });

  describe('Invalid condition nodes', () => {
    it('should reject condition without conditions array', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject condition with empty conditions array', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject condition without key', () => {
      const node = {
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'amount', operator: '>', value: 1000 },
            next: 'approval',
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject condition branch without next', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'amount', operator: '>', value: 1000 },
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject simple condition without field', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { operator: '>', value: 1000 },
            next: 'approval',
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject simple condition without operator', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'amount', value: 1000 },
            next: 'approval',
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject simple condition with invalid operator', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'amount', operator: 'INVALID', value: 1000 },
            next: 'approval',
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject complex condition without left', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: {
              logic: 'AND',
              right: { field: 'amount', operator: '>', value: 1000 },
            },
            next: 'approval',
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject complex condition without right', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: {
              left: { field: 'amount', operator: '>', value: 1000 },
              logic: 'AND',
            },
            next: 'approval',
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject complex condition with invalid logic operator', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: {
              left: { field: 'amount', operator: '>', value: 1000 },
              logic: 'INVALID',
              right: { field: 'count', operator: '>', value: 5 },
            },
            next: 'approval',
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });
  });

  describe('Expression conditions', () => {
    it('should accept condition with inline expression', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { expression: 'getFormField("amount").value > 5000' },
            next: 'high_amount',
          },
          {
            branch: null,
            next: 'low_amount',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept condition with function definition expression', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: {
              expression: `function condition() {
                const a = getFormField("a").value;
                const b = getFormField("b").value;
                return a + b > 100;
              }`,
            },
            next: 'high_value',
          },
          {
            branch: null,
            next: 'low_value',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept mixed simple and expression conditions', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'department', operator: 'equals', value: 'HR' },
            next: 'hr_path',
          },
          {
            branch: { expression: 'getFormField("amount").value > 10000' },
            next: 'high_amount',
          },
          {
            branch: null,
            next: 'default',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should reject expression condition with empty expression', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { expression: '' },
            next: 'path',
          },
          {
            branch: null,
            next: 'default',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should accept condition with only default branch', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept condition with numeric value', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'count', operator: '==', value: 42 },
            next: 'special',
          },
          {
            branch: null,
            next: 'normal',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept condition with string value using equals', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'status', operator: 'equals', value: 'pending' },
            next: 'pending_path',
          },
          {
            branch: null,
            next: 'other_path',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept condition with contains operator', () => {
      const node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: {
              field: 'description',
              operator: 'contains',
              value: 'urgent',
            },
            next: 'urgent_path',
          },
          {
            branch: null,
            next: 'normal_path',
          },
        ],
      };

      const result = ConditionNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });
  });
});
