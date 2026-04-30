import {
  validateNodeNexts,
  validateRejectConfigContext,
} from './context.validator';
import {
  Node,
  NodeType,
  ApprovalMethod,
  RejectBehavior,
  ApproverType,
  ApprovalLogic,
} from '../../../types';
import { ErrorCode } from '../../../types/validation.types';

/**
 * Context Validators Test Suite
 *
 * Test Organization:
 * - Each function has its own describe block in source file order
 * - Group related tests by scenario using nested describe blocks
 * - Within each scenario: Success cases first → Failure cases second
 * - End with edge cases
 */

describe('Context Validators', () => {
  describe('validateNodeNexts', () => {
    let nodeKeys: Set<string>;

    beforeEach(() => {
      nodeKeys = new Set(['start', 'approval', 'condition', 'end']);
    });

    it('should return no errors for valid START node', () => {
      const node: Node = {
        key: 'start',
        type: NodeType.START,
        next: 'approval',
      };

      const errors = validateNodeNexts(node, nodeKeys);

      expect(errors).toHaveLength(0);
    });

    it('should return error when START node references non-existent node', () => {
      const node: Node = {
        key: 'start',
        type: NodeType.START,
        next: 'non_existent',
      };

      const errors = validateNodeNexts(node, nodeKeys);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.NODE_NOT_FOUND);
      expect(errors[0].message).toContain('start');
      expect(errors[0].message).toContain('non_existent');
    });

    it('should return no errors for valid APPROVAL node', () => {
      const node: Node = {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.SINGLE,
        approvers: { type: ApproverType.APPLICANT },
        next: 'end',
      };

      const errors = validateNodeNexts(node, nodeKeys);

      expect(errors).toHaveLength(0);
    });

    it('should return error when APPROVAL node references non-existent node', () => {
      const node: Node = {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.SINGLE,
        approvers: { type: ApproverType.APPLICANT },
        next: 'non_existent',
      };

      const errors = validateNodeNexts(node, nodeKeys);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.NODE_NOT_FOUND);
      expect(errors[0].message).toContain('approval');
      expect(errors[0].message).toContain('non_existent');
    });

    it('should return no errors for valid CONDITION node', () => {
      const node: Node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'age', operator: '>', value: 18 },
            next: 'approval',
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const errors = validateNodeNexts(node, nodeKeys);

      expect(errors).toHaveLength(0);
    });

    it('should return error when CONDITION branch references non-existent node', () => {
      const node: Node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'age', operator: '>', value: 18 },
            next: 'non_existent',
          },
          {
            branch: null,
            next: 'end',
          },
        ],
      };

      const errors = validateNodeNexts(node, nodeKeys);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.NODE_NOT_FOUND);
      expect(errors[0].message).toContain('condition');
      expect(errors[0].message).toContain('non_existent');
    });

    it('should return multiple errors when CONDITION has multiple invalid branches', () => {
      const node: Node = {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          {
            branch: { field: 'age', operator: '>', value: 18 },
            next: 'non_existent1',
          },
          {
            branch: null,
            next: 'non_existent2',
          },
        ],
      };

      const errors = validateNodeNexts(node, nodeKeys);

      expect(errors).toHaveLength(2);
      expect(errors.some((e) => e.message.includes('non_existent1'))).toBe(
        true,
      );
      expect(errors.some((e) => e.message.includes('non_existent2'))).toBe(
        true,
      );
    });

    it('should return no errors for END node', () => {
      const node: Node = {
        key: 'end',
        type: NodeType.END,
      };

      const errors = validateNodeNexts(node, nodeKeys);

      expect(errors).toHaveLength(0);
    });

    it('should return no errors for valid SUBFLOW node', () => {
      const node: Node = {
        key: 'subflow',
        type: NodeType.SUBFLOW,
        subflowId: 'subflow-123',
        next: 'end',
      };

      const errors = validateNodeNexts(node, nodeKeys);

      expect(errors).toHaveLength(0);
    });

    it('should return error when SUBFLOW node references non-existent node', () => {
      const node: Node = {
        key: 'subflow',
        type: NodeType.SUBFLOW,
        subflowId: 'subflow-123',
        next: 'non_existent',
      };

      const errors = validateNodeNexts(node, nodeKeys);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.NODE_NOT_FOUND);
      expect(errors[0].message).toContain('subflow');
      expect(errors[0].message).toContain('non_existent');
    });
  });

  describe('validateRejectConfigContext', () => {
    describe('Basic cases', () => {
      it('should return no errors when reject_config is not defined', () => {
        const node: Node = {
          key: 'approval',
          type: NodeType.APPROVAL,
          approval_method: ApprovalMethod.SINGLE,
          approvers: { type: ApproverType.APPLICANT },
          next: 'end',
        };

        const nodes: Node[] = [
          { key: 'start', type: NodeType.START, next: 'approval' },
          node,
          { key: 'end', type: NodeType.END },
        ];

        const errors = validateRejectConfigContext(node, { version: 1, nodes });

        expect(errors).toHaveLength(0);
      });

      it('should return no errors when reject behavior is CLOSE_APPLICATION', () => {
        const node: Node = {
          key: 'approval',
          type: NodeType.APPROVAL,
          approval_method: ApprovalMethod.SINGLE,
          approvers: { type: ApproverType.APPLICANT },
          next: 'end',
          reject_config: {
            behavior: RejectBehavior.CLOSE_APPLICATION,
          },
        };

        const nodes: Node[] = [
          { key: 'start', type: NodeType.START, next: 'approval' },
          node,
          { key: 'end', type: NodeType.END },
        ];

        const errors = validateRejectConfigContext(node, { version: 1, nodes });

        expect(errors).toHaveLength(0);
      });
    });

    describe('SEND_TO_SPECIFIC_NODE behavior', () => {
      describe('Preceding nodes', () => {
        it('should return no errors when rejecting to a preceding APPROVAL node', () => {
          const approval0: Node = {
            key: 'approval0',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval1',
          };

          const node: Node = {
            key: 'approval1',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            reject_config: {
              behavior: RejectBehavior.SEND_TO_SPECIFIC_NODE,
              target_node_key: 'approval0',
            },
          };

          const nodes: Node[] = [
            { key: 'start', type: NodeType.START, next: 'approval0' },
            approval0,
            node,
            { key: 'end', type: NodeType.END },
          ];

          const errors = validateRejectConfigContext(node, {
            version: 1,
            nodes,
          });

          expect(errors).toHaveLength(0);
        });

        it('should return no errors when rejecting to CONDITION node', () => {
          const node: Node = {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            reject_config: {
              behavior: RejectBehavior.SEND_TO_SPECIFIC_NODE,
              target_node_key: 'condition',
            },
          };

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
            node,
            { key: 'end', type: NodeType.END },
          ];

          const errors = validateRejectConfigContext(node, {
            version: 1,
            nodes,
          });

          expect(errors).toHaveLength(0);
        });
      });

      describe('Invalid targets', () => {
        it('should return error when target_node_key does not exist', () => {
          const node: Node = {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            reject_config: {
              behavior: RejectBehavior.SEND_TO_SPECIFIC_NODE,
              target_node_key: 'non_existent',
            },
          };

          const nodes: Node[] = [
            { key: 'start', type: NodeType.START, next: 'approval' },
            node,
            { key: 'end', type: NodeType.END },
          ];

          const errors = validateRejectConfigContext(node, {
            version: 1,
            nodes,
          });

          expect(errors).toHaveLength(1);
          expect(errors[0].code).toBe(ErrorCode.INVALID_REJECT_TARGET);
          expect(errors[0].message).toContain('approval');
          expect(errors[0].message).toContain('non_existent');
          expect(errors[0].message).toContain('not guaranteed to be executed');
        });

        it('should return error when rejecting to START node', () => {
          const node: Node = {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.PARALLEL,
            approval_logic: ApprovalLogic.AND,
            approvers: [
              { type: ApproverType.APPLICANT },
              { type: ApproverType.APPLICANT },
            ],
            next: 'end',
            reject_config: {
              behavior: RejectBehavior.SEND_TO_SPECIFIC_NODE,
              target_node_key: 'start',
            },
          };

          const nodes: Node[] = [
            { key: 'start', type: NodeType.START, next: 'approval' },
            node,
            { key: 'end', type: NodeType.END },
          ];

          const errors = validateRejectConfigContext(node, {
            version: 1,
            nodes,
          });

          expect(errors).toHaveLength(1);
          expect(errors[0].code).toBe(ErrorCode.INVALID_REJECT_TARGET);
        });

        it('should return error when target is in a different branch (not guaranteed to be executed)', () => {
          // Flow structure:
          //   start -> condition
          //            ├─ branch A -> approval_a -> merge
          //            └─ branch B -> approval_b -> merge
          //   approval_b wants to reject to approval_a (should fail - different branch)
          const node: Node = {
            key: 'approval_b',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'merge',
            reject_config: {
              behavior: RejectBehavior.SEND_TO_SPECIFIC_NODE,
              target_node_key: 'approval_a', // In different branch!
            },
          };

          const nodes: Node[] = [
            { key: 'start', type: NodeType.START, next: 'condition' },
            {
              key: 'condition',
              type: NodeType.CONDITION,
              conditions: [
                {
                  branch: { field: 'type', operator: '==', value: 'A' },
                  next: 'approval_a',
                },
                { branch: null, next: 'approval_b' },
              ],
            },
            {
              key: 'approval_a',
              type: NodeType.APPROVAL,
              approval_method: ApprovalMethod.SINGLE,
              approvers: { type: ApproverType.APPLICANT },
              next: 'merge',
            },
            node,
            {
              key: 'merge',
              type: NodeType.APPROVAL,
              approval_method: ApprovalMethod.SINGLE,
              approvers: { type: ApproverType.APPLICANT },
              next: 'end',
            },
            { key: 'end', type: NodeType.END },
          ];

          const errors = validateRejectConfigContext(node, {
            version: 1,
            nodes,
          });

          expect(errors).toHaveLength(1);
          expect(errors[0].code).toBe(ErrorCode.INVALID_REJECT_TARGET);
          expect(errors[0].message).toContain('approval_b');
          expect(errors[0].message).toContain('approval_a');
          expect(errors[0].message).toContain('not guaranteed to be executed');
        });
      });
    });

    describe('USER_SELECT behavior', () => {
      describe('Valid selections', () => {
        it('should return no errors when all selectable_node_keys exist and are not START', () => {
          const node: Node = {
            key: 'approval3',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            reject_config: {
              behavior: RejectBehavior.USER_SELECT,
              user_select_options: {
                allow_return_to_applicant: true,
                selectable_node_keys: ['approval1', 'approval2'],
              },
            },
          };

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
              next: 'approval3',
            },
            node,
            { key: 'end', type: NodeType.END },
          ];

          const errors = validateRejectConfigContext(node, {
            version: 1,
            nodes,
          });

          expect(errors).toHaveLength(0);
        });

        it('should return no errors when selectable_node_keys is empty array', () => {
          const node: Node = {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            reject_config: {
              behavior: RejectBehavior.USER_SELECT,
              user_select_options: {
                allow_return_to_applicant: true,
                selectable_node_keys: [],
              },
            },
          };

          const nodes: Node[] = [
            { key: 'start', type: NodeType.START, next: 'approval' },
            node,
            { key: 'end', type: NodeType.END },
          ];

          const errors = validateRejectConfigContext(node, {
            version: 1,
            nodes,
          });

          expect(errors).toHaveLength(0);
        });

        it('should return no errors when selectable_node_keys is undefined', () => {
          const node: Node = {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            reject_config: {
              behavior: RejectBehavior.USER_SELECT,
              user_select_options: {
                allow_close_application: true,
              },
            },
          };

          const nodes: Node[] = [
            { key: 'start', type: NodeType.START, next: 'approval' },
            node,
            { key: 'end', type: NodeType.END },
          ];

          const errors = validateRejectConfigContext(node, {
            version: 1,
            nodes,
          });

          expect(errors).toHaveLength(0);
        });
      });

      describe('Invalid selections', () => {
        it('should return error when selectable_node_keys contains non-existent node', () => {
          const node: Node = {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            reject_config: {
              behavior: RejectBehavior.USER_SELECT,
              user_select_options: {
                allow_return_to_applicant: true,
                selectable_node_keys: [
                  'approval1',
                  'non_existent',
                  'approval2',
                ],
              },
            },
          };

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
              next: 'approval',
            },
            node,
            { key: 'end', type: NodeType.END },
          ];

          const errors = validateRejectConfigContext(node, {
            version: 1,
            nodes,
          });

          expect(errors).toHaveLength(1);
          expect(errors[0].code).toBe(ErrorCode.INVALID_REJECT_TARGET);
          expect(errors[0].message).toContain('approval');
          expect(errors[0].message).toContain('non_existent');
          expect(errors[0].message).toContain('not a possible preceding node');
        });

        it('should return multiple errors when selectable_node_keys contains multiple non-existent nodes', () => {
          const node: Node = {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            reject_config: {
              behavior: RejectBehavior.USER_SELECT,
              user_select_options: {
                allow_close_application: true,
                selectable_node_keys: [
                  'non_existent1',
                  'approval1',
                  'non_existent2',
                ],
              },
            },
          };

          const nodes: Node[] = [
            { key: 'start', type: NodeType.START, next: 'approval1' },
            {
              key: 'approval1',
              type: NodeType.APPROVAL,
              approval_method: ApprovalMethod.SINGLE,
              approvers: { type: ApproverType.APPLICANT },
              next: 'approval',
            },
            node,
            { key: 'end', type: NodeType.END },
          ];

          const errors = validateRejectConfigContext(node, {
            version: 1,
            nodes,
          });

          expect(errors).toHaveLength(2);
          expect(errors.some((e) => e.message.includes('non_existent1'))).toBe(
            true,
          );
          expect(errors.some((e) => e.message.includes('non_existent2'))).toBe(
            true,
          );
          expect(
            errors.every((e) => e.code === ErrorCode.INVALID_REJECT_TARGET),
          ).toBe(true);
        });

        it('should return error when selectable_node_keys contains START node', () => {
          const node: Node = {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            reject_config: {
              behavior: RejectBehavior.USER_SELECT,
              user_select_options: {
                allow_return_to_applicant: true,
                selectable_node_keys: ['start', 'approval1'],
              },
            },
          };

          const nodes: Node[] = [
            { key: 'start', type: NodeType.START, next: 'approval1' },
            {
              key: 'approval1',
              type: NodeType.APPROVAL,
              approval_method: ApprovalMethod.SINGLE,
              approvers: { type: ApproverType.APPLICANT },
              next: 'approval',
            },
            node,
            { key: 'end', type: NodeType.END },
          ];

          const errors = validateRejectConfigContext(node, {
            version: 1,
            nodes,
          });

          expect(errors).toHaveLength(1);
          expect(errors[0].code).toBe(ErrorCode.INVALID_REJECT_TARGET);
          expect(errors[0].message).toContain('approval');
          expect(errors[0].message).toContain('not a possible preceding node');
          expect(errors[0].message).toContain('start');
        });

        it('should return multiple errors when selectable_node_keys contains multiple START nodes', () => {
          const node: Node = {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            reject_config: {
              behavior: RejectBehavior.USER_SELECT,
              user_select_options: {
                allow_close_application: true,
                selectable_node_keys: ['start1', 'approval1', 'start2'],
              },
            },
          };

          const nodes: Node[] = [
            { key: 'start1', type: NodeType.START, next: 'approval1' },
            { key: 'start2', type: NodeType.START, next: 'approval1' },
            {
              key: 'approval1',
              type: NodeType.APPROVAL,
              approval_method: ApprovalMethod.SINGLE,
              approvers: { type: ApproverType.APPLICANT },
              next: 'approval',
            },
            node,
            { key: 'end', type: NodeType.END },
          ];

          const errors = validateRejectConfigContext(node, {
            version: 1,
            nodes,
          });

          expect(errors).toHaveLength(2);
          expect(errors.some((e) => e.message.includes('start1'))).toBe(true);
          expect(errors.some((e) => e.message.includes('start2'))).toBe(true);
          expect(
            errors.every((e) => e.code === ErrorCode.INVALID_REJECT_TARGET),
          ).toBe(true);
        });

        it('should return mixed errors when selectable_node_keys has both non-existent and START nodes', () => {
          const node: Node = {
            key: 'approval',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
            reject_config: {
              behavior: RejectBehavior.USER_SELECT,
              user_select_options: {
                allow_return_to_applicant: true,
                selectable_node_keys: ['start', 'non_existent', 'approval1'],
              },
            },
          };

          const nodes: Node[] = [
            { key: 'start', type: NodeType.START, next: 'approval1' },
            {
              key: 'approval1',
              type: NodeType.APPROVAL,
              approval_method: ApprovalMethod.SINGLE,
              approvers: { type: ApproverType.APPLICANT },
              next: 'approval',
            },
            node,
            { key: 'end', type: NodeType.END },
          ];

          const errors = validateRejectConfigContext(node, {
            version: 1,
            nodes,
          });

          expect(errors).toHaveLength(2);
          expect(errors.some((e) => e.message.includes('non_existent'))).toBe(
            true,
          );
          expect(errors.some((e) => e.message.includes('start'))).toBe(true);
          expect(
            errors.every((e) => e.code === ErrorCode.INVALID_REJECT_TARGET),
          ).toBe(true);
        });
      });
    });
  });
});
