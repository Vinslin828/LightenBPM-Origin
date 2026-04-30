import {
  NodeSchema,
  StartNodeSchema,
  EndNodeSchema,
  SingleApprovalNodeSchema,
  ParallelApprovalNodeSchema,
  SubflowNodeSchema,
} from './node.schema';
import {
  NodeType,
  ApprovalMethod,
  ApproverType,
  ApprovalLogic,
  RejectBehavior,
} from '../../../types';

describe('Node Schemas', () => {
  describe('StartNodeSchema', () => {
    it('should accept valid START node', () => {
      const node = {
        key: 'start',
        type: NodeType.START,
        next: 'approval',
      };

      const result = StartNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept START node with description', () => {
      const node = {
        key: 'start',
        type: NodeType.START,
        next: 'approval',
        description: 'Start of workflow',
      };

      const result = StartNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should reject START node without key', () => {
      const node = {
        type: NodeType.START,
        next: 'approval',
      };

      const result = StartNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject START node without next', () => {
      const node = {
        key: 'start',
        type: NodeType.START,
      };

      const result = StartNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject START node with empty next', () => {
      const node = {
        key: 'start',
        type: NodeType.START,
        next: '',
      };

      const result = StartNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });
  });

  describe('EndNodeSchema', () => {
    it('should accept valid END node', () => {
      const node = {
        key: 'end',
        type: NodeType.END,
      };

      const result = EndNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept END node with description', () => {
      const node = {
        key: 'end',
        type: NodeType.END,
        description: 'End of workflow',
      };

      const result = EndNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should reject END node without key', () => {
      const node = {
        type: NodeType.END,
      };

      const result = EndNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });
  });

  describe('SingleApprovalNodeSchema', () => {
    it('should accept valid SINGLE approval node', () => {
      const node = {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.SINGLE,
        approvers: { type: ApproverType.APPLICANT },
        next: 'end',
      };

      const result = SingleApprovalNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept SINGLE approval node with reject_config', () => {
      const node = {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.SINGLE,
        approvers: { type: ApproverType.APPLICANT },
        next: 'end',
        reject_config: {
          behavior: RejectBehavior.RETURN_TO_APPLICANT,
        },
      };

      const result = SingleApprovalNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept SINGLE approval with ROLE approver', () => {
      const node = {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.SINGLE,
        approvers: {
          type: ApproverType.ROLE,
          config: { role_id: 1 },
        },
        next: 'end',
      };

      const result = SingleApprovalNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should reject SINGLE approval without approvers', () => {
      const node = {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.SINGLE,
        next: 'end',
      };

      const result = SingleApprovalNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject SINGLE approval without next', () => {
      const node = {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.SINGLE,
        approvers: { type: ApproverType.APPLICANT },
      };

      const result = SingleApprovalNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject SINGLE approval with array approvers', () => {
      const node = {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.SINGLE,
        approvers: [{ type: ApproverType.APPLICANT }],
        next: 'end',
      };

      const result = SingleApprovalNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });
  });

  describe('ParallelApprovalNodeSchema', () => {
    it('should accept valid PARALLEL approval node with AND logic', () => {
      const node = {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.PARALLEL,
        approval_logic: ApprovalLogic.AND,
        approvers: [
          { type: ApproverType.APPLICANT },
          { type: ApproverType.APPLICANT },
        ],
        next: 'end',
      };

      const result = ParallelApprovalNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept valid PARALLEL approval node with OR logic', () => {
      const node = {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.PARALLEL,
        approval_logic: ApprovalLogic.OR,
        approvers: [
          { type: ApproverType.APPLICANT },
          { type: ApproverType.APPLICANT },
        ],
        next: 'end',
      };

      const result = ParallelApprovalNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept PARALLEL approval with reject_config', () => {
      const node = {
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
          behavior: RejectBehavior.CLOSE_APPLICATION,
        },
      };

      const result = ParallelApprovalNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should reject PARALLEL approval without approval_logic', () => {
      const node = {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.PARALLEL,
        approvers: [
          { type: ApproverType.APPLICANT },
          { type: ApproverType.APPLICANT },
        ],
        next: 'end',
      };

      const result = ParallelApprovalNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject PARALLEL approval with empty approvers array', () => {
      const node = {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.PARALLEL,
        approval_logic: ApprovalLogic.AND,
        approvers: [],
        next: 'end',
      };

      const result = ParallelApprovalNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject PARALLEL approval with single approver object', () => {
      const node = {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.PARALLEL,
        approval_logic: ApprovalLogic.AND,
        approvers: { type: ApproverType.APPLICANT },
        next: 'end',
      };

      const result = ParallelApprovalNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject PARALLEL approval with invalid approval_logic', () => {
      const node = {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.PARALLEL,
        approval_logic: 'INVALID',
        approvers: [
          { type: ApproverType.APPLICANT },
          { type: ApproverType.APPLICANT },
        ],
        next: 'end',
      };

      const result = ParallelApprovalNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });
  });

  describe('SubflowNodeSchema', () => {
    it('should accept valid SUBFLOW node', () => {
      const node = {
        key: 'subflow',
        type: NodeType.SUBFLOW,
        subflowId: 'subflow-123',
        next: 'end',
      };

      const result = SubflowNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should accept SUBFLOW node with description', () => {
      const node = {
        key: 'subflow',
        type: NodeType.SUBFLOW,
        subflowId: 'subflow-123',
        next: 'end',
        description: 'Call subflow',
      };

      const result = SubflowNodeSchema.safeParse(node);

      expect(result.success).toBe(true);
    });

    it('should reject SUBFLOW node without subflowId', () => {
      const node = {
        key: 'subflow',
        type: NodeType.SUBFLOW,
        next: 'end',
      };

      const result = SubflowNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject SUBFLOW node with empty subflowId', () => {
      const node = {
        key: 'subflow',
        type: NodeType.SUBFLOW,
        subflowId: '',
        next: 'end',
      };

      const result = SubflowNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject SUBFLOW node without next', () => {
      const node = {
        key: 'subflow',
        type: NodeType.SUBFLOW,
        subflowId: 'subflow-123',
      };

      const result = SubflowNodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });
  });

  describe('NodeSchema (combined)', () => {
    it('should accept any valid node type', () => {
      const nodes = [
        { key: 'start', type: NodeType.START, next: 'end' },
        { key: 'end', type: NodeType.END },
        {
          key: 'approval',
          type: NodeType.APPROVAL,
          approval_method: ApprovalMethod.SINGLE,
          approvers: { type: ApproverType.APPLICANT },
          next: 'end',
        },
      ];

      nodes.forEach((node) => {
        const result = NodeSchema.safeParse(node);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid node type', () => {
      const node = {
        key: 'invalid',
        type: 'INVALID_TYPE',
        next: 'end',
      };

      const result = NodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });

    it('should reject node without type', () => {
      const node = {
        key: 'invalid',
        next: 'end',
      };

      const result = NodeSchema.safeParse(node);

      expect(result.success).toBe(false);
    });
  });
});
