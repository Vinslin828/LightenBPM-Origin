/**
 * Unit Tests - Flow Utilities
 */

import {
  getReferencedFieldNames,
  findNodeByKey,
  getStartNode,
  resolveNodeDescription,
  requiresAllApprovers,
  isReferenceExpression,
  isSimpleCondition,
  isComplexCondition,
  isExpressionCondition,
} from './flow-utils';
import {
  FlowDefinition,
  Node,
  NodeType,
  ApprovalMethod,
  ApproverType,
  ComparisonOperator,
  LogicOperator,
  ConditionBranch,
} from '../../types';

describe('FlowUtils', () => {
  // =========================================================================
  // getReferencedFieldNames
  // =========================================================================

  describe('getReferencedFieldNames', () => {
    it('should extract field name from condition node', () => {
      // Arrange
      const flowDef = createFlowDefinition([
        { key: 'start', type: NodeType.START, next: 'cond1' },
        {
          key: 'cond1',
          type: NodeType.CONDITION,
          conditions: [
            {
              branch: {
                field: 'getFormField("amount").value',
                operator: ComparisonOperator.GREATER_THAN,
                value: 100,
              },
              next: 'end',
            },
          ],
        },
        { key: 'end', type: NodeType.END },
      ]);

      // Act
      const result = getReferencedFieldNames(flowDef);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('amount');
    });

    it('should extract multiple field names from same condition', () => {
      // Arrange
      const flowDef = createFlowDefinition([
        { key: 'start', type: NodeType.START, next: 'cond1' },
        {
          key: 'cond1',
          type: NodeType.CONDITION,
          conditions: [
            {
              branch: {
                field: 'getFormField("field1").value',
                operator: ComparisonOperator.EQUAL,
                value: 100,
              },
              next: 'end',
            },
            {
              branch: {
                field: 'getFormField("field2").value',
                operator: ComparisonOperator.EQUAL,
                value: 200,
              },
              next: 'end',
            },
          ],
        },
        { key: 'end', type: NodeType.END },
      ]);

      // Act
      const result = getReferencedFieldNames(flowDef);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContain('field1');
      expect(result).toContain('field2');
    });

    it('should extract field names from multiple condition nodes', () => {
      // Arrange
      const flowDef = createFlowDefinition([
        { key: 'start', type: NodeType.START, next: 'cond1' },
        {
          key: 'cond1',
          type: NodeType.CONDITION,
          conditions: [
            {
              branch: {
                field: 'getFormField("amount").value',
                operator: ComparisonOperator.GREATER_THAN,
                value: 100,
              },
              next: 'cond2',
            },
          ],
        },
        {
          key: 'cond2',
          type: NodeType.CONDITION,
          conditions: [
            {
              branch: {
                field: 'getFormField("status").value',
                operator: ComparisonOperator.STRING_EQUAL,
                value: 'approved',
              },
              next: 'end',
            },
          ],
        },
        { key: 'end', type: NodeType.END },
      ]);

      // Act
      const result = getReferencedFieldNames(flowDef);

      // Assert
      expect(result).toHaveLength(2);
      expect(result).toContain('amount');
      expect(result).toContain('status');
    });

    it('should handle field names with underscores and numbers', () => {
      // Arrange
      const flowDef = createFlowDefinition([
        { key: 'start', type: NodeType.START, next: 'cond1' },
        {
          key: 'cond1',
          type: NodeType.CONDITION,
          conditions: [
            {
              branch: {
                field: 'getFormField("text_field_abc123").value',
                operator: ComparisonOperator.STRING_EQUAL,
                value: 'test',
              },
              next: 'end',
            },
          ],
        },
        { key: 'end', type: NodeType.END },
      ]);

      // Act
      const result = getReferencedFieldNames(flowDef);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('text_field_abc123');
    });

    it('should include duplicate field names when referenced multiple times', () => {
      // Arrange
      const flowDef = createFlowDefinition([
        { key: 'start', type: NodeType.START, next: 'cond1' },
        {
          key: 'cond1',
          type: NodeType.CONDITION,
          conditions: [
            {
              branch: {
                field: 'getFormField("amount").value',
                operator: ComparisonOperator.GREATER_THAN,
                value: 100,
              },
              next: 'cond2',
            },
          ],
        },
        {
          key: 'cond2',
          type: NodeType.CONDITION,
          conditions: [
            {
              branch: {
                field: 'getFormField("amount").value',
                operator: ComparisonOperator.LESS_THAN,
                value: 1000,
              },
              next: 'end',
            },
          ],
        },
        { key: 'end', type: NodeType.END },
      ]);

      // Act
      const result = getReferencedFieldNames(flowDef);

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((name) => name === 'amount')).toBe(true);
    });

    it('should not include non-form-field functions', () => {
      // Arrange
      const flowDef = createFlowDefinition([
        { key: 'start', type: NodeType.START, next: 'cond1' },
        {
          key: 'cond1',
          type: NodeType.CONDITION,
          conditions: [
            {
              branch: {
                field: 'getApplicantProfile().jobGrade',
                operator: ComparisonOperator.STRING_EQUAL,
                value: 'A',
              },
              next: 'end',
            },
          ],
        },
        { key: 'end', type: NodeType.END },
      ]);

      // Act
      const result = getReferencedFieldNames(flowDef);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should return empty array when no references found', () => {
      // Arrange
      const flowDef = createFlowDefinition([
        { key: 'start', type: NodeType.START, next: 'end' },
        { key: 'end', type: NodeType.END },
      ]);

      // Act
      const result = getReferencedFieldNames(flowDef);

      // Assert
      expect(result).toHaveLength(0);
    });

    it('should handle condition with null branch (else branch)', () => {
      // Arrange
      const flowDef = createFlowDefinition([
        { key: 'start', type: NodeType.START, next: 'cond1' },
        {
          key: 'cond1',
          type: NodeType.CONDITION,
          conditions: [
            {
              branch: {
                field: 'getFormField("amount").value',
                operator: ComparisonOperator.GREATER_THAN,
                value: 100,
              },
              next: 'end',
            },
            { branch: null, next: 'end' },
          ],
        },
        { key: 'end', type: NodeType.END },
      ]);

      // Act
      const result = getReferencedFieldNames(flowDef);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('amount');
    });

    it('should return empty array when nodes array is empty', () => {
      // Arrange
      const flowDef = createFlowDefinition([]);

      // Act
      const result = getReferencedFieldNames(flowDef);

      // Assert
      expect(result).toHaveLength(0);
    });
  });

  // =========================================================================
  // findNodeByKey
  // =========================================================================

  describe('findNodeByKey', () => {
    const sampleFlow = createSampleFlowDefinition();

    it('should find start node by key', () => {
      // Act
      const node = findNodeByKey(sampleFlow, 'start');

      // Assert
      expect(node).not.toBeNull();
      expect(node?.type).toBe(NodeType.START);
      expect(node?.key).toBe('start');
    });

    it('should find condition node by key', () => {
      // Act
      const node = findNodeByKey(sampleFlow, 'condition1');

      // Assert
      expect(node).not.toBeNull();
      expect(node?.type).toBe(NodeType.CONDITION);
      expect(node?.key).toBe('condition1');
    });

    it('should find approval node by key', () => {
      // Act
      const node = findNodeByKey(sampleFlow, 'approval1');

      // Assert
      expect(node).not.toBeNull();
      expect(node?.type).toBe(NodeType.APPROVAL);
      expect(node?.key).toBe('approval1');
    });

    it('should find end node by key', () => {
      // Act
      const node = findNodeByKey(sampleFlow, 'end');

      // Assert
      expect(node).not.toBeNull();
      expect(node?.type).toBe(NodeType.END);
      expect(node?.key).toBe('end');
    });

    it('should return null when node key does not exist', () => {
      // Act
      const node = findNodeByKey(sampleFlow, 'nonexistent');

      // Assert
      expect(node).toBeNull();
    });

    it('should return null when flow definition has no nodes', () => {
      // Arrange
      const emptyFlow: FlowDefinition = { version: 1, nodes: [] };

      // Act
      const node = findNodeByKey(emptyFlow, 'start');

      // Assert
      expect(node).toBeNull();
    });
  });

  // =========================================================================
  // getStartNode
  // =========================================================================

  describe('getStartNode', () => {
    it('should find start node in flow definition', () => {
      // Arrange
      const flow = createSampleFlowDefinition();

      // Act
      const node = getStartNode(flow);

      // Assert
      expect(node).not.toBeNull();
      expect(node?.type).toBe(NodeType.START);
      expect(node?.key).toBe('start');
    });

    it('should return null when no start node exists', () => {
      // Arrange
      const noStartFlow: FlowDefinition = {
        version: 1,
        nodes: [{ key: 'end', type: NodeType.END }],
      };

      // Act
      const node = getStartNode(noStartFlow);

      // Assert
      expect(node).toBeNull();
    });

    it('should return null when flow definition has no nodes', () => {
      // Arrange
      const emptyFlow: FlowDefinition = { version: 1, nodes: [] };

      // Act
      const node = getStartNode(emptyFlow);

      // Assert
      expect(node).toBeNull();
    });

    it('should return first start node when multiple exist', () => {
      // Arrange
      const multipleStartFlow: FlowDefinition = {
        version: 1,
        nodes: [
          { key: 'start1', type: NodeType.START, next: 'end' },
          { key: 'start2', type: NodeType.START, next: 'end' },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const node = getStartNode(multipleStartFlow);

      // Assert
      expect(node).not.toBeNull();
      expect(node?.key).toBe('start1');
    });
  });

  // =========================================================================
  // isReferenceExpression
  // =========================================================================

  describe('isReferenceExpression', () => {
    it('should return true for getFormField expressions', () => {
      expect(isReferenceExpression('getFormField("amount").value')).toBe(true);
      expect(isReferenceExpression('getFormField("department").value')).toBe(
        true,
      );
    });

    it('should return true for getApplicantProfile expressions', () => {
      expect(isReferenceExpression('getApplicantProfile().jobGrade')).toBe(
        true,
      );
      expect(isReferenceExpression('getApplicantProfile().name')).toBe(true);
      expect(isReferenceExpression('getApplicantProfile().department')).toBe(
        true,
      );
    });

    it('should return true for getApplication expressions', () => {
      expect(isReferenceExpression('getApplication().serialNumber')).toBe(true);
      expect(isReferenceExpression('getApplication().status')).toBe(true);
      expect(isReferenceExpression('getApplication().appliedAt')).toBe(true);
    });

    it('should return false for unknown function names', () => {
      expect(isReferenceExpression('unknownFunction().value')).toBe(false);
      expect(isReferenceExpression('getUser().name')).toBe(false);
    });

    it('should return false for non-function-call syntax', () => {
      expect(isReferenceExpression('amount')).toBe(false);
      expect(isReferenceExpression('1000')).toBe(false);
    });

    it('should return true for function call even with missing args', () => {
      // getFormField() is still a valid function call syntax
      // Argument validation happens at execution time
      expect(isReferenceExpression('getFormField()')).toBe(true);
    });

    it('should return false for non-string values', () => {
      expect(isReferenceExpression(1000)).toBe(false);
      expect(isReferenceExpression(true)).toBe(false);
      expect(isReferenceExpression(null)).toBe(false);
      expect(isReferenceExpression(undefined)).toBe(false);
      expect(isReferenceExpression({ value: 'test' })).toBe(false);
    });
  });

  // =========================================================================
  // isSimpleCondition
  // =========================================================================

  describe('isSimpleCondition', () => {
    it('should return true for SimpleCondition', () => {
      // Arrange
      const branch: ConditionBranch = {
        field: 'getFormField("amount").value',
        operator: ComparisonOperator.GREATER_THAN,
        value: 100,
      };

      // Act
      const result = isSimpleCondition(branch);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for ComplexCondition', () => {
      // Arrange
      const branch: ConditionBranch = {
        left: {
          field: 'getFormField("a").value',
          operator: ComparisonOperator.GREATER_THAN,
          value: 10,
        },
        logic: LogicOperator.AND,
        right: {
          field: 'getFormField("b").value',
          operator: ComparisonOperator.LESS_THAN,
          value: 100,
        },
      };

      // Act
      const result = isSimpleCondition(branch);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for ExpressionCondition', () => {
      // Arrange
      const branch: ConditionBranch = {
        expression: 'getFormField("amount").value > 100',
      };

      // Act
      const result = isSimpleCondition(branch);

      // Assert
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // isComplexCondition
  // =========================================================================

  describe('isComplexCondition', () => {
    it('should return true for ComplexCondition', () => {
      // Arrange
      const branch: ConditionBranch = {
        left: {
          field: 'getFormField("a").value',
          operator: ComparisonOperator.GREATER_THAN,
          value: 10,
        },
        logic: LogicOperator.AND,
        right: {
          field: 'getFormField("b").value',
          operator: ComparisonOperator.LESS_THAN,
          value: 100,
        },
      };

      // Act
      const result = isComplexCondition(branch);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for SimpleCondition', () => {
      // Arrange
      const branch: ConditionBranch = {
        field: 'getFormField("amount").value',
        operator: ComparisonOperator.GREATER_THAN,
        value: 100,
      };

      // Act
      const result = isComplexCondition(branch);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for ExpressionCondition', () => {
      // Arrange
      const branch: ConditionBranch = {
        expression: 'getFormField("amount").value > 100',
      };

      // Act
      const result = isComplexCondition(branch);

      // Assert
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // isExpressionCondition
  // =========================================================================

  describe('isExpressionCondition', () => {
    it('should return true for inline expression', () => {
      // Arrange
      const branch: ConditionBranch = {
        expression: 'getFormField("amount").value > 100',
      };

      // Act
      const result = isExpressionCondition(branch);

      // Assert
      expect(result).toBe(true);
    });

    it('should return true for function definition expression', () => {
      // Arrange
      const branch: ConditionBranch = {
        expression: `function condition() {
          return getFormField("a").value + getFormField("b").value > 100;
        }`,
      };

      // Act
      const result = isExpressionCondition(branch);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for SimpleCondition', () => {
      // Arrange
      const branch: ConditionBranch = {
        field: 'getFormField("amount").value',
        operator: ComparisonOperator.GREATER_THAN,
        value: 100,
      };

      // Act
      const result = isExpressionCondition(branch);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false for ComplexCondition', () => {
      // Arrange
      const branch: ConditionBranch = {
        left: {
          field: 'getFormField("a").value',
          operator: ComparisonOperator.GREATER_THAN,
          value: 10,
        },
        logic: LogicOperator.AND,
        right: {
          field: 'getFormField("b").value',
          operator: ComparisonOperator.LESS_THAN,
          value: 100,
        },
      };

      // Act
      const result = isExpressionCondition(branch);

      // Assert
      expect(result).toBe(false);
    });
  });

  // =========================================================================
  // resolveNodeDescription
  // =========================================================================

  describe('resolveNodeDescription', () => {
    it('should return start node description when nodeKey is null', () => {
      // Arrange
      const flowDef = createFlowDefinition([
        {
          key: 'start',
          type: NodeType.START,
          next: 'end',
          description: 'Submit your request',
        },
        { key: 'end', type: NodeType.END },
      ]);

      // Act
      const result = resolveNodeDescription(flowDef, null);

      // Assert
      expect(result).toBe('Submit your request');
    });

    it('should return null when start node has no description', () => {
      // Arrange
      const flowDef = createFlowDefinition([
        { key: 'start', type: NodeType.START, next: 'end' },
        { key: 'end', type: NodeType.END },
      ]);

      // Act
      const result = resolveNodeDescription(flowDef, null);

      // Assert
      expect(result).toBeNull();
    });

    it('should return SINGLE approval node description from approvers.description', () => {
      // Arrange
      const flowDef = createFlowDefinition([
        { key: 'start', type: NodeType.START, next: 'approval' },
        {
          key: 'approval',
          type: NodeType.APPROVAL,
          approval_method: ApprovalMethod.SINGLE,
          approvers: {
            type: ApproverType.APPLICANT,
            description: 'Manager review',
          },
          next: 'end',
        },
        { key: 'end', type: NodeType.END },
      ]);

      // Act
      const result = resolveNodeDescription(flowDef, 'approval');

      // Assert
      expect(result).toBe('Manager review');
    });

    it('should return PARALLEL approval node description from approvers[groupIndex].description', () => {
      // Arrange
      const flowDef = createFlowDefinition([
        { key: 'start', type: NodeType.START, next: 'approval' },
        {
          key: 'approval',
          type: NodeType.APPROVAL,
          approval_method: ApprovalMethod.PARALLEL,
          approval_logic: 'AND',
          approvers: [
            {
              type: ApproverType.APPLICANT,
              description: 'Finance reviewer',
            },
            {
              type: ApproverType.APPLICANT,
              description: 'HR reviewer',
            },
          ],
          next: 'end',
        },
        { key: 'end', type: NodeType.END },
      ]);

      // Act
      const finance = resolveNodeDescription(flowDef, 'approval', 0);
      const hr = resolveNodeDescription(flowDef, 'approval', 1);

      // Assert
      expect(finance).toBe('Finance reviewer');
      expect(hr).toBe('HR reviewer');
    });

    it('should fall back to node.description when approvers.description is undefined', () => {
      // Arrange
      const flowDef = createFlowDefinition([
        { key: 'start', type: NodeType.START, next: 'approval' },
        {
          key: 'approval',
          type: NodeType.APPROVAL,
          approval_method: ApprovalMethod.SINGLE,
          approvers: { type: ApproverType.APPLICANT },
          next: 'end',
          description: 'Legacy node-level description',
        },
        { key: 'end', type: NodeType.END },
      ]);

      // Act
      const result = resolveNodeDescription(flowDef, 'approval');

      // Assert
      expect(result).toBe('Legacy node-level description');
    });

    it('should return null when nodeKey is not found in flow definition', () => {
      // Arrange
      const flowDef = createFlowDefinition([
        { key: 'start', type: NodeType.START, next: 'end' },
        { key: 'end', type: NodeType.END },
      ]);

      // Act
      const result = resolveNodeDescription(flowDef, 'nonexistent');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when approval node has no description on either approvers or node', () => {
      // Arrange
      const flowDef = createFlowDefinition([
        { key: 'start', type: NodeType.START, next: 'approval' },
        {
          key: 'approval',
          type: NodeType.APPROVAL,
          approval_method: ApprovalMethod.SINGLE,
          approvers: { type: ApproverType.APPLICANT },
          next: 'end',
        },
        { key: 'end', type: NodeType.END },
      ]);

      // Act
      const result = resolveNodeDescription(flowDef, 'approval');

      // Assert
      expect(result).toBeNull();
    });
  });

  // =========================================================================
  // requiresAllApprovers
  // =========================================================================

  describe('requiresAllApprovers', () => {
    it('should return true when approver type is SPECIFIC_USERS', () => {
      // Arrange
      const config = {
        type: ApproverType.SPECIFIC_USERS,
        config: { user_ids: [1, 2, 3] },
      };

      // Act
      const result = requiresAllApprovers(config);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when approver type is APPLICANT', () => {
      // Arrange
      const config = { type: ApproverType.APPLICANT };

      // Act
      const result = requiresAllApprovers(config);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when approver type is ROLE', () => {
      // Arrange
      const config = {
        type: ApproverType.ROLE,
        config: { role_id: 5 },
      };

      // Act
      const result = requiresAllApprovers(config);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when approver type is DEPARTMENT_HEAD', () => {
      // Arrange
      const config = {
        type: ApproverType.DEPARTMENT_HEAD,
        config: { source: 'manual', org_unit_id: 1 },
      };

      // Act
      const result = requiresAllApprovers(config as never);

      // Assert
      expect(result).toBe(false);
    });
  });
});

// =============================================================================
// Test Helpers
// =============================================================================

function createFlowDefinition(nodes: unknown[]): FlowDefinition {
  return {
    version: 1,
    nodes: nodes as Node[],
  };
}

function createSampleFlowDefinition(): FlowDefinition {
  return {
    version: 1,
    nodes: [
      {
        key: 'start',
        type: NodeType.START,
        next: 'condition1',
      },
      {
        key: 'condition1',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: {
              field: 'getFormField("amount").value',
              operator: ComparisonOperator.GREATER_THAN,
              value: 1000,
            },
            next: 'approval1',
          },
          { branch: null, next: 'end' },
        ],
      },
      {
        key: 'approval1',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.SINGLE,
        approvers: { type: ApproverType.APPLICANT },
        next: 'end',
      },
      {
        key: 'end',
        type: NodeType.END,
      },
    ],
  };
}
