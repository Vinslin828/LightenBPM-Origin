/**
 * Unit Tests - Approval Node Executor
 */

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { ApprovalNodeExecutor } from './approval-node.executor';
import {
  NodeType,
  ApprovalMethod,
  ApproverType,
  ApproverConfig,
  ReportingLineMethod,
  SourceType,
  ApprovalLogic,
  SingleApprovalNode,
  ParallelApprovalNode,
  FlowExecutionError,
  ErrorCode,
} from '../../types';
import { InstanceDataService } from '../../../instance/instance-data.service';
import { OrgUnitService } from '../../../org-unit/org-unit.service';
import { UserService } from '../../../user/user.service';
import { NotificationService } from '../../../notification/notification.service';
import {
  ApprovalStatus,
  NodeStatus,
  OrgUnit,
} from '../../../common/types/common.types';
import { UserWithOrg } from '../../../user/repository/user.repository';
import { ExpressionEvaluatorService } from '../../expression-engine';

describe('ApprovalNodeExecutor', () => {
  let executor: ApprovalNodeExecutor;
  let mockInstanceDataService: jest.Mocked<InstanceDataService>;
  let mockOrgUnitService: jest.Mocked<OrgUnitService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockExpressionEvaluator: jest.Mocked<ExpressionEvaluatorService>;
  let mockAutoApproveService: {
    shouldAutoApprove: jest.Mock;
    resolveReusePriorApprovals: jest.Mock;
    autoApproveTask: jest.Mock;
  };

  // ===========================================================================
  // Fixtures
  // ===========================================================================

  const mockWorkflowNode = {
    id: 1,
    public_id: 'node-uuid',
    instance_id: 100,
    node_key: 'approval1',
    subflow_instance_id: null,
    node_type: NodeType.APPROVAL,
    status: NodeStatus.PENDING,
    result: null,
    started_at: new Date(),
    completed_at: null,
    due_date: null,
    created_at: new Date(),
    updated_at: null,
    iteration: 1,
  };

  const mockOrg = {
    id: 1,
    code: 'd001',
    name: 'Org One',
    type: 'DEPARTMENT',
    parent_id: null,
    created_by: 1,
    updated_by: 1,
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
  } as unknown as OrgUnit;

  const mockUser1: UserWithOrg = {
    id: 1,
    name: 'User One',
    job_grade: 40,
    resolved_default_org: mockOrg,
    created_at: new Date(),
    updated_at: new Date(),
    sub: 'sub-user-one',
    email: 'user-one@example.com',
    code: 'user1',
    deleted_at: null,
  };

  const mockUser2: UserWithOrg = {
    id: 2,
    name: 'User Two',
    job_grade: 50,
    resolved_default_org: mockOrg,
    created_at: new Date(),
    updated_at: new Date(),
    sub: 'sub-user-two',
    email: 'user-two@example.com',
    code: 'user2',
    deleted_at: null,
  };

  const mockUser3: UserWithOrg = {
    id: 3,
    name: 'User Three',
    job_grade: 60,
    resolved_default_org: mockOrg,
    created_at: new Date(),
    updated_at: new Date(),
    sub: 'sub-user-three',
    email: 'user-three@example.com',
    code: 'user3',
    deleted_at: null,
  };

  const mockSystemUser: UserWithOrg = {
    id: 99,
    name: 'System',
    job_grade: 0,
    resolved_default_org: mockOrg,
    created_at: new Date(),
    updated_at: new Date(),
    sub: 'system',
    email: 'no-reply@system',
    code: 'SYSTEM',
    deleted_at: null,
  };

  const mockWorkflowInstance = {
    id: 100,
    public_id: 'instance-uuid',
    serial_number: 'WF-2024-001',
    revision_id: 1,
    applicant_id: 1,
    status: 'PENDING',
    created_at: new Date(),
    updated_at: null,
    current_iteration: 1,
  };

  // ===========================================================================
  // Helpers
  // ===========================================================================

  function buildSingleApprovalNode(
    approvers: ApproverConfig,
  ): SingleApprovalNode {
    return {
      key: 'approval1',
      type: NodeType.APPROVAL,
      next: 'end',
      approval_method: ApprovalMethod.SINGLE,
      approvers,
    };
  }

  function buildParallelApprovalNode(
    approvers: ApproverConfig[],
    logic: ApprovalLogic = ApprovalLogic.AND,
  ): ParallelApprovalNode {
    return {
      key: 'approval1',
      type: NodeType.APPROVAL,
      next: 'end',
      approval_method: ApprovalMethod.PARALLEL,
      approval_logic: logic,
      approvers,
    };
  }

  function getCreatedTasks(): Array<{
    assignee_id: number;
    approver_group_index: number;
    status: string;
    iteration: number;
  }> {
    return mockInstanceDataService.createApprovalTaskWithOptionalComment.mock.calls.map(
      (call) => call[0],
    );
  }

  // ===========================================================================
  // Setup
  // ===========================================================================

  beforeEach(() => {
    mockInstanceDataService = {
      findWorkflowInstanceById: jest
        .fn()
        .mockResolvedValue(mockWorkflowInstance),
      createWorkflowNode: jest.fn().mockResolvedValue(mockWorkflowNode),
      getPriorApprovedUsers: jest.fn().mockResolvedValue(new Set()),
      createApprovalTaskWithOptionalComment: jest
        .fn()
        .mockImplementation(
          (taskData: {
            assignee_id: number;
            approver_group_index: number;
            status: string;
            iteration: number;
          }) =>
            Promise.resolve({
              id: taskData.assignee_id * 10,
              public_id: `task-uuid-${taskData.assignee_id}`,
              workflow_node_id: 1,
              ...taskData,
              created_at: new Date(),
              updated_at: new Date(),
            }),
        ),
      findWorkflowInstanceWithDetails: jest.fn().mockResolvedValue({
        ...mockWorkflowInstance,
        revision: { name: 'Test Workflow' },
        applicant: mockUser1,
      }),
      findApprovalTasksByNodeIdAndStatus: jest.fn().mockResolvedValue([]),
      updateApprovalTask: jest.fn().mockResolvedValue({}),
      createWorkflowComment: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<InstanceDataService>;

    mockOrgUnitService = {
      getReportingLine: jest.fn(),
      getOrgUnitHeadUsers: jest.fn(),
      getOrgUnitMemberUsers: jest.fn(),
      findByCode: jest.fn(),
    } as unknown as jest.Mocked<OrgUnitService>;

    mockUserService = {
      findOne: jest.fn(),
      findByIds: jest.fn().mockResolvedValue([]),
      getSystemUser: jest.fn().mockResolvedValue(mockSystemUser),
    } as unknown as jest.Mocked<UserService>;

    mockNotificationService = {
      notifyApprovalTaskPending: jest.fn().mockResolvedValue(undefined),
      notifyApprovalDecision: jest.fn().mockResolvedValue(undefined),
      notifyWorkflowCompleted: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationService>;

    mockExpressionEvaluator = {
      evaluate: jest.fn(),
      isSimpleExpression: jest.fn(),
    } as unknown as jest.Mocked<ExpressionEvaluatorService>;

    mockAutoApproveService = {
      shouldAutoApprove: jest.fn().mockReturnValue(false),
      resolveReusePriorApprovals: jest.fn().mockReturnValue(true),
      autoApproveTask: jest.fn().mockResolvedValue(undefined),
    };

    executor = new ApprovalNodeExecutor(
      mockInstanceDataService,
      mockOrgUnitService,
      mockUserService,
      mockNotificationService,
      mockExpressionEvaluator,
      mockAutoApproveService as any,
    );
  });

  // ===========================================================================
  // APPLICANT approver
  // ===========================================================================

  describe('APPLICANT approver', () => {
    it('should create one pending task for the applicant when approver type is APPLICANT', async () => {
      // Arrange
      mockUserService.findByIds.mockResolvedValueOnce([mockUser1]);
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.APPLICANT,
      });

      // Act
      const result = await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      expect(result).toEqual({
        requiresApproval: true,
        nextNodeKey: 'end',
        approvalMethod: ApprovalMethod.SINGLE,
      });
      const tasks = getCreatedTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].assignee_id).toBe(1);
      expect(tasks[0].status).toBe(ApprovalStatus.PENDING);
    });
  });

  // ===========================================================================
  // ROLE approver
  // ===========================================================================

  describe('ROLE approver', () => {
    it('should create pending tasks for each role member when approver type is ROLE', async () => {
      // Arrange
      mockOrgUnitService.getOrgUnitMemberUsers.mockResolvedValueOnce([
        mockUser1,
        mockUser2,
      ]);
      mockUserService.findByIds.mockResolvedValueOnce([mockUser1, mockUser2]);
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.ROLE,
        config: { role_id: 5 },
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      const tasks = getCreatedTasks();
      expect(tasks.map((t) => t.assignee_id)).toEqual([1, 2]);
      expect(tasks.every((t) => t.status === ApprovalStatus.PENDING)).toBe(
        true,
      );
    });
  });

  // ===========================================================================
  // SPECIFIC_USERS approver
  // ===========================================================================

  describe('SPECIFIC_USERS approver', () => {
    describe('legacy config (no source)', () => {
      it('should create pending tasks for each listed user when config has only user_ids', async () => {
        // Arrange
        mockUserService.findByIds.mockResolvedValueOnce([mockUser1, mockUser2]);
        const nodeConfig = buildSingleApprovalNode({
          type: ApproverType.SPECIFIC_USERS,
          config: { user_ids: [1, 2] },
        });

        // Act
        await executor.execute(nodeConfig, 100, 1, {});

        // Assert
        const tasks = getCreatedTasks();
        expect(tasks.map((t) => t.assignee_id)).toEqual([1, 2]);
      });
    });

    describe('source=MANUAL', () => {
      it('should create pending tasks for each listed user when source is MANUAL', async () => {
        // Arrange
        mockUserService.findByIds.mockResolvedValueOnce([mockUser1, mockUser2]);
        const nodeConfig = buildSingleApprovalNode({
          type: ApproverType.SPECIFIC_USERS,
          config: { source: SourceType.MANUAL, user_ids: [1, 2] },
        });

        // Act
        await executor.execute(nodeConfig, 100, 1, {});

        // Assert
        const tasks = getCreatedTasks();
        expect(tasks.map((t) => t.assignee_id)).toEqual([1, 2]);
      });
    });

    describe('source=EXPRESSION', () => {
      it('should create tasks from expression-returned user ids when expression returns number array', async () => {
        // Arrange
        mockExpressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: [1, 2],
        });
        mockUserService.findByIds.mockResolvedValueOnce([mockUser1, mockUser2]);
        const nodeConfig = buildSingleApprovalNode({
          type: ApproverType.SPECIFIC_USERS,
          config: {
            source: SourceType.EXPRESSION,
            expression: 'getCurrentNode().approverId.prev',
          },
        });

        // Act
        await executor.execute(nodeConfig, 100, 1, {});

        // Assert
        const tasks = getCreatedTasks();
        expect(tasks.map((t) => t.assignee_id)).toEqual([1, 2]);
      });

      it('should deduplicate user ids when expression returns duplicates', async () => {
        // Arrange
        mockExpressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: [1, 2, 1, 2, 2],
        });
        mockUserService.findByIds.mockResolvedValueOnce([mockUser1, mockUser2]);
        const nodeConfig = buildSingleApprovalNode({
          type: ApproverType.SPECIFIC_USERS,
          config: {
            source: SourceType.EXPRESSION,
            expression: 'someExpression',
          },
        });

        // Act
        await executor.execute(nodeConfig, 100, 1, {});

        // Assert
        const tasks = getCreatedTasks();
        expect(tasks.map((t) => t.assignee_id)).toEqual([1, 2]);
      });

      it('should throw INVALID_APPROVER_CONFIG when expression evaluation fails', async () => {
        // Arrange
        mockExpressionEvaluator.evaluate.mockResolvedValueOnce({
          success: false,
          error: 'SyntaxError',
        });
        const nodeConfig = buildSingleApprovalNode({
          type: ApproverType.SPECIFIC_USERS,
          config: {
            source: SourceType.EXPRESSION,
            expression: 'bad code',
          },
        });

        // Act & Assert
        await expect(executor.execute(nodeConfig, 100, 1, {})).rejects.toThrow(
          FlowExecutionError,
        );
      });

      it('should throw INVALID_APPROVER_CONFIG when expression returns a non-array', async () => {
        // Arrange
        mockExpressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: 123,
        });
        const nodeConfig = buildSingleApprovalNode({
          type: ApproverType.SPECIFIC_USERS,
          config: {
            source: SourceType.EXPRESSION,
            expression: 'someExpression',
          },
        });

        // Act & Assert
        await expect(executor.execute(nodeConfig, 100, 1, {})).rejects.toThrow(
          FlowExecutionError,
        );
      });

      it('should throw INVALID_APPROVER_CONFIG when expression returns an empty array', async () => {
        // Arrange
        mockExpressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: [],
        });
        const nodeConfig = buildSingleApprovalNode({
          type: ApproverType.SPECIFIC_USERS,
          config: {
            source: SourceType.EXPRESSION,
            expression: 'someExpression',
          },
        });

        // Act & Assert
        await expect(executor.execute(nodeConfig, 100, 1, {})).rejects.toThrow(
          FlowExecutionError,
        );
      });

      it('should throw INVALID_APPROVER_CONFIG when expression returns an array with non-integer elements', async () => {
        // Arrange
        mockExpressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: [1, 'two', 3],
        });
        const nodeConfig = buildSingleApprovalNode({
          type: ApproverType.SPECIFIC_USERS,
          config: {
            source: SourceType.EXPRESSION,
            expression: 'someExpression',
          },
        });

        // Act & Assert
        await expect(executor.execute(nodeConfig, 100, 1, {})).rejects.toThrow(
          FlowExecutionError,
        );
      });

      it('should throw INVALID_APPROVER_CONFIG when expression returns an array with a non-positive integer', async () => {
        // Arrange
        mockExpressionEvaluator.evaluate.mockResolvedValueOnce({
          success: true,
          value: [1, 0, 3],
        });
        const nodeConfig = buildSingleApprovalNode({
          type: ApproverType.SPECIFIC_USERS,
          config: {
            source: SourceType.EXPRESSION,
            expression: 'someExpression',
          },
        });

        // Act & Assert
        await expect(executor.execute(nodeConfig, 100, 1, {})).rejects.toThrow(
          FlowExecutionError,
        );
      });
    });
  });

  // ===========================================================================
  // DEPARTMENT_HEAD approver
  // ===========================================================================

  describe('DEPARTMENT_HEAD approver', () => {
    it('should create a task for the department head when source is MANUAL', async () => {
      // Arrange
      mockOrgUnitService.getOrgUnitHeadUsers.mockResolvedValueOnce([mockUser2]);
      mockUserService.findByIds.mockResolvedValueOnce([mockUser2]);
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.DEPARTMENT_HEAD,
        config: { source: SourceType.MANUAL, org_unit_id: 10 },
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      expect(mockOrgUnitService.getOrgUnitHeadUsers).toHaveBeenCalledWith(10);
      const tasks = getCreatedTasks();
      expect(tasks.map((t) => t.assignee_id)).toEqual([2]);
    });

    it('should resolve org unit from form field when source is FORM_FIELD', async () => {
      // Arrange
      mockExpressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: 15,
      });
      mockOrgUnitService.getOrgUnitHeadUsers.mockResolvedValueOnce([mockUser2]);
      mockUserService.findByIds.mockResolvedValueOnce([mockUser2]);
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.DEPARTMENT_HEAD,
        config: {
          source: SourceType.FORM_FIELD,
          form_field: 'getFormField("department").value',
        },
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      expect(mockOrgUnitService.getOrgUnitHeadUsers).toHaveBeenCalledWith(15);
    });

    it('should resolve org unit by code when form field returns a string', async () => {
      // Arrange
      mockExpressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: 'd001',
      });
      mockOrgUnitService.findByCode.mockResolvedValueOnce({
        id: 1,
        code: 'd001',
      } as any);
      mockOrgUnitService.getOrgUnitHeadUsers.mockResolvedValueOnce([mockUser2]);
      mockUserService.findByIds.mockResolvedValueOnce([mockUser2]);
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.DEPARTMENT_HEAD,
        config: {
          source: SourceType.FORM_FIELD,
          form_field: 'getFormField("department_code").value',
        },
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      expect(mockOrgUnitService.findByCode).toHaveBeenCalledWith('d001');
      expect(mockOrgUnitService.getOrgUnitHeadUsers).toHaveBeenCalledWith(1);
    });
  });

  // ===========================================================================
  // APPLICANT_REPORTING_LINE approver
  // ===========================================================================

  describe('APPLICANT_REPORTING_LINE approver', () => {
    it('should create sequential tasks up to job grade when method is TO_JOB_GRADE', async () => {
      // Arrange
      mockUserService.findOne.mockResolvedValueOnce(mockUser1);
      mockOrgUnitService.getReportingLine.mockResolvedValueOnce([
        mockUser2,
        mockUser3,
      ]);
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.APPLICANT_REPORTING_LINE,
        config: {
          method: ReportingLineMethod.TO_JOB_GRADE,
          job_grade: 60,
        },
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      const tasks = getCreatedTasks();
      expect(tasks.map((t) => t.assignee_id)).toEqual([2, 3]);
      expect(tasks.map((t) => t.status)).toEqual([
        ApprovalStatus.PENDING,
        ApprovalStatus.WAITING,
      ]);
    });

    it('should create sequential tasks up to level when method is TO_LEVEL', async () => {
      // Arrange
      mockUserService.findOne.mockResolvedValueOnce(mockUser1);
      mockOrgUnitService.getReportingLine.mockResolvedValueOnce([
        mockUser2,
        mockUser3,
      ]);
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.APPLICANT_REPORTING_LINE,
        config: {
          method: ReportingLineMethod.TO_LEVEL,
          level: 2,
        },
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      expect(mockOrgUnitService.getReportingLine).toHaveBeenCalledWith(
        1,
        1,
        undefined,
        2,
      );
    });

    it('should resolve reporting line from org reference field when org_reference_field is provided', async () => {
      // Arrange
      mockUserService.findOne.mockResolvedValueOnce(mockUser1);
      mockExpressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: 5,
      });
      mockOrgUnitService.getReportingLine.mockResolvedValueOnce([mockUser2]);
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.APPLICANT_REPORTING_LINE,
        config: {
          org_reference_field: 'getFormField("org_unit").value',
          method: ReportingLineMethod.TO_JOB_GRADE,
          job_grade: 60,
        },
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      expect(mockOrgUnitService.getReportingLine).toHaveBeenCalledWith(
        1,
        5,
        60,
        undefined,
      );
    });
  });

  // ===========================================================================
  // SPECIFIC_USER_REPORTING_LINE approver
  // ===========================================================================

  describe('SPECIFIC_USER_REPORTING_LINE approver', () => {
    it('should create tasks from specified user reporting line when source is MANUAL', async () => {
      // Arrange
      mockUserService.findOne.mockResolvedValueOnce(mockUser2);
      mockOrgUnitService.getReportingLine.mockResolvedValueOnce([mockUser3]);
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.SPECIFIC_USER_REPORTING_LINE,
        config: {
          source: SourceType.MANUAL,
          user_id: 2,
          method: ReportingLineMethod.TO_LEVEL,
          level: 1,
        },
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      expect(mockOrgUnitService.getReportingLine).toHaveBeenCalledWith(
        2,
        1,
        undefined,
        1,
      );
      const tasks = getCreatedTasks();
      expect(tasks.map((t) => t.assignee_id)).toEqual([3]);
    });

    it('should resolve user from form field when source is FORM_FIELD', async () => {
      // Arrange
      mockExpressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: 2,
      });
      mockUserService.findOne.mockResolvedValueOnce(mockUser2);
      mockOrgUnitService.getReportingLine.mockResolvedValueOnce([mockUser3]);
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.SPECIFIC_USER_REPORTING_LINE,
        config: {
          source: SourceType.FORM_FIELD,
          form_field: 'getFormField("co_applicant").value',
          method: ReportingLineMethod.TO_LEVEL,
          level: 1,
        },
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      expect(mockOrgUnitService.getReportingLine).toHaveBeenCalledWith(
        2,
        1,
        undefined,
        1,
      );
    });

    it('should use org unit from reference field when org_reference_field is provided', async () => {
      // Arrange
      mockUserService.findOne.mockResolvedValueOnce(mockUser2);
      mockExpressionEvaluator.evaluate.mockResolvedValueOnce({
        success: true,
        value: 7,
      });
      mockOrgUnitService.getReportingLine.mockResolvedValueOnce([mockUser3]);
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.SPECIFIC_USER_REPORTING_LINE,
        config: {
          source: SourceType.MANUAL,
          user_id: 2,
          org_reference_field: 'getFormField("org_unit").value',
          method: ReportingLineMethod.TO_LEVEL,
          level: 1,
        },
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      expect(mockOrgUnitService.getReportingLine).toHaveBeenCalledWith(
        2,
        7,
        undefined,
        1,
      );
    });
  });

  // ===========================================================================
  // Parallel approval
  // ===========================================================================

  describe('parallel approval', () => {
    it('should create pending tasks for all groups when approval_method is PARALLEL with AND logic', async () => {
      // Arrange
      mockOrgUnitService.getOrgUnitMemberUsers.mockResolvedValueOnce([
        mockUser1,
      ]);
      mockUserService.findByIds
        .mockResolvedValueOnce([mockUser1])
        .mockResolvedValueOnce([mockUser3]);
      const nodeConfig = buildParallelApprovalNode(
        [
          { type: ApproverType.ROLE, config: { role_id: 5 } },
          {
            type: ApproverType.SPECIFIC_USERS,
            config: { user_ids: [3] },
          },
        ],
        ApprovalLogic.AND,
      );

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      const tasks = getCreatedTasks();
      expect(tasks.map((t) => t.assignee_id)).toEqual([1, 3]);
      expect(tasks.map((t) => t.approver_group_index)).toEqual([0, 1]);
      expect(tasks.every((t) => t.status === ApprovalStatus.PENDING)).toBe(
        true,
      );
    });

    it('should create separate tasks for duplicate approvers when same user appears in multiple groups', async () => {
      // Arrange
      mockUserService.findByIds
        .mockResolvedValueOnce([mockUser1, mockUser2])
        .mockResolvedValueOnce([mockUser1]);
      mockOrgUnitService.getOrgUnitMemberUsers.mockResolvedValueOnce([
        mockUser1,
      ]);
      const nodeConfig = buildParallelApprovalNode(
        [
          {
            type: ApproverType.SPECIFIC_USERS,
            config: { user_ids: [1, 2] },
          },
          { type: ApproverType.ROLE, config: { role_id: 5 } },
        ],
        ApprovalLogic.OR,
      );

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      const tasks = getCreatedTasks();
      expect(tasks).toHaveLength(3);
      expect(tasks.map((t) => [t.assignee_id, t.approver_group_index])).toEqual(
        [
          [1, 0],
          [2, 0],
          [1, 1],
        ],
      );
    });
  });

  // ===========================================================================
  // Auto-approval
  // ===========================================================================

  describe('auto-approval', () => {
    it('should auto-approve a task when assignee is in prior approved users', async () => {
      // Arrange
      mockInstanceDataService.getPriorApprovedUsers.mockResolvedValueOnce(
        new Set([1]),
      );
      mockUserService.findByIds.mockResolvedValueOnce([mockUser1, mockUser2]);
      mockAutoApproveService.shouldAutoApprove.mockImplementation(
        (_reuse: boolean, assigneeId: number) => assigneeId === 1,
      );
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.SPECIFIC_USERS,
        config: { user_ids: [1, 2] },
        reuse_prior_approvals: true,
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      expect(mockAutoApproveService.autoApproveTask).toHaveBeenCalledWith(
        10,
        'WF-2024-001',
        1,
        mockSystemUser.id,
        undefined,
      );
    });

    it('should cancel remaining tasks when one task is auto-approved in a ROLE group (OR consensus)', async () => {
      // Arrange
      mockInstanceDataService.getPriorApprovedUsers.mockResolvedValueOnce(
        new Set([1]),
      );
      mockOrgUnitService.getOrgUnitMemberUsers.mockResolvedValueOnce([
        mockUser1,
        mockUser2,
      ]);
      mockUserService.findByIds.mockResolvedValueOnce([mockUser1, mockUser2]);
      mockAutoApproveService.shouldAutoApprove.mockImplementation(
        (_reuse: boolean, assigneeId: number) => assigneeId === 1,
      );
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.ROLE,
        config: { role_id: 5 },
        reuse_prior_approvals: true,
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert — ROLE retains OR consensus, so user 2 is cancelled
      expect(mockInstanceDataService.updateApprovalTask).toHaveBeenCalledWith(
        20,
        expect.objectContaining({ status: ApprovalStatus.CANCELLED }),
        undefined,
      );
    });

    it('should leave remaining SPECIFIC_USERS tasks PENDING when one task is auto-approved (AND consensus)', async () => {
      // Arrange
      mockInstanceDataService.getPriorApprovedUsers.mockResolvedValueOnce(
        new Set([1]),
      );
      mockUserService.findByIds.mockResolvedValueOnce([mockUser1, mockUser2]);
      mockAutoApproveService.shouldAutoApprove.mockImplementation(
        (_reuse: boolean, assigneeId: number) => assigneeId === 1,
      );
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.SPECIFIC_USERS,
        config: { user_ids: [1, 2] },
        reuse_prior_approvals: true,
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert — user 2's task is NOT cancelled; only user 1 is auto-approved.
      const cancelCalls =
        mockInstanceDataService.updateApprovalTask.mock.calls.filter(
          (call) =>
            (call[1] as { status?: string }).status ===
            ApprovalStatus.CANCELLED,
        );
      expect(cancelCalls).toHaveLength(0);
      expect(mockAutoApproveService.autoApproveTask).toHaveBeenCalledWith(
        10,
        'WF-2024-001',
        1,
        mockSystemUser.id,
        undefined,
      );
    });

    it('should promote the next waiting task to pending when a sequential task is auto-approved', async () => {
      // Arrange
      mockInstanceDataService.getPriorApprovedUsers.mockResolvedValueOnce(
        new Set([2]),
      );
      mockUserService.findOne.mockResolvedValueOnce(mockUser1);
      mockOrgUnitService.getReportingLine.mockResolvedValueOnce([
        mockUser2,
        mockUser3,
      ]);
      mockAutoApproveService.shouldAutoApprove.mockImplementation(
        (_reuse: boolean, assigneeId: number) => assigneeId === 2,
      );
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.APPLICANT_REPORTING_LINE,
        config: {
          method: ReportingLineMethod.TO_JOB_GRADE,
          job_grade: 60,
        },
        reuse_prior_approvals: true,
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      expect(mockInstanceDataService.updateApprovalTask).toHaveBeenCalledWith(
        30,
        expect.objectContaining({ status: ApprovalStatus.PENDING }),
        undefined,
      );
    });

    it('should not auto-approve when reuse_prior_approvals is false', async () => {
      // Arrange
      mockInstanceDataService.getPriorApprovedUsers.mockResolvedValueOnce(
        new Set([1]),
      );
      mockUserService.findByIds.mockResolvedValueOnce([mockUser1, mockUser2]);
      mockAutoApproveService.resolveReusePriorApprovals.mockReturnValueOnce(
        false,
      );
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.SPECIFIC_USERS,
        config: { user_ids: [1, 2] },
        reuse_prior_approvals: false,
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      expect(mockAutoApproveService.autoApproveTask).not.toHaveBeenCalled();
    });

    it('should default reuse_prior_approvals to true when flag is not specified', async () => {
      // Arrange
      mockInstanceDataService.getPriorApprovedUsers.mockResolvedValueOnce(
        new Set([1]),
      );
      mockUserService.findByIds.mockResolvedValueOnce([mockUser1, mockUser2]);
      mockAutoApproveService.shouldAutoApprove.mockImplementation(
        (_reuse: boolean, assigneeId: number) => assigneeId === 1,
      );
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.SPECIFIC_USERS,
        config: { user_ids: [1, 2] },
      });

      // Act
      await executor.execute(nodeConfig, 100, 1, {});

      // Assert
      expect(mockAutoApproveService.autoApproveTask).toHaveBeenCalledWith(
        10,
        'WF-2024-001',
        1,
        mockSystemUser.id,
        undefined,
      );
    });
  });

  // ===========================================================================
  // Error handling
  // ===========================================================================

  describe('error handling', () => {
    it('should throw FlowExecutionError when no approvers are resolved', async () => {
      // Arrange
      mockOrgUnitService.getOrgUnitMemberUsers.mockResolvedValueOnce([]);
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.ROLE,
        config: { role_id: 999 },
      });

      // Act & Assert
      await expect(executor.execute(nodeConfig, 100, 1, {})).rejects.toThrow(
        FlowExecutionError,
      );
    });

    it('should throw INVALID_APPROVER_CONFIG when form_field expression evaluation fails', async () => {
      // Arrange
      mockExpressionEvaluator.evaluate.mockResolvedValueOnce({
        success: false,
        error: 'Field not found',
      });
      const nodeConfig = buildSingleApprovalNode({
        type: ApproverType.DEPARTMENT_HEAD,
        config: {
          source: SourceType.FORM_FIELD,
          form_field: 'getFormField("nonexistent").value',
        },
      });

      // Act
      let caughtError: unknown;
      try {
        await executor.execute(nodeConfig, 100, 1, {});
      } catch (error) {
        caughtError = error;
      }

      // Assert
      expect(caughtError).toBeInstanceOf(FlowExecutionError);
      expect((caughtError as FlowExecutionError).code).toBe(
        ErrorCode.INVALID_APPROVER_CONFIG,
      );
    });
  });
});
