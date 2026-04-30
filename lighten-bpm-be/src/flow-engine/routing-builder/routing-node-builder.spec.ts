import { Test, TestingModule } from '@nestjs/testing';
import { RoutingNodeBuilder } from './routing-node-builder';
import { ApprovalNodeExecutor } from '../execution/node-executors/approval-node.executor';
import { ConditionNodeExecutor } from '../execution/node-executors/condition-node.executor';
import { UserService } from '../../user/user.service';
import {
  ApprovalLogic,
  ApprovalMethod,
  ApprovalRoutingNode,
  ApproverType,
  ComparisonOperator,
  Node,
  NodeType,
  RoutingNodeStatus,
  SourceType,
} from '../types';
import {
  ApprovalStatus,
  NodeStatus,
  InstanceStatus,
} from '../../common/types/common.types';
import { WorkflowNodeDto } from 'src/instance/dto/workflow-node.dto';
import { ApprovalTaskDto } from '../../instance/dto/approval-task.dto';

const mockApprovalNodeExecutor = {
  resolveApprovers: jest.fn(),
};

const mockConditionNodeExecutor = {
  execute: jest.fn(),
};

const mockUserService = {
  findByIds: jest.fn(),
};

describe('RoutingNodeBuilder', () => {
  let builder: RoutingNodeBuilder;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutingNodeBuilder,
        {
          provide: ConditionNodeExecutor,
          useValue: mockConditionNodeExecutor,
        },
        {
          provide: ApprovalNodeExecutor,
          useValue: mockApprovalNodeExecutor,
        },
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    builder = module.get<RoutingNodeBuilder>(RoutingNodeBuilder);
    mockApprovalNodeExecutor.resolveApprovers.mockReset();
    mockConditionNodeExecutor.execute.mockReset();
    mockUserService.findByIds.mockReset();
  });

  it('should be defined', () => {
    expect(builder).toBeDefined();
  });

  describe('Start Node', () => {
    const startNodeDef: Node = {
      key: 'start',
      type: NodeType.START,
      next: 'next_node',
    };

    it('should build a start node with INACTIVE status if no instance is provided', async () => {
      const result = await builder.build(
        InstanceStatus.DRAFT,
        [],
        1,
        {},
        startNodeDef,
        undefined,
      );

      expect(result.key).toBe('start');
      expect(result.type).toBe(NodeType.START);
      expect(result.status).toBe(RoutingNodeStatus.INACTIVE);
      expect(result.child_keys).toEqual(['next_node']);
    });

    it('should build a start node with COMPLETED status if instance is COMPLETED', async () => {
      const instance: WorkflowNodeDto = {
        node_key: 'start',
        status: NodeStatus.COMPLETED,
        approvals: [],
        id: '',
        node_type: 'START',
        createdAt: new Date(),
      };
      const result = await builder.build(
        InstanceStatus.RUNNING,
        [],
        1,
        {},
        startNodeDef,
        instance,
      );
      expect(result.status).toBe(RoutingNodeStatus.COMPLETED);
    });
  });

  describe('End Node', () => {
    const endNodeDef: Node = {
      key: 'end',
      type: NodeType.END,
    };

    it('should build an end node with no child_keys', async () => {
      const result = await builder.build(
        InstanceStatus.DRAFT,
        [],
        1,
        {},
        endNodeDef,
        undefined,
      );

      expect(result.key).toBe('end');
      expect(result.type).toBe(NodeType.END);
      expect(result.status).toBe(RoutingNodeStatus.INACTIVE);
      expect(result.child_keys).toBeUndefined();
    });
  });

  describe('Condition Node', () => {
    const conditionNodeDef: Node = {
      key: 'cond1',
      type: NodeType.CONDITION,
      conditions: [
        {
          branch: {
            field: 'getFormField("amount").value',
            operator: ComparisonOperator.GREATER_THAN,
            value: 100,
          },
          next: 'approval_node',
        },
        {
          branch: null, // Default branch
          next: 'end',
        },
      ],
    };

    it('should resolve to the first branch if condition is met', async () => {
      const formData = { amount: 200 };

      // Mock condition executor to return the first branch
      mockConditionNodeExecutor.execute.mockResolvedValue({
        nextNodeKeys: ['approval_node'],
      });

      const result = await builder.build(
        InstanceStatus.RUNNING,
        ['start'],
        1,
        formData,
        conditionNodeDef,
      );

      expect(result.key).toBe('cond1');
      expect(result.type).toBe(NodeType.CONDITION);
      expect(result.status).toBe(RoutingNodeStatus.COMPLETED);
      expect(result.child_keys).toEqual(['approval_node']);
    });

    it('should resolve to the default branch if condition is not met', async () => {
      const formData = { amount: 50 };

      // Mock condition executor to return the default branch
      mockConditionNodeExecutor.execute.mockResolvedValue({
        nextNodeKeys: ['end'],
      });

      const result = await builder.build(
        InstanceStatus.RUNNING,
        ['start'],
        1,
        formData,
        conditionNodeDef,
      );

      expect(result.child_keys).toEqual(['end']);
    });
  });

  describe('Approval Node', () => {
    const approvalNodeDef: Node = {
      key: 'approval1',
      type: NodeType.APPROVAL,
      next: 'end',
      approval_method: ApprovalMethod.SINGLE,
      approvers: { type: ApproverType.APPLICANT },
    };

    const mockApprover = {
      id: 1,
      name: 'Test User',
      email: 'test@user.com',
      default_org_id: null,
    };

    it('should build an approval node with WAITING approvals if no instance', async () => {
      mockApprovalNodeExecutor.resolveApprovers.mockResolvedValue([
        { users: [mockApprover], isSequential: false },
      ]);

      const result = await builder.build(
        InstanceStatus.DRAFT,
        ['start'],
        1,
        {},
        approvalNodeDef,
        undefined,
      );

      expect(result.key).toBe('approval1');
      expect(result.type).toBe(NodeType.APPROVAL);
      expect(result.status).toBe(RoutingNodeStatus.INACTIVE);
      expect(mockApprovalNodeExecutor.resolveApprovers).toHaveBeenCalled();

      const approvalNode = result as ApprovalRoutingNode;
      expect(approvalNode.approvalGroups).toHaveLength(1);
      expect(approvalNode.approvalGroups[0].approvals).toHaveLength(1);
      expect(approvalNode.approvalGroups[0].approvals[0].status).toBe(
        ApprovalStatus.WAITING,
      );
      expect(approvalNode.approvalGroups[0].approvals[0].assignee).toEqual(
        mockApprover,
      );
    });

    it('should map approval status from instance if provided', async () => {
      mockUserService.findByIds.mockResolvedValue([mockApprover]);

      const instance: WorkflowNodeDto = {
        node_key: 'approval1',
        status: NodeStatus.PENDING,
        approvals: [
          new ApprovalTaskDto({
            assignee_id: mockApprover.id,
            approver_group_index: 0,
            status: ApprovalStatus.APPROVED,
            id: 'task-abc',
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ],
        id: '',
        node_type: 'START',
        createdAt: new Date(),
      };

      const result = await builder.build(
        InstanceStatus.RUNNING,
        ['start'],
        1,
        {},
        approvalNodeDef,
        instance,
      );

      expect(result.status).toBe(RoutingNodeStatus.PENDING);
      const approvalNode = result as ApprovalRoutingNode;
      expect(approvalNode.approvalGroups[0].approvals[0].status).toBe(
        ApprovalStatus.APPROVED,
      );
      expect(approvalNode.approvalGroups[0].approvals[0].approvalTaskId).toBe(
        'task-abc',
      );
      expect(approvalNode.approvalGroups[0].approvals[0].assignee.id).toBe(
        mockApprover.id,
      );
      expect(mockApprovalNodeExecutor.resolveApprovers).not.toHaveBeenCalled();
    });

    it('should include description in approval groups', async () => {
      mockApprovalNodeExecutor.resolveApprovers.mockResolvedValue([
        { users: [mockApprover], isSequential: false },
      ]);
      const nodeWithDesc: Node = {
        ...approvalNodeDef,
        description: 'Test Description',
      };

      const result = await builder.build(
        InstanceStatus.DRAFT,
        ['start'],
        1,
        {},
        nodeWithDesc,
        undefined,
      );

      const approvalNode = result as ApprovalRoutingNode;
      expect(approvalNode.desc).toBe('Test Description');
    });

    it('should build a parallel approval node with multiple approval groups', async () => {
      const parallelNodeDef: Node = {
        key: 'parallel_approval',
        type: NodeType.APPROVAL,
        next: 'next_node',
        approval_method: ApprovalMethod.PARALLEL,
        approval_logic: ApprovalLogic.AND,
        approvers: [
          {
            type: ApproverType.DEPARTMENT_HEAD,
            description: 'Head',
            config: {
              source: SourceType.MANUAL,
              org_unit_id: 1,
            },
          },
          {
            type: ApproverType.ROLE,
            description: 'Role',
            config: {
              role_id: 1,
            },
          },
        ],
        description: 'Parallel Test',
      };

      const mockGroups = [
        {
          users: [{ id: 1, name: 'User 1', email: 'u1@test.com' }],
          isSequential: false,
          desc: 'Head',
        },
        {
          users: [{ id: 2, name: 'User 2', email: 'u2@test.com' }],
          isSequential: false,
          desc: 'Role',
        },
      ];

      mockApprovalNodeExecutor.resolveApprovers.mockResolvedValue(mockGroups);

      const result = await builder.build(
        InstanceStatus.RUNNING,
        ['start'],
        1,
        {},
        parallelNodeDef,
        undefined,
      );

      console.log(`NodeDef: ${JSON.stringify(parallelNodeDef, null, 2)}`);
      console.log(
        `mockApprovalNode Exec Result: ${JSON.stringify(result, null, 2)}`,
      );

      const approvalNode = result as ApprovalRoutingNode;
      expect(approvalNode.key).toBe('parallel_approval');
      expect(approvalNode.approvalMethod).toBe(ApprovalMethod.PARALLEL);
      expect(approvalNode.approvalLogic).toBe(ApprovalLogic.AND);
      expect(approvalNode.approvalGroups).toHaveLength(2);
      expect(approvalNode.desc).toBe('Parallel Test');
      expect(approvalNode.approvalGroups[0].desc).toBe('Head');
      expect(approvalNode.approvalGroups[1].desc).toBe('Role');
      expect(approvalNode.approvalGroups[0].approvals[0].assignee.id).toBe(1);
      expect(approvalNode.approvalGroups[1].approvals[0].assignee.id).toBe(2);
    });

    it('should build a parallel approval node with OR logic', async () => {
      const parallelNodeDef: Node = {
        key: 'parallel_approval_or',
        type: NodeType.APPROVAL,
        next: 'next_node',
        approval_method: ApprovalMethod.PARALLEL,
        approval_logic: ApprovalLogic.OR,
        approvers: [
          {
            type: ApproverType.DEPARTMENT_HEAD,
            description: 'Head',
            config: {
              source: SourceType.MANUAL,
              org_unit_id: 1,
            },
          },
          {
            type: ApproverType.ROLE,
            description: 'Role',
            config: {
              role_id: 1,
            },
          },
        ],
        description: 'Parallel OR Test',
      };

      const mockGroups = [
        {
          users: [{ id: 1, name: 'User 1', email: 'u1@test.com' }],
          isSequential: false,
          desc: 'Head',
        },
        {
          users: [{ id: 2, name: 'User 2', email: 'u2@test.com' }],
          isSequential: false,
          desc: 'Role',
        },
      ];

      mockApprovalNodeExecutor.resolveApprovers.mockResolvedValue(mockGroups);

      const result = await builder.build(
        InstanceStatus.RUNNING,
        ['start'],
        1,
        {},
        parallelNodeDef,
        undefined,
      );

      const approvalNode = result as ApprovalRoutingNode;
      expect(approvalNode.key).toBe('parallel_approval_or');
      expect(approvalNode.approvalMethod).toBe(ApprovalMethod.PARALLEL);
      expect(approvalNode.approvalLogic).toBe(ApprovalLogic.OR);
      expect(approvalNode.approvalGroups).toHaveLength(2);
    });

    it('should correctly map status for same user in multiple parallel groups using approver_group_index', async () => {
      const parallelNodeDef: Node = {
        key: 'parallel_approval',
        type: NodeType.APPROVAL,
        next: 'end',
        approval_method: ApprovalMethod.PARALLEL,
        approval_logic: ApprovalLogic.AND,
        approvers: [
          { type: ApproverType.ROLE, description: 'Group 0' },
          { type: ApproverType.ROLE, description: 'Group 1' },
        ],
      };

      const mockUser = { id: 1, name: 'User 1', email: 'u1@test.com' };
      mockUserService.findByIds.mockResolvedValue([mockUser]);

      const instance: WorkflowNodeDto = {
        node_key: 'parallel_approval',
        status: NodeStatus.PENDING,
        approvals: [
          new ApprovalTaskDto({
            assignee_id: mockUser.id,
            approver_group_index: 0,
            status: ApprovalStatus.PENDING,
            id: 'task-0',
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
          new ApprovalTaskDto({
            assignee_id: mockUser.id,
            approver_group_index: 1,
            status: ApprovalStatus.APPROVED, // User approved group 1
            id: 'task-1',
            createdAt: new Date(),
            updatedAt: new Date(),
          }),
        ],
        id: 'node-instance-id',
        node_type: 'APPROVAL',
        createdAt: new Date(),
      };

      const result = await builder.build(
        InstanceStatus.RUNNING,
        ['start'],
        1,
        {},
        parallelNodeDef,
        instance,
      );

      const approvalNode = result as ApprovalRoutingNode;
      expect(approvalNode.approvalGroups).toHaveLength(2);

      // Group 0 should show PENDING (from task-0)
      expect(approvalNode.approvalGroups[0].approvals[0].status).toBe(
        ApprovalStatus.PENDING,
      );
      expect(approvalNode.approvalGroups[0].approvals[0].approvalTaskId).toBe(
        'task-0',
      );

      // Group 1 should show APPROVED (from task-1)
      expect(approvalNode.approvalGroups[1].approvals[0].status).toBe(
        ApprovalStatus.APPROVED,
      );
      expect(approvalNode.approvalGroups[1].approvals[0].approvalTaskId).toBe(
        'task-1',
      );
    });
  });
});
