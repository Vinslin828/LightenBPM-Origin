/**
 * Unit Tests - GetCurrentNodeExecutor
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GetCurrentNodeExecutor } from './get-current-node.executor';
import { ExecutionContext } from '../types/execution-context';
import { FlowExecutionError, ErrorCode } from '../../types';
import { InstanceDataService } from '../../../instance/instance-data.service';

describe('GetCurrentNodeExecutor', () => {
  let executor: GetCurrentNodeExecutor;
  let mockInstanceDataService: {
    findWorkflowNodeByIdWithApprovalTasks: jest.Mock;
  };

  beforeEach(async () => {
    mockInstanceDataService = {
      findWorkflowNodeByIdWithApprovalTasks: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCurrentNodeExecutor,
        {
          provide: InstanceDataService,
          useValue: mockInstanceDataService,
        },
      ],
    }).compile();

    executor = module.get<GetCurrentNodeExecutor>(GetCurrentNodeExecutor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ===========================================================================
  // Success cases
  // ===========================================================================

  describe('success cases', () => {
    it('should return node data with camelCase keys when node exists', async () => {
      // Arrange
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');
      mockInstanceDataService.findWorkflowNodeByIdWithApprovalTasks.mockResolvedValueOnce(
        {
          id: 10,
          public_id: 'node-uuid-123',
          instance_id: 1,
          node_key: 'approval_level_3',
          iteration: 1,
          subflow_instance_id: null,
          node_type: 'APPROVAL',
          status: 'PENDING',
          result: null,
          started_at: createdAt,
          completed_at: null,
          due_date: null,
          created_at: createdAt,
          updated_at: updatedAt,
          approval_tasks: [],
        },
      );

      const context: ExecutionContext = { currentNodeId: 10 };

      // Act
      const result = (await executor.execute([], context)) as Record<
        string,
        unknown
      >;

      // Assert
      expect(result.id).toBe(10);
      expect(result.publicId).toBe('node-uuid-123');
      expect(result.instanceId).toBe(1);
      expect(result.nodeKey).toBe('approval_level_3');
      expect(result.iteration).toBe(1);
      expect(result.subflowInstanceId).toBeNull();
      expect(result.nodeType).toBe('APPROVAL');
      expect(result.status).toBe('PENDING');
      expect(result.result).toBeNull();
      expect(result.startedAt).toBe(createdAt.getTime());
      expect(result.completedAt).toBeNull();
      expect(result.dueDate).toBeNull();
      expect(result.createdAt).toBe(createdAt.getTime());
      expect(result.updatedAt).toBe(updatedAt.getTime());
    });

    it('should return approverId with current/prev/next when node has mixed status tasks', async () => {
      // Arrange
      mockInstanceDataService.findWorkflowNodeByIdWithApprovalTasks.mockResolvedValueOnce(
        {
          id: 10,
          public_id: 'node-uuid',
          instance_id: 1,
          node_key: 'approval_1',
          iteration: 1,
          subflow_instance_id: null,
          node_type: 'APPROVAL',
          status: 'PENDING',
          result: null,
          started_at: new Date(),
          completed_at: null,
          due_date: null,
          created_at: new Date(),
          updated_at: new Date(),
          approval_tasks: [
            { id: 100, assignee_id: 201, status: 'APPROVED' },
            { id: 101, assignee_id: 202, status: 'PENDING' },
            { id: 102, assignee_id: 203, status: 'WAITING' },
            { id: 103, assignee_id: 204, status: 'WAITING' },
          ],
        },
      );

      const context: ExecutionContext = { currentNodeId: 10 };

      // Act
      const result = (await executor.execute([], context)) as Record<
        string,
        unknown
      >;
      const approverId = result.approverId as {
        current: number[];
        prev: number[] | null;
        next: number[] | null;
      };

      // Assert
      expect(approverId.current).toEqual([202]);
      expect(approverId.prev).toEqual([201]);
      expect(approverId.next).toEqual([203, 204]);
    });

    it('should return approverId with only current when all tasks are PENDING', async () => {
      // Arrange
      mockInstanceDataService.findWorkflowNodeByIdWithApprovalTasks.mockResolvedValueOnce(
        {
          id: 10,
          public_id: 'node-uuid',
          instance_id: 1,
          node_key: 'approval_1',
          iteration: 1,
          subflow_instance_id: null,
          node_type: 'APPROVAL',
          status: 'PENDING',
          result: null,
          started_at: new Date(),
          completed_at: null,
          due_date: null,
          created_at: new Date(),
          updated_at: new Date(),
          approval_tasks: [
            { id: 100, assignee_id: 201, status: 'PENDING' },
            { id: 101, assignee_id: 202, status: 'PENDING' },
          ],
        },
      );

      const context: ExecutionContext = { currentNodeId: 10 };

      // Act
      const result = (await executor.execute([], context)) as Record<
        string,
        unknown
      >;
      const approverId = result.approverId as {
        current: number[];
        prev: number[] | null;
        next: number[] | null;
      };

      // Assert
      expect(approverId.current).toEqual([201, 202]);
      expect(approverId.prev).toBeNull();
      expect(approverId.next).toBeNull();
    });

    it('should return all null when node has no approval tasks', async () => {
      // Arrange
      mockInstanceDataService.findWorkflowNodeByIdWithApprovalTasks.mockResolvedValueOnce(
        {
          id: 10,
          public_id: 'node-uuid',
          instance_id: 1,
          node_key: 'approval_1',
          iteration: 1,
          subflow_instance_id: null,
          node_type: 'APPROVAL',
          status: 'PENDING',
          result: null,
          started_at: new Date(),
          completed_at: null,
          due_date: null,
          created_at: new Date(),
          updated_at: new Date(),
          approval_tasks: [],
        },
      );

      const context: ExecutionContext = { currentNodeId: 10 };

      // Act
      const result = (await executor.execute([], context)) as Record<
        string,
        unknown
      >;
      const approverId = result.approverId as {
        current: number[];
        prev: number[] | null;
        next: number[] | null;
      };

      // Assert
      expect(approverId.current).toBeNull();
      expect(approverId.prev).toBeNull();
      expect(approverId.next).toBeNull();
    });

    it('should not include approval_tasks key in result when node data is converted', async () => {
      // Arrange
      mockInstanceDataService.findWorkflowNodeByIdWithApprovalTasks.mockResolvedValueOnce(
        {
          id: 10,
          public_id: 'node-uuid',
          instance_id: 1,
          node_key: 'approval_1',
          iteration: 1,
          subflow_instance_id: null,
          node_type: 'APPROVAL',
          status: 'PENDING',
          result: null,
          started_at: new Date(),
          completed_at: null,
          due_date: null,
          created_at: new Date(),
          updated_at: new Date(),
          approval_tasks: [{ id: 100, assignee_id: 201, status: 'PENDING' }],
        },
      );

      const context: ExecutionContext = { currentNodeId: 10 };

      // Act
      const result = (await executor.execute([], context)) as Record<
        string,
        unknown
      >;

      // Assert
      expect(result.approval_tasks).toBeUndefined();
      expect(result.approvalTasks).toBeUndefined();
      expect(result.approverId).toBeDefined();
    });
  });

  // ===========================================================================
  // Error cases
  // ===========================================================================

  describe('error cases', () => {
    it('should throw EXEC_INVALID_EXPRESSION when arguments are provided', async () => {
      // Arrange
      const context: ExecutionContext = { currentNodeId: 10 };

      // Act & Assert
      await expect(executor.execute(['arg1'], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute(['arg1'], context)).rejects.toThrow(
        'getCurrentNode() expects no arguments, got 1',
      );
    });

    it('should throw EXEC_INVALID_EXPRESSION when currentNodeId is not in context', async () => {
      // Arrange
      const context: ExecutionContext = {};

      // Act & Assert
      await expect(executor.execute([], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute([], context)).rejects.toThrow(
        'currentNodeId is required in execution context for getCurrentNode()',
      );
    });

    it('should throw EXEC_INVALID_EXPRESSION when node is not found', async () => {
      // Arrange
      mockInstanceDataService.findWorkflowNodeByIdWithApprovalTasks.mockResolvedValueOnce(
        null,
      );

      const context: ExecutionContext = { currentNodeId: 999 };

      // Act & Assert
      await expect(executor.execute([], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute([], context)).rejects.toThrow(
        'Workflow node with ID 999 not found',
      );
    });

    it('should throw with correct error code when validation fails', async () => {
      // Arrange
      const context: ExecutionContext = {};

      // Act & Assert
      try {
        await executor.execute([], context);
        fail('Should have thrown error');
      } catch (error) {
        expect(error).toBeInstanceOf(FlowExecutionError);
        expect((error as FlowExecutionError).code).toBe(
          ErrorCode.EXEC_INVALID_EXPRESSION,
        );
      }
    });

    it('should wrap non-FlowExecutionError when database throws', async () => {
      // Arrange
      mockInstanceDataService.findWorkflowNodeByIdWithApprovalTasks.mockRejectedValueOnce(
        new Error('Connection refused'),
      );

      const context: ExecutionContext = { currentNodeId: 10 };

      // Act & Assert
      await expect(executor.execute([], context)).rejects.toThrow(
        'Failed to fetch current node data: Connection refused',
      );
    });

    it('should rethrow FlowExecutionError as-is when service throws it', async () => {
      // Arrange
      const originalError = new FlowExecutionError(
        'Custom flow error',
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
      mockInstanceDataService.findWorkflowNodeByIdWithApprovalTasks.mockRejectedValueOnce(
        originalError,
      );

      const context: ExecutionContext = { currentNodeId: 10 };

      // Act & Assert
      await expect(executor.execute([], context)).rejects.toThrow(
        originalError,
      );
    });
  });

  // ===========================================================================
  // Edge cases
  // ===========================================================================

  describe('edge cases', () => {
    it('should handle currentNodeId of 0 when node exists', async () => {
      // Arrange
      mockInstanceDataService.findWorkflowNodeByIdWithApprovalTasks.mockResolvedValueOnce(
        {
          id: 0,
          public_id: 'node-uuid',
          instance_id: 1,
          node_key: 'approval_1',
          iteration: 1,
          subflow_instance_id: null,
          node_type: 'APPROVAL',
          status: 'PENDING',
          result: null,
          started_at: new Date(),
          completed_at: null,
          due_date: null,
          created_at: new Date(),
          updated_at: new Date(),
          approval_tasks: [],
        },
      );

      const context: ExecutionContext = { currentNodeId: 0 };

      // Act
      const result = (await executor.execute([], context)) as Record<
        string,
        unknown
      >;

      // Assert
      expect(result.id).toBe(0);
    });

    it('should return completed node data when node has result', async () => {
      // Arrange
      const completedAt = new Date('2024-01-05');
      mockInstanceDataService.findWorkflowNodeByIdWithApprovalTasks.mockResolvedValueOnce(
        {
          id: 10,
          public_id: 'node-uuid',
          instance_id: 1,
          node_key: 'approval_1',
          iteration: 1,
          subflow_instance_id: null,
          node_type: 'APPROVAL',
          status: 'COMPLETED',
          result: 'APPROVED',
          started_at: new Date('2024-01-01'),
          completed_at: completedAt,
          due_date: null,
          created_at: new Date('2024-01-01'),
          updated_at: completedAt,
          approval_tasks: [
            {
              id: 100,
              public_id: 'task-uuid',
              workflow_node_id: 10,
              assignee_id: 201,
              approver_group_index: 0,
              iteration: 1,
              escalated_to: null,
              status: 'APPROVED',
              created_at: new Date('2024-01-01'),
              updated_by: 201,
              updated_at: completedAt,
            },
          ],
        },
      );

      const context: ExecutionContext = { currentNodeId: 10 };

      // Act
      const result = (await executor.execute([], context)) as Record<
        string,
        unknown
      >;
      const approverId = result.approverId as {
        current: number[];
        prev: number[] | null;
        next: number[] | null;
      };

      // Assert
      expect(result.status).toBe('COMPLETED');
      expect(result.result).toBe('APPROVED');
      expect(result.completedAt).toBe(completedAt.getTime());
      expect(approverId.current).toBeNull();
      expect(approverId.prev).toEqual([201]);
      expect(approverId.next).toBeNull();
    });
  });
});
