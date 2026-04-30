/**
 * Unit Tests - FlowValidatorService
 */

import { FlowValidatorService } from './flow-validator.service';
import {
  NodeType,
  ApprovalMethod,
  RejectBehavior,
  ApproverType,
  ApprovalLogic,
  SourceType,
} from '../../types';
import { ErrorCode } from '../../types/validation.types';

describe('FlowValidatorService', () => {
  let service: FlowValidatorService;

  beforeEach(() => {
    service = new FlowValidatorService();
  });

  // =========================================================================
  // Basic Validation
  // =========================================================================

  describe('basic validation', () => {
    it('should return INVALID_TYPE error when input is null', async () => {
      // Arrange
      const input = null;

      // Act
      const result = await service.validateFlowDefinition(input);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.INVALID_TYPE);
      expect(result.errors[0].message).toContain('must be an object');
    });

    it('should return INVALID_TYPE error when version field is missing', async () => {
      // Arrange
      const input = { nodes: [] };

      // Act
      const result = await service.validateFlowDefinition(input);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.INVALID_TYPE);
      expect(result.errors[0].message).toContain('version');
    });

    it('should return INVALID_TYPE error when version is not a number', async () => {
      // Arrange
      const input = { version: 'abc', nodes: [] };

      // Act
      const result = await service.validateFlowDefinition(input);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.INVALID_TYPE);
      expect(result.errors[0].message).toContain('number');
    });

    it('should return CUSTOM error when version is unsupported', async () => {
      // Arrange
      const input = { version: 999, nodes: [] };

      // Act
      const result = await service.validateFlowDefinition(input);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.CUSTOM);
      expect(result.errors[0].message).toContain(
        'Unsupported flow definition version: 999',
      );
    });
  });

  // =========================================================================
  // V1 Flow Definition Structure Validation
  // =========================================================================

  describe('V1 flow definition structure validation', () => {
    it('should return error when flow has no START node', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [{ key: 'end', type: NodeType.END }],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes('exactly one START node')),
      ).toBe(true);
    });

    it('should return error when flow has no END node', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [{ key: 'start', type: NodeType.START, next: 'approval' }],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes('exactly one END node')),
      ).toBe(true);
    });

    it('should return error when flow has multiple START nodes', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start1', type: NodeType.START, next: 'end' },
          { key: 'start2', type: NodeType.START, next: 'end' },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes('exactly one START node')),
      ).toBe(true);
    });

    it('should pass validation when flow has valid START and END nodes', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'end' },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // =========================================================================
  // Node Reference Validation
  // =========================================================================

  describe('node reference validation', () => {
    it('should return NODE_NOT_FOUND error when START node references non-existent node', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'non_existent' },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.NODE_NOT_FOUND &&
            e.message.includes('non_existent'),
        ),
      ).toBe(true);
    });

    it('should return NODE_NOT_FOUND error when APPROVAL node references non-existent node', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'approval' },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'non_existent',
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.NODE_NOT_FOUND &&
            e.message.includes('non_existent'),
        ),
      ).toBe(true);
    });

    it('should return NODE_NOT_FOUND error when CONDITION branch references non-existent node', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'age', operator: '>', value: 18 },
                next: 'non_existent',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.NODE_NOT_FOUND &&
            e.message.includes('non_existent'),
        ),
      ).toBe(true);
    });
  });

  // =========================================================================
  // Graph Structure Validation
  // =========================================================================

  describe('graph structure validation', () => {
    it('should return UNREACHABLE_NODE error when flow has orphan nodes', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'end' },
          {
            key: 'orphan',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.UNREACHABLE_NODE &&
            e.message.includes('orphan'),
        ),
      ).toBe(true);
    });

    it('should return CIRCULAR_REFERENCE error when flow has circular references', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'approval1' },
          {
            key: 'approval1',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval2',
          },
          {
            key: 'approval2',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval1', // Circular!
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.CIRCULAR_REFERENCE &&
            e.message.includes('Circular reference detected'),
        ),
      ).toBe(true);
    });
  });

  // =========================================================================
  // Approval Node Validation
  // =========================================================================

  describe('approval node validation', () => {
    it('should return INVALID_REJECT_TARGET error when reject_config targets START node', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'approval' },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            reject_config: {
              behavior: RejectBehavior.SEND_TO_SPECIFIC_NODE,
              target_node_key: 'start',
            },
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.INVALID_REJECT_TARGET &&
            e.message.includes('not guaranteed to be executed'),
        ),
      ).toBe(true);
    });

    it('should pass validation when reject_config targets preceding approval node', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'approval1' },
          {
            key: 'approval1',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval2',
          },
          {
            key: 'approval2',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            reject_config: {
              behavior: RejectBehavior.SEND_TO_SPECIFIC_NODE,
              target_node_key: 'approval1',
            },
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // =========================================================================
  // Condition Expression Validation
  // =========================================================================

  describe('condition expression validation', () => {
    it('should pass validation when expression returns boolean from comparison', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { expression: 'getFormField("amount").value > 1000' },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation when expression uses logical operators', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: {
                  expression:
                    'getFormField("amount").value > 1000 && getFormField("status").value === "approved"',
                },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation when ternary expression returns boolean in both branches', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: {
                  expression:
                    'getFormField("type").value === "A" ? getFormField("amount").value > 1000 : false',
                },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation when expression uses double negation for boolean coercion', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { expression: '!!getFormField("name").value' },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return INVALID_EXPRESSION error when expression returns string', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { expression: 'getFormField("name").value' },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.INVALID_EXPRESSION &&
            e.message.includes('Invalid condition expression'),
        ),
      ).toBe(true);
    });

    it('should return INVALID_EXPRESSION error when expression returns number', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { expression: 'getFormField("amount").value + 100' },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.INVALID_EXPRESSION &&
            e.message.includes('Invalid condition expression'),
        ),
      ).toBe(true);
    });

    it('should return INVALID_EXPRESSION error when expression concatenates strings', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: {
                  expression:
                    'getFormField("firstName").value + " " + getFormField("lastName").value',
                },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.INVALID_EXPRESSION &&
            e.message.includes('Invalid condition expression'),
        ),
      ).toBe(true);
    });

    it('should pass validation when using simple operator condition', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 1000 },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation when using fallback condition with null branch', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [{ branch: null, next: 'end' }],
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return INVALID_EXPRESSION when expression condition uses getCurrentNode()', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: {
                  expression: 'getCurrentNode().approverId.length > 0',
                },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.INVALID_EXPRESSION &&
            e.message.includes('Condition node "condition" expression') &&
            e.message.includes('can only be used in approval node expressions'),
        ),
      ).toBe(true);
    });

    it('should return INVALID_EXPRESSION when expression condition with return uses getCurrentNode()', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: {
                  expression: 'const a = getCurrentNode(); return true;',
                },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.INVALID_EXPRESSION &&
            e.message.includes('Condition node "condition" expression') &&
            e.message.includes('can only be used in approval node expressions'),
        ),
      ).toBe(true);
    });

    it('should return INVALID_EXPRESSION when simple condition field uses getCurrentNode()', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: {
                  field: 'getCurrentNode().approverId',
                  operator: '==',
                  value: 100,
                },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.INVALID_EXPRESSION &&
            e.message.includes('Condition node "condition" field') &&
            e.message.includes('can only be used in approval node expressions'),
        ),
      ).toBe(true);
    });

    it('should return INVALID_EXPRESSION when simple condition field has syntax error', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: {
                  field: 'getFormField("amount".',
                  operator: '==',
                  value: 100,
                },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.INVALID_EXPRESSION &&
            e.message.includes('Syntax error') &&
            e.message.includes('condition'),
        ),
      ).toBe(true);
    });
  });

  // =========================================================================
  // Approval Node Expression Validation
  // =========================================================================

  describe('approval node expression validation', () => {
    it('should pass when approval node has valid expression', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'approval' },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            expression: 'getCurrentNode()',
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when approval node has no expression', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'approval' },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when approval node expression uses multiple function calls', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'approval' },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            expression: `
              const node = getCurrentNode();
              const profile = getApplicantProfile();
              return { node, profile };
            `,
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return INVALID_EXPRESSION when approval node expression has syntax error', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'approval' },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            expression: 'getCurrentNode(.',
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.INVALID_EXPRESSION &&
            e.message.includes('approval node "approval"'),
        ),
      ).toBe(true);
    });

    it('should pass when approval node expression uses fetch', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'approval' },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            expression:
              'fetch("https://example.com/api", { method: "POST", body: JSON.stringify(getCurrentNode()) })',
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate expression on parallel approval node', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'approval' },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.PARALLEL,
            approval_logic: ApprovalLogic.AND,
            approvers: [
              { type: ApproverType.APPLICANT },
              { type: ApproverType.APPLICANT },
            ],
            next: 'end',
            expression: 'const x = ;',
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.INVALID_EXPRESSION &&
            e.message.includes('approval node "approval"'),
        ),
      ).toBe(true);
    });
  });

  // =========================================================================
  // SPECIFIC_USERS Expression Validation
  // =========================================================================

  describe('SPECIFIC_USERS expression validation', () => {
    it('should pass when specific_users expression returns getCurrentNode().approverId.prev', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'approval' },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: {
              type: ApproverType.SPECIFIC_USERS,
              config: {
                source: SourceType.EXPRESSION,
                expression: 'getCurrentNode().approverId.prev',
              },
            },
            next: 'end',
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass when specific_users uses legacy config without source', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'approval' },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: {
              type: ApproverType.SPECIFIC_USERS,
              config: { user_ids: [1, 2] },
            },
            next: 'end',
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return INVALID_EXPRESSION when specific_users expression has syntax error', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'approval' },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: {
              type: ApproverType.SPECIFIC_USERS,
              config: {
                source: SourceType.EXPRESSION,
                expression: 'getCurrentNode(.',
              },
            },
            next: 'end',
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.INVALID_EXPRESSION &&
            e.message.includes('specific_users expression') &&
            e.message.includes('approval node "approval"'),
        ),
      ).toBe(true);
    });

    it('should return INVALID_EXPRESSION when specific_users expression returns a non-array', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'approval' },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: {
              type: ApproverType.SPECIFIC_USERS,
              config: {
                source: SourceType.EXPRESSION,
                expression: '123',
              },
            },
            next: 'end',
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.INVALID_EXPRESSION &&
            e.message.includes('specific_users expression'),
        ),
      ).toBe(true);
    });

    it('should validate expression on parallel approval with approver index in error', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'approval' },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.PARALLEL,
            approval_logic: ApprovalLogic.AND,
            approvers: [
              {
                type: ApproverType.APPLICANT,
              },
              {
                type: ApproverType.SPECIFIC_USERS,
                config: {
                  source: SourceType.EXPRESSION,
                  expression: '"not an array"',
                },
              },
            ],
            next: 'end',
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.INVALID_EXPRESSION &&
            e.message.includes('approvers[1]'),
        ),
      ).toBe(true);
    });
  });

  // =========================================================================
  // Complex Flow Validation
  // =========================================================================

  describe('complex flow validation', () => {
    it('should pass validation when flow has all node types correctly configured', async () => {
      // Arrange
      const flowDefinition = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 1000 },
                next: 'parallel_approval',
              },
              { branch: null, next: 'single_approval' },
            ],
          },
          {
            key: 'parallel_approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.PARALLEL,
            approval_logic: ApprovalLogic.AND,
            approvers: [
              { type: ApproverType.APPLICANT },
              { type: ApproverType.APPLICANT },
            ],
            next: 'end',
          },
          {
            key: 'single_approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          { key: 'end', type: NodeType.END },
        ],
      };

      // Act
      const result = await service.validateFlowDefinition(flowDefinition);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
