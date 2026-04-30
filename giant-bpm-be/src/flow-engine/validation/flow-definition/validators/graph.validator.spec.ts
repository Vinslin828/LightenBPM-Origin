import {
  validateReachability,
  detectCircularReferences,
} from './graph.validator';
import { Node, NodeType, ApprovalMethod, ApproverType } from '../../../types';
import { ErrorCode } from '../../../types/validation.types';

/**
 * Graph Validators Test Suite
 *
 * Test Organization:
 * - Each function has its own describe block in source file order
 * - Group related tests by scenario using nested describe blocks
 * - Within each scenario: Success cases first → Failure cases second
 * - End with edge cases
 */

describe('Graph Validators', () => {
  describe('validateReachability', () => {
    describe('Linear flows', () => {
      it('should return no errors for simple valid flow', () => {
        const nodes: Node[] = [
          { key: 'start', type: NodeType.START, next: 'end' },
          { key: 'end', type: NodeType.END },
        ];

        const errors = validateReachability(nodes);

        expect(errors).toHaveLength(0);
      });

      it('should detect unreachable node in linear flow', () => {
        const nodes: Node[] = [
          { key: 'start', type: NodeType.START, next: 'end' },
          {
            key: 'orphan',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          { key: 'end', type: NodeType.END },
        ];

        const errors = validateReachability(nodes);

        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe(ErrorCode.UNREACHABLE_NODE);
        expect(errors[0].message).toContain('orphan');
      });

      it('should detect multiple unreachable nodes', () => {
        const nodes: Node[] = [
          { key: 'start', type: NodeType.START, next: 'end' },
          {
            key: 'orphan1',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'orphan2',
          },
          {
            key: 'orphan2',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          { key: 'end', type: NodeType.END },
        ];

        const errors = validateReachability(nodes);

        expect(errors).toHaveLength(2);
        expect(errors.some((e) => e.message.includes('orphan1'))).toBe(true);
        expect(errors.some((e) => e.message.includes('orphan2'))).toBe(true);
      });
    });

    describe('Condition node flows', () => {
      it('should handle condition node branches correctly', () => {
        const nodes: Node[] = [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'age', operator: '>', value: 18 },
                next: 'approval1',
              },
              {
                branch: null,
                next: 'approval2',
              },
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
            key: 'approval2',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          { key: 'end', type: NodeType.END },
        ];

        const errors = validateReachability(nodes);

        expect(errors).toHaveLength(0);
      });

      it('should detect unreachable node in condition branch', () => {
        const nodes: Node[] = [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'age', operator: '>', value: 18 },
                next: 'approval1',
              },
              {
                branch: null,
                next: 'end',
              },
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
            key: 'approval2', // Unreachable!
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          { key: 'end', type: NodeType.END },
        ];

        const errors = validateReachability(nodes);

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('approval2');
      });
    });

    describe('Edge cases', () => {
      it('should return empty array when no START node exists', () => {
        const nodes: Node[] = [{ key: 'end', type: NodeType.END }];

        const errors = validateReachability(nodes);

        expect(errors).toHaveLength(0);
      });
    });
  });

  describe('detectCircularReferences', () => {
    describe('Linear flows', () => {
      it('should return no errors for simple valid flow', () => {
        const nodes: Node[] = [
          { key: 'start', type: NodeType.START, next: 'end' },
          { key: 'end', type: NodeType.END },
        ];

        const errors = detectCircularReferences(nodes);

        expect(errors).toHaveLength(0);
      });

      it('should detect simple circular reference', () => {
        const nodes: Node[] = [
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
        ];

        const errors = detectCircularReferences(nodes);

        expect(errors).toHaveLength(1);
        expect(errors[0].code).toBe(ErrorCode.CIRCULAR_REFERENCE);
        expect(errors[0].message).toContain('Circular reference detected');
        expect(errors[0].message).toContain('approval1');
        expect(errors[0].message).toContain('approval2');
      });

      it('should detect self-referencing node', () => {
        const nodes: Node[] = [
          { key: 'start', type: NodeType.START, next: 'approval' },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval', // Self-reference!
          },
          { key: 'end', type: NodeType.END },
        ];

        const errors = detectCircularReferences(nodes);

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('approval');
      });
    });

    describe('Condition node flows', () => {
      it('should handle complex flow without circular references', () => {
        const nodes: Node[] = [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 1000 },
                next: 'approval1',
              },
              {
                branch: null,
                next: 'approval2',
              },
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
            key: 'approval2',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          { key: 'end', type: NodeType.END },
        ];

        const errors = detectCircularReferences(nodes);

        expect(errors).toHaveLength(0);
      });

      it('should detect circular reference in condition branches', () => {
        const nodes: Node[] = [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'retry', operator: '==', value: true },
                next: 'approval',
              },
              {
                branch: null,
                next: 'end',
              },
            ],
          },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'condition', // Circular!
          },
          { key: 'end', type: NodeType.END },
        ];

        const errors = detectCircularReferences(nodes);

        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain('condition');
        expect(errors[0].message).toContain('approval');
      });
    });

    describe('Edge cases', () => {
      it('should return empty array when no START node exists', () => {
        const nodes: Node[] = [{ key: 'end', type: NodeType.END }];

        const errors = detectCircularReferences(nodes);

        expect(errors).toHaveLength(0);
      });
    });
  });
});
