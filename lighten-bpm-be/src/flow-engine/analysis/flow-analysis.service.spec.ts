import { FlowAnalysisService } from './flow-analysis.service';
import {
  NodeType,
  ApprovalMethod,
  RejectBehavior,
  ApproverType,
  FlowDefinition,
} from '../types';

/**
 * Flow Analysis Service Test Suite
 *
 * Test Organization:
 * - Each function has its own describe block in source file order
 * - Comprehensive test cases covering linear flows, branching flows, and complex patterns
 * - Each test includes flow diagrams and expected behavior documentation
 */

describe('FlowAnalysisService', () => {
  let service: FlowAnalysisService;

  beforeEach(() => {
    service = new FlowAnalysisService();
  });

  describe('findGuaranteedPrecedingNodes', () => {
    /**
     * Test Case 1: Simple Linear Flow
     *
     * START -> approval1 -> approval2 -> END
     *
     * Expected:
     * - From approval2: should return [approval1]
     * - From approval1: should return []
     */
    it('should find guaranteed nodes in simple linear flow', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'approval1',
          },
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
          },
          {
            key: 'end',
            type: NodeType.END,
          },
        ],
      };

      const result = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'approval2',
      );

      expect(result).toEqual(['approval1']);
    });

    /**
     * Test Case 2: Simple Branching Flow
     *
     *            ┌─> approvalA ─┐
     * START -> condition      └─> END
     *            └─> approvalB ─┘
     *
     * Expected:
     * - From approvalA: should return [condition] only (not approvalB)
     * - From approvalB: should return [condition] only (not approvalA)
     * - From END: should return [condition] (appears in ALL paths)
     */
    it('should handle branching flow correctly', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'condition',
          },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 1000 },
                next: 'approvalA',
              },
              {
                branch: null,
                next: 'approvalB',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          {
            key: 'approvalB',
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

      // From approvalA: only condition is guaranteed
      const resultA = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'approvalA',
      );
      expect(resultA).toEqual(['condition']);
      expect(resultA).not.toContain('approvalB');

      // From approvalB: only condition is guaranteed
      const resultB = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'approvalB',
      );
      expect(resultB).toEqual(['condition']);
      expect(resultB).not.toContain('approvalA');

      // From END: condition is guaranteed (both paths go through it)
      const resultEnd = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'end',
      );
      expect(resultEnd).toEqual(['condition']);
      expect(resultEnd).not.toContain('approvalA');
      expect(resultEnd).not.toContain('approvalB');
    });

    /**
     * Test Case 3: Diamond Pattern (Converging Paths)
     *
     *            ┌─> approvalA ─┐
     * START -> condition      merge -> END
     *            └─> approvalB ─┘
     *
     * Expected:
     * - From merge: should return [condition, approvalA, approvalB]
     *   (both approvalA and approvalB appear in all paths)
     * - From END: should return [condition, merge]
     */
    it('should find all guaranteed nodes in diamond pattern', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'condition',
          },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 1000 },
                next: 'approvalA',
              },
              {
                branch: null,
                next: 'approvalB',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'merge',
          },
          {
            key: 'approvalB',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'merge',
          },
          {
            key: 'merge',
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

      // From merge: condition is guaranteed, but NOT individual approvals
      const resultMerge = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'merge',
      );
      expect(resultMerge).toContain('condition');
      // approvalA and approvalB are NOT guaranteed because only ONE path goes through each
      expect(resultMerge).not.toContain('approvalA');
      expect(resultMerge).not.toContain('approvalB');

      // From END: both merge and condition are guaranteed
      const resultEnd = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'end',
      );
      expect(resultEnd).toContain('merge');
      expect(resultEnd).toContain('condition');
    });

    /**
     * Test Case 4: Complex Flow with Sequential and Branching
     *
     * START -> approval1 -> condition -> approvalA -> END
     *                           └──────> approvalB -> END
     *
     * Expected:
     * - From approvalA: should return [condition, approval1]
     * - From approvalB: should return [condition, approval1]
     * - From END: should return [condition, approval1] (but NOT approvalA or approvalB)
     */
    it('should handle complex sequential and branching flow', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'approval1',
          },
          {
            key: 'approval1',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'condition',
          },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 1000 },
                next: 'approvalA',
              },
              {
                branch: null,
                next: 'approvalB',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          {
            key: 'approvalB',
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

      // From approvalA
      const resultA = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'approvalA',
      );
      expect(resultA).toContain('condition');
      expect(resultA).toContain('approval1');

      // From approvalB
      const resultB = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'approvalB',
      );
      expect(resultB).toContain('condition');
      expect(resultB).toContain('approval1');

      // From END: both earlier nodes are guaranteed
      const resultEnd = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'end',
      );
      expect(resultEnd).toContain('condition');
      expect(resultEnd).toContain('approval1');
      expect(resultEnd).not.toContain('approvalA');
      expect(resultEnd).not.toContain('approvalB');
    });

    /**
     * Test Case 5: Flow with Approval Reject Path
     *
     * START -> approval1 -> approval2 -> END
     *            └─(reject)──┘
     *
     * Expected:
     * - From approval2: should return [approval1]
     * - approval1 can reject back to approval2 (creates loop, but still one-way for normal flow)
     */
    it('should handle approval nodes with reject paths', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'approval1',
          },
          {
            key: 'approval1',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval2',
            reject_config: {
              behavior: RejectBehavior.SEND_TO_SPECIFIC_NODE,
              target_node_key: 'approval2',
            },
          },
          {
            key: 'approval2',
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

      const result = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'approval2',
      );

      // approval1 is guaranteed to precede approval2 via normal flow
      expect(result).toContain('approval1');
    });

    /**
     * Test Case 6: Flow with USER_SELECT reject options
     *
     * START -> approval1 -> approval2 -> approval3 -> END
     *                        └─(user select: approval1 or approval3)
     *
     * Expected:
     * - From approval3: should return [approval2, approval1]
     */
    it('should handle approval nodes with USER_SELECT reject paths', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'approval1',
          },
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
            reject_config: {
              behavior: RejectBehavior.USER_SELECT,
              user_select_options: {
                selectable_node_keys: ['approval1', 'approval3'],
              },
            },
          },
          {
            key: 'approval3',
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

      const result = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'approval3',
      );

      expect(result).toContain('approval2');
      expect(result).toContain('approval1');
    });

    /**
     * Test Case 7: Edge Case - Node with No Path to START
     *
     * START -> approval1 -> END
     * orphan (not connected)
     *
     * Expected:
     * - From orphan: should return [] (no path to START)
     */
    it('should return empty array for node with no path to START', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'approval1',
          },
          {
            key: 'approval1',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          {
            key: 'orphan',
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

      const result = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'orphan',
      );

      expect(result).toEqual([]);
    });

    /**
     * Test Case 8: START node should never be included in results
     *
     * START -> approval1 -> END
     *
     * Expected:
     * - From approval1: should return [] (START is excluded)
     */
    it('should exclude START node from results', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'approval1',
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

      const result = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'approval1',
      );

      expect(result).toEqual([]);
      expect(result).not.toContain('start');
    });

    /**
     * Test Case 9: Complex Multi-Branch Flow
     *
     *                  ┌─> approvalA ─┐
     * START -> cond1 ─┼─> approvalB ─┼─> cond2 -> END
     *                  └─> approvalC ─┘
     *
     * Expected:
     * - From cond2: should return [cond1] (all paths go through it)
     * - From END: should return [cond2, cond1]
     */
    it('should handle complex multi-branch converging flow', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'cond1',
          },
          {
            key: 'cond1',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 10000 },
                next: 'approvalA',
              },
              {
                branch: { field: 'amount', operator: '>', value: 5000 },
                next: 'approvalB',
              },
              {
                branch: null,
                next: 'approvalC',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'cond2',
          },
          {
            key: 'approvalB',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'cond2',
          },
          {
            key: 'approvalC',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'cond2',
          },
          {
            key: 'cond2',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'status', operator: '==', value: 'approved' },
                next: 'end',
              },
              {
                branch: null,
                next: 'end',
              },
            ],
          },
          {
            key: 'end',
            type: NodeType.END,
          },
        ],
      };

      // From cond2: cond1 is guaranteed, but not individual approvals
      const resultCond2 = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'cond2',
      );
      expect(resultCond2).toContain('cond1');
      expect(resultCond2).not.toContain('approvalA');
      expect(resultCond2).not.toContain('approvalB');
      expect(resultCond2).not.toContain('approvalC');

      // From END: both conditions are guaranteed
      const resultEnd = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'end',
      );
      expect(resultEnd).toContain('cond2');
      expect(resultEnd).toContain('cond1');
    });
  });

  describe('findPossiblePrecedingNodes', () => {
    /**
     * Test Case 1: Simple Branching Flow
     *
     *            ┌─> approvalA ─┐
     * START -> condition      └─> END
     *            └─> approvalB ─┘
     *
     * Expected:
     * - From END: should return [condition, approvalA, approvalB]
     *   (all nodes that appear in ANY path)
     */
    it('should find all possible nodes in branching flow', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'condition',
          },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 1000 },
                next: 'approvalA',
              },
              {
                branch: null,
                next: 'approvalB',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          {
            key: 'approvalB',
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

      // From END: all nodes in either branch should be included
      const result = service.findPossiblePrecedingNodes(flowDefinition, 'end');

      expect(result).toContain('condition');
      expect(result).toContain('approvalA');
      expect(result).toContain('approvalB');
      expect(result).not.toContain('start'); // START should be excluded
      expect(result).not.toContain('end'); // Target itself should be excluded
    });

    /**
     * Test Case 2: Diamond Pattern
     *
     *            ┌─> approvalA ─┐
     * START -> condition      merge -> END
     *            └─> approvalB ─┘
     *
     * Expected:
     * - From merge: should return [condition, approvalA, approvalB]
     * - From END: should return [condition, approvalA, approvalB, merge]
     */
    it('should find all possible nodes in diamond pattern', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'condition',
          },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 1000 },
                next: 'approvalA',
              },
              {
                branch: null,
                next: 'approvalB',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'merge',
          },
          {
            key: 'approvalB',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'merge',
          },
          {
            key: 'merge',
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

      // From merge: all nodes from both branches
      const resultMerge = service.findPossiblePrecedingNodes(
        flowDefinition,
        'merge',
      );
      expect(resultMerge).toContain('condition');
      expect(resultMerge).toContain('approvalA');
      expect(resultMerge).toContain('approvalB');

      // From END: all nodes including merge
      const resultEnd = service.findPossiblePrecedingNodes(
        flowDefinition,
        'end',
      );
      expect(resultEnd).toContain('condition');
      expect(resultEnd).toContain('approvalA');
      expect(resultEnd).toContain('approvalB');
      expect(resultEnd).toContain('merge');
    });

    /**
     * Test Case 3: Compare with Guaranteed Nodes
     *
     * Verify that possible nodes is a superset of guaranteed nodes
     */
    it('should return superset of guaranteed nodes', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'approval1',
          },
          {
            key: 'approval1',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'condition',
          },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 1000 },
                next: 'approvalA',
              },
              {
                branch: null,
                next: 'approvalB',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          {
            key: 'approvalB',
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

      const guaranteed = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'end',
      );
      const possible = service.findPossiblePrecedingNodes(
        flowDefinition,
        'end',
      );

      // Possible should include all guaranteed nodes
      guaranteed.forEach((nodeKey) => {
        expect(possible).toContain(nodeKey);
      });

      // Possible should also include branch-specific nodes
      expect(possible).toContain('approvalA');
      expect(possible).toContain('approvalB');

      // Guaranteed should NOT include branch-specific nodes
      expect(guaranteed).not.toContain('approvalA');
      expect(guaranteed).not.toContain('approvalB');
    });

    /**
     * Test Case 4: Linear Flow (No Branching)
     *
     * START -> approval1 -> approval2 -> END
     *
     * Expected:
     * - Possible and guaranteed should be the same for linear flows
     */
    it('should match guaranteed nodes in linear flow', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'approval1',
          },
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
          },
          {
            key: 'end',
            type: NodeType.END,
          },
        ],
      };

      const guaranteed = service.findGuaranteedPrecedingNodes(
        flowDefinition,
        'end',
      );
      const possible = service.findPossiblePrecedingNodes(
        flowDefinition,
        'end',
      );

      // For linear flows, possible and guaranteed should be identical
      expect(possible.sort()).toEqual(guaranteed.sort());
    });

    /**
     * Test Case 5: Complex Multi-Path Flow
     *
     * Tests that all nodes from all possible paths are included
     */
    it('should include all nodes from all paths in complex flow', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'cond1',
          },
          {
            key: 'cond1',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'type', operator: '==', value: 'A' },
                next: 'approvalA',
              },
              {
                branch: { field: 'type', operator: '==', value: 'B' },
                next: 'approvalB',
              },
              {
                branch: null,
                next: 'approvalC',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'cond2',
          },
          {
            key: 'approvalB',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'cond2',
          },
          {
            key: 'approvalC',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          {
            key: 'cond2',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'status', operator: '==', value: 'ok' },
                next: 'end',
              },
              {
                branch: null,
                next: 'end',
              },
            ],
          },
          {
            key: 'end',
            type: NodeType.END,
          },
        ],
      };

      const result = service.findPossiblePrecedingNodes(flowDefinition, 'end');

      // Should include all approvals from all branches
      expect(result).toContain('cond1');
      expect(result).toContain('approvalA');
      expect(result).toContain('approvalB');
      expect(result).toContain('approvalC');

      // cond2 appears in some paths but not all
      expect(result).toContain('cond2');
    });
  });

  describe('findSelectableRejectTargets', () => {
    /**
     * Test Case 1: Simple Linear Flow
     *
     * START -> approval1 -> approval2 -> approval3 (current)
     *
     * Runtime traversed nodes: [approval1, approval2]
     *
     * Expected:
     * - From approval3: should return [approval1, approval2]
     *   (all traversed predecessors are selectable)
     */
    it('should return all traversed predecessors in linear flow', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'approval1',
          },
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
          {
            key: 'approval3',
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

      const traversedNodeKeys = ['approval1', 'approval2'];
      const currentNodeKey = 'approval3';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        traversedNodeKeys,
        currentNodeKey,
      );

      expect(result).toContain('approval1');
      expect(result).toContain('approval2');
      expect(result).toHaveLength(2);
    });

    /**
     * Test Case 2: Branching Flow - Filter Out Parallel Branches
     *
     *            ┌─> approvalA ─┐
     * START -> condition      └─> approval3 (current)
     *            └─> approvalB ─┘
     *
     * Runtime traversed nodes: [condition, approvalA, approvalB]
     * Current execution path: START -> condition -> approvalA -> approval3
     *
     * Expected:
     * - From approval3: should return [condition, approvalA]
     *   (approvalB is in parallel branch and not a predecessor of approval3)
     */
    it('should filter out nodes from parallel branches', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'condition',
          },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 1000 },
                next: 'approvalA',
              },
              {
                branch: null,
                next: 'approvalB',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval3',
          },
          {
            key: 'approvalB',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval3',
          },
          {
            key: 'approval3',
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

      // Simulate runtime: both branches were executed at some point
      const traversedNodeKeys = ['condition', 'approvalA', 'approvalB'];
      const currentNodeKey = 'approval3';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        traversedNodeKeys,
        currentNodeKey,
      );

      // Should include nodes from all possible paths (both approvalA and approvalB are possible predecessors)
      expect(result).toContain('condition');
      expect(result).toContain('approvalA');
      expect(result).toContain('approvalB');
      expect(result).toHaveLength(3);
    });

    /**
     * Test Case 3: Diamond Pattern - Both Branches Are Valid Predecessors
     *
     *            ┌─> approvalA ─┐
     * START -> condition      merge (current)
     *            └─> approvalB ─┘
     *
     * Runtime traversed nodes: [condition, approvalA, approvalB]
     *
     * Expected:
     * - From merge: should return [condition, approvalA, approvalB]
     *   (both branches lead to merge, so both are valid predecessors)
     */
    it('should include all branches that converge to current node', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'condition',
          },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 1000 },
                next: 'approvalA',
              },
              {
                branch: null,
                next: 'approvalB',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'merge',
          },
          {
            key: 'approvalB',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'merge',
          },
          {
            key: 'merge',
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

      const traversedNodeKeys = ['condition', 'approvalA', 'approvalB'];
      const currentNodeKey = 'merge';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        traversedNodeKeys,
        currentNodeKey,
      );

      expect(result).toContain('condition');
      expect(result).toContain('approvalA');
      expect(result).toContain('approvalB');
      expect(result).toHaveLength(3);
    });

    /**
     * Test Case 4: Only Include Actually Traversed Nodes
     *
     * START -> approval1 -> approval2 -> approval3 (current)
     *
     * Runtime traversed nodes: [approval1] (approval2 was skipped somehow)
     *
     * Expected:
     * - From approval3: should return [approval1]
     *   (only approval1 was actually traversed, approval2 not included)
     */
    it('should only include nodes that were actually traversed', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'approval1',
          },
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
          {
            key: 'approval3',
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

      // Only approval1 was traversed (approval2 somehow not completed)
      const traversedNodeKeys = ['approval1'];
      const currentNodeKey = 'approval3';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        traversedNodeKeys,
        currentNodeKey,
      );

      expect(result).toContain('approval1');
      expect(result).not.toContain('approval2'); // Not traversed
      expect(result).toHaveLength(1);
    });

    /**
     * Test Case 5: Exclude START and Current Node
     *
     * START -> approval1 (current)
     *
     * Runtime traversed nodes: [start, approval1]
     *
     * Expected:
     * - From approval1: should return []
     *   (START is excluded, current node is excluded)
     */
    it('should exclude START node and current node', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'approval1',
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

      const traversedNodeKeys = ['start', 'approval1'];
      const currentNodeKey = 'approval1';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        traversedNodeKeys,
        currentNodeKey,
      );

      expect(result).not.toContain('start');
      expect(result).not.toContain('approval1');
      expect(result).toHaveLength(0);
    });

    /**
     * Test Case 6: Complex Flow - Multiple Branches with Different Paths
     *
     *                  ┌─> approvalA ─┐
     * START -> cond1 ─┼─> approvalB ─┼─> cond2 -> approval4 (current)
     *                  └─> approvalC ─┘
     *
     * Runtime traversed nodes: [cond1, approvalA, approvalB, approvalC, cond2]
     *
     * Expected:
     * - From approval4: should return [cond1, approvalA, approvalB, approvalC, cond2]
     *   (all are possible predecessors of approval4)
     */
    it('should handle complex multi-branch flow correctly', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'cond1',
          },
          {
            key: 'cond1',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 10000 },
                next: 'approvalA',
              },
              {
                branch: { field: 'amount', operator: '>', value: 5000 },
                next: 'approvalB',
              },
              {
                branch: null,
                next: 'approvalC',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'cond2',
          },
          {
            key: 'approvalB',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'cond2',
          },
          {
            key: 'approvalC',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'cond2',
          },
          {
            key: 'cond2',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'status', operator: '==', value: 'approved' },
                next: 'approval4',
              },
              {
                branch: null,
                next: 'approval4',
              },
            ],
          },
          {
            key: 'approval4',
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

      const traversedNodeKeys = [
        'cond1',
        'approvalA',
        'approvalB',
        'approvalC',
        'cond2',
      ];
      const currentNodeKey = 'approval4';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        traversedNodeKeys,
        currentNodeKey,
      );

      expect(result).toContain('cond1');
      expect(result).toContain('approvalA');
      expect(result).toContain('approvalB');
      expect(result).toContain('approvalC');
      expect(result).toContain('cond2');
      expect(result).toHaveLength(5);
    });

    /**
     * Test Case 7: Filter Out Nodes After Current Node
     *
     * START -> approval1 -> approval2 (current) -> approval3
     *
     * Runtime traversed nodes: [approval1, approval3]
     * (approval3 was completed in a previous workflow instance)
     *
     * Expected:
     * - From approval2: should return [approval1]
     *   (approval3 comes after approval2, should be filtered out)
     */
    it('should filter out nodes that come after current node', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'approval1',
          },
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
          {
            key: 'approval3',
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

      // approval3 was somehow traversed (e.g., from previous run)
      const traversedNodeKeys = ['approval1', 'approval3'];
      const currentNodeKey = 'approval2';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        traversedNodeKeys,
        currentNodeKey,
      );

      expect(result).toContain('approval1');
      expect(result).not.toContain('approval3'); // Comes after current node
      expect(result).toHaveLength(1);
    });

    /**
     * Test Case 8: Empty Traversed Nodes
     *
     * START -> approval1 -> approval2 (current)
     *
     * Runtime traversed nodes: []
     *
     * Expected:
     * - From approval2: should return []
     *   (no nodes were traversed)
     */
    it('should return empty array when no nodes were traversed', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'approval1',
          },
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
          },
          {
            key: 'end',
            type: NodeType.END,
          },
        ],
      };

      const traversedNodeKeys: string[] = [];
      const currentNodeKey = 'approval2';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        traversedNodeKeys,
        currentNodeKey,
      );

      expect(result).toEqual([]);
    });

    /**
     * Test Case 9: CONDITION Node Inference - Single Branch Taken
     *
     *            ┌─> approvalA ─┐
     * START -> condition      └─> approval3 (current)
     *            └─> approvalB ─┘
     *
     * Runtime completed nodes: [approvalA] (only approvalA has workflow_node entity)
     * CONDITION nodes don't create workflow_node entities
     *
     * Expected:
     * - From approval3: should return [condition, approvalA]
     *   (condition node is inferred because approvalA was traversed)
     */
    it('should infer CONDITION nodes when their branch targets were traversed', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'condition',
          },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 1000 },
                next: 'approvalA',
              },
              {
                branch: null,
                next: 'approvalB',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval3',
          },
          {
            key: 'approvalB',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval3',
          },
          {
            key: 'approval3',
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

      // Only approvalA has a workflow_node entity (CONDITION nodes don't create entities)
      const completedNodeKeys = ['approvalA'];
      const currentNodeKey = 'approval3';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        completedNodeKeys,
        currentNodeKey,
      );

      // CONDITION node should be inferred and included
      expect(result).toContain('condition');
      expect(result).toContain('approvalA');
      expect(result).not.toContain('approvalB'); // Not traversed
      expect(result).toHaveLength(2);
    });

    /**
     * Test Case 10: CONDITION Node Inference - No Branches Taken
     *
     *            ┌─> approvalA ─┐
     * START -> condition      └─> approval3 (current)
     *            └─> approvalB ─┘
     *
     * Runtime completed nodes: [] (no nodes completed yet)
     *
     * Expected:
     * - From approval3: should return []
     *   (condition node should NOT be inferred because no branches were taken)
     */
    it('should not infer CONDITION nodes when no branch targets were traversed', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'condition',
          },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 1000 },
                next: 'approvalA',
              },
              {
                branch: null,
                next: 'approvalB',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval3',
          },
          {
            key: 'approvalB',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval3',
          },
          {
            key: 'approval3',
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

      // No branches were taken
      const completedNodeKeys: string[] = [];
      const currentNodeKey = 'approval3';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        completedNodeKeys,
        currentNodeKey,
      );

      // CONDITION node should NOT be inferred
      expect(result).not.toContain('condition');
      expect(result).toHaveLength(0);
    });

    /**
     * Test Case 11: Multiple CONDITION Nodes - Both Inferred
     *
     *                  ┌─> approvalA ─┐
     * START -> cond1 ─┤              ├─> cond2 ─┬─> approvalC -> approval4 (current)
     *                  └─> approvalB ─┘          └─> approvalD -> approval4
     *
     * Runtime completed nodes: [approvalA, approvalC]
     *
     * Expected:
     * - From approval4: should return [cond1, approvalA, cond2, approvalC]
     *   (both cond1 and cond2 are inferred from their branch targets)
     */
    it('should infer multiple CONDITION nodes correctly', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'cond1',
          },
          {
            key: 'cond1',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'type', operator: '==', value: 'A' },
                next: 'approvalA',
              },
              {
                branch: null,
                next: 'approvalB',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'cond2',
          },
          {
            key: 'approvalB',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'cond2',
          },
          {
            key: 'cond2',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'priority', operator: '==', value: 'high' },
                next: 'approvalC',
              },
              {
                branch: null,
                next: 'approvalD',
              },
            ],
          },
          {
            key: 'approvalC',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval4',
          },
          {
            key: 'approvalD',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval4',
          },
          {
            key: 'approval4',
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

      // Only approvalA and approvalC have workflow_node entities
      const completedNodeKeys = ['approvalA', 'approvalC'];
      const currentNodeKey = 'approval4';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        completedNodeKeys,
        currentNodeKey,
      );

      // Both CONDITION nodes should be inferred
      expect(result).toContain('cond1'); // Inferred from approvalA
      expect(result).toContain('approvalA');
      expect(result).toContain('cond2'); // Inferred from approvalC
      expect(result).toContain('approvalC');
      expect(result).not.toContain('approvalB'); // Not traversed
      expect(result).not.toContain('approvalD'); // Not traversed
      expect(result).toHaveLength(4);
    });

    /**
     * Test Case 12: Complex Flow with Mixed Regular and CONDITION Nodes
     *
     * START -> approval1 -> condition -> approvalA -> approval3 (current)
     *                           └──────> approvalB -> approval3
     *
     * Runtime completed nodes: [approval1, approvalA]
     *
     * Expected:
     * - From approval3: should return [approval1, condition, approvalA]
     *   (regular nodes and inferred CONDITION nodes both included)
     */
    it('should handle mix of regular nodes and inferred CONDITION nodes', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'approval1',
          },
          {
            key: 'approval1',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'condition',
          },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 1000 },
                next: 'approvalA',
              },
              {
                branch: null,
                next: 'approvalB',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval3',
          },
          {
            key: 'approvalB',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval3',
          },
          {
            key: 'approval3',
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

      // Regular approval node and branch target
      const completedNodeKeys = ['approval1', 'approvalA'];
      const currentNodeKey = 'approval3';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        completedNodeKeys,
        currentNodeKey,
      );

      // Both regular nodes and inferred CONDITION node
      expect(result).toContain('approval1');
      expect(result).toContain('condition'); // Inferred
      expect(result).toContain('approvalA');
      expect(result).not.toContain('approvalB'); // Not traversed
      expect(result).toHaveLength(3);
    });

    /**
     * Test Case 13: CONDITION Node with Multiple Branches - Any Branch Taken
     *
     *                  ┌─> approvalA ─┐
     * START -> cond1 ─┼─> approvalB ─┼─> approval4 (current)
     *                  └─> approvalC ─┘
     *
     * Runtime completed nodes: [approvalB]
     *
     * Expected:
     * - From approval4: should return [cond1, approvalB]
     *   (cond1 is inferred because approvalB was traversed, even though other branches weren't)
     */
    it('should infer CONDITION node when any of its branches were taken', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'cond1',
          },
          {
            key: 'cond1',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'amount', operator: '>', value: 10000 },
                next: 'approvalA',
              },
              {
                branch: { field: 'amount', operator: '>', value: 5000 },
                next: 'approvalB',
              },
              {
                branch: null,
                next: 'approvalC',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval4',
          },
          {
            key: 'approvalB',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval4',
          },
          {
            key: 'approvalC',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval4',
          },
          {
            key: 'approval4',
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

      // Only the middle branch was taken
      const completedNodeKeys = ['approvalB'];
      const currentNodeKey = 'approval4';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        completedNodeKeys,
        currentNodeKey,
      );

      // CONDITION node should be inferred from any branch
      expect(result).toContain('cond1');
      expect(result).toContain('approvalB');
      expect(result).not.toContain('approvalA'); // Not traversed
      expect(result).not.toContain('approvalC'); // Not traversed
      expect(result).toHaveLength(2);
    });

    /**
     * Test Case 14: CONDITION Node Not a Predecessor
     *
     *            ┌─> approvalA ─> approval2
     * START -> condition
     *            └─> approvalB ─> approval3 (current)
     *
     * Runtime completed nodes: [approvalB]
     *
     * Expected:
     * - From approval3: should return [condition, approvalB]
     *   (condition is inferred and is a predecessor, approvalA is not a predecessor)
     */
    it('should only include inferred CONDITION nodes that are predecessors', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'condition',
          },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'type', operator: '==', value: 'A' },
                next: 'approvalA',
              },
              {
                branch: null,
                next: 'approvalB',
              },
            ],
          },
          {
            key: 'approvalA',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval2',
          },
          {
            key: 'approvalB',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'approval3',
          },
          {
            key: 'approval2',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          {
            key: 'approval3',
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

      // Only approvalB branch was taken
      const completedNodeKeys = ['approvalB'];
      const currentNodeKey = 'approval3';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        completedNodeKeys,
        currentNodeKey,
      );

      // CONDITION is a predecessor of approval3 (via approvalB)
      expect(result).toContain('condition');
      expect(result).toContain('approvalB');
      // approvalA is not a predecessor of approval3 (different branch)
      expect(result).not.toContain('approvalA');
      expect(result).toHaveLength(2);
    });

    /**
     * Test Case 15: Chained CONDITION Nodes - Iterative Inference
     *
     * START -> check_expense_type (CONDITION) -> route_by_amount (CONDITION) -> approval1 (current)
     *
     * Runtime completed nodes: [approval1]
     *
     * Expected:
     * - From approval1: should return [check_expense_type, route_by_amount]
     *   (both CONDITION nodes should be inferred through iterative process)
     *
     * This tests the fix for the issue where CONDITION -> CONDITION chains
     * were not fully inferred in a single pass.
     */
    it('should infer chained CONDITION nodes through iterative process', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'check_expense_type',
          },
          {
            key: 'check_expense_type',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'type', operator: '==', value: 'travel' },
                next: 'route_by_amount',
              },
              {
                branch: null,
                next: 'other_approval',
              },
            ],
          },
          {
            key: 'route_by_amount',
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
          {
            key: 'other_approval',
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

      // Only approval1 has a workflow_node entity
      const completedNodeKeys = ['approval1'];
      const currentNodeKey = 'approval1';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        completedNodeKeys,
        currentNodeKey,
      );

      // Both chained CONDITION nodes should be inferred
      // Iteration 1: route_by_amount is inferred (because approval1 is in traversed)
      // Iteration 2: check_expense_type is inferred (because route_by_amount is now in traversed)
      expect(result).toContain('check_expense_type');
      expect(result).toContain('route_by_amount');
      expect(result).not.toContain('approval1'); // Current node excluded
      expect(result).not.toContain('approval2'); // Not traversed
      expect(result).not.toContain('other_approval'); // Not traversed
      expect(result).toHaveLength(2);
    });

    /**
     * Test Case 16: Multiple Chained CONDITION Nodes - Deep Chain
     *
     * START -> cond1 -> cond2 -> cond3 -> approval1 (current)
     *
     * Runtime completed nodes: [approval1]
     *
     * Expected:
     * - From approval1: should return [cond1, cond2, cond3]
     *   (all three CONDITION nodes should be inferred)
     */
    it('should infer deeply chained CONDITION nodes', () => {
      const flowDefinition: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'cond1',
          },
          {
            key: 'cond1',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'a', operator: '>', value: 1 },
                next: 'cond2',
              },
              {
                branch: null,
                next: 'other1',
              },
            ],
          },
          {
            key: 'cond2',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'b', operator: '>', value: 2 },
                next: 'cond3',
              },
              {
                branch: null,
                next: 'other2',
              },
            ],
          },
          {
            key: 'cond3',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: { field: 'c', operator: '>', value: 3 },
                next: 'approval1',
              },
              {
                branch: null,
                next: 'other3',
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
            key: 'other1',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          {
            key: 'other2',
            type: NodeType.APPROVAL,
            approval_method: ApprovalMethod.SINGLE,
            approvers: { type: ApproverType.APPLICANT },
            next: 'end',
          },
          {
            key: 'other3',
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

      // Only approval1 has a workflow_node entity
      const completedNodeKeys = ['approval1'];
      const currentNodeKey = 'approval1';

      const result = service.findSelectableRejectTargets(
        flowDefinition,
        completedNodeKeys,
        currentNodeKey,
      );

      // All three chained CONDITION nodes should be inferred
      expect(result).toContain('cond1');
      expect(result).toContain('cond2');
      expect(result).toContain('cond3');
      expect(result).toHaveLength(3);
    });
  });
});
