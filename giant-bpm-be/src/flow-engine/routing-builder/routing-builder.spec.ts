import { Test, TestingModule } from '@nestjs/testing';
import { RoutingBuilder, FlowInstance } from './routing-builder';
import { RoutingNodeBuilder } from './routing-node-builder';
import {
  FlowDefinition,
  Node,
  NodeType,
  RoutingNode,
  RoutingNodeStatus,
  ApprovalMethod,
  BasicNode,
  ApprovalLogic,
  ApproverType,
  ReportingLineMethod,
  SourceType,
} from '../types';
import {
  InstanceStatus,
  PriorityLevel,
  RevisionState,
} from '../../common/types/common.types';

// Mock RoutingNodeBuilder
const mockRoutingNodeBuilder = {
  build: jest.fn(),
};

const sampleFlowDefinition: FlowDefinition = {
  version: 1,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  nodes: [
    {
      key: 'form-node',
      type: NodeType.START,
      next: 'ParallelApproval-1765791746041',
    },
    {
      key: 'end-node',
      type: NodeType.END,
    },
    {
      key: 'ParallelApproval-1765791746041',
      next: 'ParallelApproval-1765792003855',
      type: NodeType.APPROVAL,
      approvers: [
        {
          type: ApproverType.DEPARTMENT_HEAD,
          config: {
            source: SourceType.MANUAL,
            org_unit_id: 7,
          },
          description: 'Specific department head',
        },
        {
          type: ApproverType.APPLICANT_REPORTING_LINE,
          config: {
            method: ReportingLineMethod.TO_JOB_GRADE,
            job_grade: 50,
          },
          description: "applicant's reporting line to gb 50",
        },
        {
          type: ApproverType.ROLE,
          config: {
            role_id: 10,
          },
          description: 'specific role-customer',
        },
      ],
      description: 'Parallel AND',
      approval_logic: ApprovalLogic.AND,
      approval_method: ApprovalMethod.PARALLEL,
    },
    {
      key: 'ParallelApproval-1765792003855',
      next: 'Approval-1765792151754',
      type: NodeType.APPROVAL,
      approvers: [
        {
          type: ApproverType.SPECIFIC_USER_REPORTING_LINE,
          config: {
            level: 2,
            method: ReportingLineMethod.TO_LEVEL,
            source: SourceType.MANUAL,
            user_id: 8,
          },
          description: "specific user's reporting line-2L",
        },
        {
          type: ApproverType.ROLE,
          config: {
            role_id: 9,
          },
          description: 'specific role-virtual',
        },
        {
          type: ApproverType.SPECIFIC_USERS,
          config: {
            user_ids: [1],
          },
          description: 'specific user',
        },
      ],
      description: 'Parallel OR',
      approval_logic: ApprovalLogic.OR,
      approval_method: ApprovalMethod.PARALLEL,
    },
    {
      key: 'Approval-1765792151754',
      next: 'end-node',
      type: NodeType.APPROVAL,
      approvers: {
        type: ApproverType.ROLE,
        config: {
          role_id: 10,
        },
      },
      description: 'Specific role 2-customer',
      approval_method: ApprovalMethod.SINGLE,
      reuse_prior_approvals: false,
    } as any,
  ],
};

describe('RoutingBuilder', () => {
  let builder: RoutingBuilder;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutingBuilder,
        {
          provide: RoutingNodeBuilder,
          useValue: mockRoutingNodeBuilder,
        },
      ],
    }).compile();

    builder = module.get<RoutingBuilder>(RoutingBuilder);
    mockRoutingNodeBuilder.build.mockReset();
  });

  it('should be defined', () => {
    expect(builder).toBeDefined();
  });

  describe('build', () => {
    it('should correctly build a flow routing from a complex flow definition', async () => {
      // Arrange
      const mockInstance: FlowInstance = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        applicant: {
          id: 1,
          name: 'test user',
          email: 'test@test.com',
          sub: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          code: 'test-user-code',
          jobGrade: 0,
          defaultOrgCode: 'UNASSIGNED',
          createdAt: new Date(),
          updatedAt: null,
          isAdmin: false,
        },
        revision: {
          revision_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
          flow_definition: sampleFlowDefinition,
          workflow_id: 'some-workflow-uuid-1',
          name: 'Test Workflow Revision',
          description: null,
          version: 1,
          status: RevisionState.DRAFT,
          created_by: 1,
          created_at: new Date(),
        },
        status: InstanceStatus.RUNNING,
        priority: PriorityLevel.NORMAL,
        createdAt: new Date(),
        updatedAt: new Date(),
        nodes: [],
      };

      mockRoutingNodeBuilder.build.mockImplementation(
        (
          flowStatus: InstanceStatus,
          parent_keys: string[],
          applicantId: number,
          formData: any,
          nodeDefinition: Node,
        ) => {
          let child_keys: string[] = [];
          if (nodeDefinition.type === NodeType.CONDITION) {
            child_keys = nodeDefinition.conditions.map((c) => c.next);
          } else if (nodeDefinition.next) {
            child_keys = [nodeDefinition.next];
          }

          const baseNode: Partial<RoutingNode> = {
            key: nodeDefinition.key,
            type: nodeDefinition.type,
            status: RoutingNodeStatus.INACTIVE,
            parent_keys: [], // This will be set by RoutingBuilder
            child_keys: child_keys,
            desc: nodeDefinition.description,
          };

          if (nodeDefinition.type === NodeType.APPROVAL) {
            const approvalNode = {
              ...(baseNode as BasicNode),
              approvalMethod: nodeDefinition.approval_method,
              approvalLogic:
                nodeDefinition.approval_method === ApprovalMethod.PARALLEL
                  ? nodeDefinition.approval_logic
                  : undefined,
              approvalGroups: [], // Mock empty groups
            };
            return approvalNode;
          }

          return baseNode as RoutingNode;
        },
      );

      // Act
      const flowRouting = await builder.build('wf-001', mockInstance, {});

      // Assert
      expect(flowRouting.nodes.length).toBe(5);
      expect(flowRouting.workflowInstanceId).toBe(mockInstance.id);

      const startNode = flowRouting.nodes.find((n) => n.key === 'form-node');
      const approval1 = flowRouting.nodes.find(
        (n) => n.key === 'ParallelApproval-1765791746041',
      );
      const approval2 = flowRouting.nodes.find(
        (n) => n.key === 'ParallelApproval-1765792003855',
      );
      const approval3 = flowRouting.nodes.find(
        (n) => n.key === 'Approval-1765792151754',
      );
      const endNode = flowRouting.nodes.find((n) => n.key === 'end-node');

      expect(startNode).toBeDefined();
      expect(approval1).toBeDefined();
      expect(approval2).toBeDefined();
      expect(approval3).toBeDefined();
      expect(endNode).toBeDefined();

      // Check parent/child relationships
      expect(startNode?.child_keys).toEqual(['ParallelApproval-1765791746041']);

      expect(approval1?.parent_keys).toEqual(['form-node']);
      expect(approval1?.child_keys).toEqual(['ParallelApproval-1765792003855']);
      expect(approval1?.desc).toBe('Parallel AND');

      expect(approval2?.parent_keys).toEqual([
        'ParallelApproval-1765791746041',
      ]);
      expect(approval2?.child_keys).toEqual(['Approval-1765792151754']);
      expect(approval2?.desc).toBe('Parallel OR');

      expect(approval3?.parent_keys).toEqual([
        'ParallelApproval-1765792003855',
      ]);
      expect(approval3?.child_keys).toEqual(['end-node']);
      expect(approval3?.desc).toBe('Specific role 2-customer');

      expect(endNode?.parent_keys).toEqual(['Approval-1765792151754']);
      expect(endNode?.child_keys).toEqual([]);

      console.log('Flow Routing Output:', JSON.stringify(flowRouting, null, 2));
    });

    it('should throw an error if flow definition is missing', async () => {
      const mockInstance = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        applicant: {
          id: 1,
          name: 'test user',
          email: 'test@test.com',
          sub: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          jobGrade: 0,
          defaultOrgId: 0,
          createdAt: new Date(),
          updatedAt: null,
        },
        revision: null, // No revision
        status: InstanceStatus.RUNNING,
        priority: PriorityLevel.NORMAL,
        createdAt: new Date(),
        updatedAt: new Date(),
        nodes: [],
      };

      await expect(
        builder.build('wf-001', mockInstance as unknown as FlowInstance, {}),
      ).rejects.toThrow(
        'Invalid workflow instance: missing revision or flow definition',
      );
    });

    it('should throw an error if start node is not found', async () => {
      const noStartFlow: FlowDefinition = {
        version: 1,
        nodes: [
          {
            key: 'end',
            type: NodeType.END,
          },
        ],
      };
      const mockInstance: FlowInstance = {
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        applicant: {
          id: 1,
          name: 'test user',
          email: 'test@test.com',
          sub: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
          code: 'test-user-code',
          jobGrade: 0,
          defaultOrgCode: 'UNASSIGNED',
          createdAt: new Date(),
          updatedAt: null,
          isAdmin: false,
        },
        revision: {
          revision_id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
          flow_definition: noStartFlow,
          workflow_id: 'some-workflow-uuid-1',
          name: 'Test Workflow Revision',
          description: null,
          version: 1,
          status: RevisionState.DRAFT,
          created_by: 1,
          created_at: new Date(),
        },
        status: InstanceStatus.RUNNING,
        priority: PriorityLevel.NORMAL,
        createdAt: new Date(),
        updatedAt: new Date(),
        nodes: [],
      };

      await expect(builder.build('wf-001', mockInstance, {})).rejects.toThrow(
        'Start node not found in flow definition',
      );
    });
  });
});
