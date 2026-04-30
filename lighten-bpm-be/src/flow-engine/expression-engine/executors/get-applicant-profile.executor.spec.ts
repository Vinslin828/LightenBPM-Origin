/**
 * Unit Tests - GetApplicantProfileExecutor
 */

import { Test, TestingModule } from '@nestjs/testing';
import { GetApplicantProfileExecutor } from './get-applicant-profile.executor';
import { ExecutionContext } from '../types/execution-context';
import { FlowExecutionError, ErrorCode } from '../../types';
import { UserService } from '../../../user/user.service';

describe('GetApplicantProfileExecutor', () => {
  let executor: GetApplicantProfileExecutor;
  let mockUserService: { findOne: jest.Mock };

  beforeEach(async () => {
    mockUserService = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetApplicantProfileExecutor,
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    executor = module.get<GetApplicantProfileExecutor>(
      GetApplicantProfileExecutor,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Success cases', () => {
    it('should return applicant profile when found (camelCase keys)', async () => {
      const mockProfile = {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        department: 'IT',
        job_grade: 'Senior',
        created_at: new Date('2024-01-01'),
        resolved_default_org: {
          id: 123,
          name: '研發部',
          code: 'RD001',
        },
      };

      mockUserService.findOne.mockResolvedValue(mockProfile);

      const context: ExecutionContext = {
        applicantId: 1,
      };

      const result = (await executor.execute([], context)) as Record<
        string,
        unknown
      >;

      // Should convert snake_case to camelCase and dates to epoch
      expect(result.id).toBe(1);
      expect(result.jobGrade).toBe('Senior');
      expect(result.createdAt).toBe(new Date('2024-01-01').getTime());
      // Should include convenience properties for default org
      expect(result.defaultOrgId).toBe(123);
      expect(result.defaultOrgName).toBe('研發部');
      expect(result.defaultOrgCode).toBe('RD001');
      expect(mockUserService.findOne).toHaveBeenCalledWith(1);
      expect(mockUserService.findOne).toHaveBeenCalledTimes(1);
    });

    it('should work with different applicant IDs', async () => {
      const mockProfile = {
        id: 999,
        name: 'Jane Smith',
        email: 'jane@example.com',
      };

      mockUserService.findOne.mockResolvedValue(mockProfile);

      const context: ExecutionContext = {
        applicantId: 999,
      };

      const result = (await executor.execute([], context)) as Record<
        string,
        unknown
      >;

      expect(result.id).toBe(999);
      expect(mockUserService.findOne).toHaveBeenCalledWith(999);
    });
  });

  describe('Error cases', () => {
    it('should throw error when arguments are provided', async () => {
      const context: ExecutionContext = {
        applicantId: 1,
      };

      await expect(executor.execute(['arg'], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute(['arg'], context)).rejects.toThrow(
        'getApplicantProfile() expects no arguments, got 1',
      );
    });

    it('should throw error when applicantId is not provided', async () => {
      const context: ExecutionContext = {};

      await expect(executor.execute([], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute([], context)).rejects.toThrow(
        'applicantId is required in execution context',
      );
    });

    it('should throw error when applicant is not found', async () => {
      mockUserService.findOne.mockResolvedValue(null);

      const context: ExecutionContext = {
        applicantId: 999,
      };

      await expect(executor.execute([], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute([], context)).rejects.toThrow(
        'Applicant with ID 999 not found',
      );
    });

    it('should throw error when userService.findOne throws', async () => {
      mockUserService.findOne.mockRejectedValue(new Error('Database error'));

      const context: ExecutionContext = {
        applicantId: 1,
      };

      await expect(executor.execute([], context)).rejects.toThrow(
        FlowExecutionError,
      );
      await expect(executor.execute([], context)).rejects.toThrow(
        'Failed to fetch applicant profile: Database error',
      );
    });

    it('should throw error with correct error code', async () => {
      mockUserService.findOne.mockResolvedValue(null);

      const context: ExecutionContext = {
        applicantId: 1,
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

      mockUserService.findOne.mockRejectedValue(originalError);

      const context: ExecutionContext = {
        applicantId: 1,
      };

      await expect(executor.execute([], context)).rejects.toThrow(
        originalError,
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle applicantId of 0', async () => {
      const mockProfile = {
        id: 0,
        name: 'System User',
      };

      mockUserService.findOne.mockResolvedValue(mockProfile);

      const context: ExecutionContext = {
        applicantId: 0,
      };

      const result = (await executor.execute([], context)) as Record<
        string,
        unknown
      >;

      expect(result.id).toBe(0);
      expect(mockUserService.findOne).toHaveBeenCalledWith(0);
    });
  });
});
