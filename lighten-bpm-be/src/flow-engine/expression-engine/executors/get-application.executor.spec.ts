/**
 * Unit Tests - GetApplicationExecutor
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GetApplicationExecutor } from './get-application.executor';
import { ExecutionContext } from '../types/execution-context';
import { FlowExecutionError, ErrorCode } from '../../types';
import { InstanceDataService } from '../../../instance/instance-data.service';

describe('GetApplicationExecutor', () => {
  let executor: GetApplicationExecutor;
  let mockInstanceDataService: {
    findWorkflowInstanceByIdWithEvents: jest.Mock;
  };

  beforeEach(async () => {
    mockInstanceDataService = {
      findWorkflowInstanceByIdWithEvents: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetApplicationExecutor,
        {
          provide: InstanceDataService,
          useValue: mockInstanceDataService,
        },
      ],
    }).compile();

    executor = module.get<GetApplicationExecutor>(GetApplicationExecutor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Success cases', () => {
    it('should return workflow instance data with camelCase keys', async () => {
      const createdAt = new Date('2024-01-01');
      const mockInstanceData = {
        id: 123,
        status: 'RUNNING',
        applicant_id: 1,
        created_at: createdAt,
        updated_at: new Date('2024-01-02'),
        events: [{ event_type: 'SUBMIT', created_at: createdAt }],
      };

      mockInstanceDataService.findWorkflowInstanceByIdWithEvents.mockResolvedValue(
        mockInstanceData,
      );

      const context: ExecutionContext = {
        workflowInstanceId: 123,
      };

      const result = (await executor.execute([], context)) as Record<
        string,
        unknown
      >;

      // Should convert snake_case to camelCase and dates to epoch
      expect(result.id).toBe(123);
      expect(result.applicantId).toBe(1);
      expect(result.createdAt).toBe(createdAt.getTime());
      expect(
        mockInstanceDataService.findWorkflowInstanceByIdWithEvents,
      ).toHaveBeenCalledWith(123);
      expect(
        mockInstanceDataService.findWorkflowInstanceByIdWithEvents,
      ).toHaveBeenCalledTimes(1);
    });

    it('should work with different instance IDs', async () => {
      const mockInstanceData = {
        id: 999,
        status: 'COMPLETED',
        events: [],
      };

      mockInstanceDataService.findWorkflowInstanceByIdWithEvents.mockResolvedValue(
        mockInstanceData,
      );

      const context: ExecutionContext = {
        workflowInstanceId: 999,
      };

      const result = (await executor.execute([], context)) as Record<
        string,
        unknown
      >;

      expect(result.id).toBe(999);
      expect(
        mockInstanceDataService.findWorkflowInstanceByIdWithEvents,
      ).toHaveBeenCalledWith(999);
    });
  });

  describe('Error cases', () => {
    it('should throw error when arguments are provided', async () => {
      const context: ExecutionContext = {
        workflowInstanceId: 123,
      };

      await expect(executor.execute(['arg'], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute(['arg'], context)).rejects.toThrow(
        'getApplication() expects no arguments, got 1',
      );
    });

    it('should throw error when workflowInstanceId is not provided', async () => {
      const context: ExecutionContext = {};

      await expect(executor.execute([], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute([], context)).rejects.toThrow(
        'workflowInstanceId is required in execution context',
      );
    });

    it('should throw error when workflow instance is not found', async () => {
      mockInstanceDataService.findWorkflowInstanceByIdWithEvents.mockResolvedValue(
        null,
      );

      const context: ExecutionContext = {
        workflowInstanceId: 999,
      };

      await expect(executor.execute([], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute([], context)).rejects.toThrow(
        'Workflow instance with ID 999 not found',
      );
    });

    it('should throw error when instanceDataService.findWorkflowInstanceByIdWithEvents throws', async () => {
      mockInstanceDataService.findWorkflowInstanceByIdWithEvents.mockRejectedValue(
        new Error('Database error'),
      );

      const context: ExecutionContext = {
        workflowInstanceId: 123,
      };

      await expect(executor.execute([], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute([], context)).rejects.toThrow(
        'Failed to fetch workflow instance data: Database error',
      );
    });

    it('should throw error with correct error code', async () => {
      mockInstanceDataService.findWorkflowInstanceByIdWithEvents.mockResolvedValue(
        null,
      );

      const context: ExecutionContext = {
        workflowInstanceId: 123,
      };

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

    it('should rethrow FlowExecutionError as-is', async () => {
      const originalError = new FlowExecutionError(
        'Custom error',
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );

      mockInstanceDataService.findWorkflowInstanceByIdWithEvents.mockRejectedValue(
        originalError,
      );

      const context: ExecutionContext = {
        workflowInstanceId: 123,
      };

      await expect(executor.execute([], context)).rejects.toThrow(
        originalError,
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle workflowInstanceId of 0', async () => {
      const mockInstanceData = {
        id: 0,
        status: 'DRAFT',
        events: [],
      };

      mockInstanceDataService.findWorkflowInstanceByIdWithEvents.mockResolvedValue(
        mockInstanceData,
      );

      const context: ExecutionContext = {
        workflowInstanceId: 0,
      };

      const result = (await executor.execute([], context)) as Record<
        string,
        unknown
      >;

      expect(result.id).toBe(0);
      expect(
        mockInstanceDataService.findWorkflowInstanceByIdWithEvents,
      ).toHaveBeenCalledWith(0);
    });
  });
});
