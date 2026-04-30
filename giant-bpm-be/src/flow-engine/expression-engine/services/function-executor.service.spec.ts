/**
 * Unit Tests - FunctionExecutorService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { FunctionExecutorService } from './function-executor.service';
import { GetFormFieldExecutor } from '../executors/get-form-field.executor';
import { GetApplicantProfileExecutor } from '../executors/get-applicant-profile.executor';
import { GetApplicationExecutor } from '../executors/get-application.executor';
import { GetMasterDataExecutor } from '../executors/get-master-data.executor';
import { GetCurrentNodeExecutor } from '../executors/get-current-node.executor';
import {
  ExecutionContext,
  ExtractedFunctionCall,
  FORM_FIELD_FUNCTION,
  APPLICANT_PROFILE_FUNCTION,
  APPLICATION_FUNCTION,
  CURRENT_NODE_FUNCTION,
} from '../types';
import { FlowExecutionError, ErrorCode } from '../../types';

describe('FunctionExecutorService', () => {
  let service: FunctionExecutorService;
  let mockGetFormFieldExecutor: jest.Mocked<GetFormFieldExecutor>;
  let mockGetApplicantProfileExecutor: jest.Mocked<GetApplicantProfileExecutor>;
  let mockGetApplicationExecutor: jest.Mocked<GetApplicationExecutor>;
  let mockGetMasterDataExecutor: jest.Mocked<GetMasterDataExecutor>;
  let mockGetCurrentNodeExecutor: jest.Mocked<GetCurrentNodeExecutor>;

  const context: ExecutionContext = {
    formData: { amount: 5000 },
    applicantId: 1,
    workflowInstanceId: 100,
  };

  beforeEach(async () => {
    mockGetFormFieldExecutor = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetFormFieldExecutor>;

    mockGetApplicantProfileExecutor = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetApplicantProfileExecutor>;

    mockGetApplicationExecutor = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetApplicationExecutor>;

    mockGetMasterDataExecutor = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetMasterDataExecutor>;

    mockGetCurrentNodeExecutor = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<GetCurrentNodeExecutor>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FunctionExecutorService,
        {
          provide: GetFormFieldExecutor,
          useValue: mockGetFormFieldExecutor,
        },
        {
          provide: GetApplicantProfileExecutor,
          useValue: mockGetApplicantProfileExecutor,
        },
        {
          provide: GetApplicationExecutor,
          useValue: mockGetApplicationExecutor,
        },
        {
          provide: GetMasterDataExecutor,
          useValue: mockGetMasterDataExecutor,
        },
        {
          provide: GetCurrentNodeExecutor,
          useValue: mockGetCurrentNodeExecutor,
        },
      ],
    }).compile();

    service = module.get<FunctionExecutorService>(FunctionExecutorService);
  });

  // ===========================================================================
  // execute - getFormField
  // ===========================================================================

  describe('execute with getFormField', () => {
    it('should return executor result when calling getFormField', async () => {
      // Arrange
      mockGetFormFieldExecutor.execute.mockResolvedValue({ value: 5000 });
      const call: ExtractedFunctionCall = {
        functionName: FORM_FIELD_FUNCTION,
        args: ['amount'],
        originalText: 'getFormField("amount")',
        start: 0,
        end: 22,
      };

      // Act
      const result = await service.execute(call, context);

      // Assert
      expect(result).toEqual({ value: 5000 });
    });

    it('should return property value when accessedProperty is specified', async () => {
      // Arrange
      mockGetFormFieldExecutor.execute.mockResolvedValue({ value: 5000 });
      const call: ExtractedFunctionCall = {
        functionName: FORM_FIELD_FUNCTION,
        args: ['amount'],
        accessedProperty: 'value',
        originalText: 'getFormField("amount").value',
        start: 0,
        end: 28,
      };

      // Act
      const result = await service.execute(call, context);

      // Assert
      expect(result).toBe(5000);
    });
  });

  // ===========================================================================
  // execute - getApplicantProfile
  // ===========================================================================

  describe('execute with getApplicantProfile', () => {
    it('should return executor result when calling getApplicantProfile', async () => {
      // Arrange
      mockGetApplicantProfileExecutor.execute.mockResolvedValue({
        name: 'John',
        department: 'IT',
      });
      const call: ExtractedFunctionCall = {
        functionName: APPLICANT_PROFILE_FUNCTION,
        args: [],
        originalText: 'getApplicantProfile()',
        start: 0,
        end: 21,
      };

      // Act
      const result = await service.execute(call, context);

      // Assert
      expect(result).toEqual({ name: 'John', department: 'IT' });
    });

    it('should return property value when accessedProperty is specified', async () => {
      // Arrange
      mockGetApplicantProfileExecutor.execute.mockResolvedValue({
        name: 'John',
        department: 'IT',
      });
      const call: ExtractedFunctionCall = {
        functionName: APPLICANT_PROFILE_FUNCTION,
        args: [],
        accessedProperty: 'name',
        originalText: 'getApplicantProfile().name',
        start: 0,
        end: 26,
      };

      // Act
      const result = await service.execute(call, context);

      // Assert
      expect(result).toBe('John');
    });
  });

  // ===========================================================================
  // execute - getApplication
  // ===========================================================================

  describe('execute with getApplication', () => {
    it('should return executor result when calling getApplication', async () => {
      // Arrange
      mockGetApplicationExecutor.execute.mockResolvedValue({
        id: 100,
        status: 'pending',
      });
      const call: ExtractedFunctionCall = {
        functionName: APPLICATION_FUNCTION,
        args: [],
        originalText: 'getApplication()',
        start: 0,
        end: 16,
      };

      // Act
      const result = await service.execute(call, context);

      // Assert
      expect(result).toEqual({ id: 100, status: 'pending' });
    });

    it('should return property value when accessedProperty is specified', async () => {
      // Arrange
      mockGetApplicationExecutor.execute.mockResolvedValue({
        id: 100,
        status: 'pending',
      });
      const call: ExtractedFunctionCall = {
        functionName: APPLICATION_FUNCTION,
        args: [],
        accessedProperty: 'status',
        originalText: 'getApplication().status',
        start: 0,
        end: 23,
      };

      // Act
      const result = await service.execute(call, context);

      // Assert
      expect(result).toBe('pending');
    });
  });

  // ===========================================================================
  // execute - getCurrentNode
  // ===========================================================================

  describe('execute with getCurrentNode', () => {
    it('should return executor result when calling getCurrentNode', async () => {
      // Arrange
      mockGetCurrentNodeExecutor.execute.mockResolvedValueOnce({
        id: 10,
        nodeKey: 'approval_1',
        status: 'PENDING',
        approverId: [{ assigneeId: 201, status: 'PENDING' }],
      });
      const call: ExtractedFunctionCall = {
        functionName: CURRENT_NODE_FUNCTION,
        args: [],
        originalText: 'getCurrentNode()',
        start: 0,
        end: 16,
      };

      // Act
      const result = await service.execute(call, context);

      // Assert
      expect(result).toEqual({
        id: 10,
        nodeKey: 'approval_1',
        status: 'PENDING',
        approverId: [{ assigneeId: 201, status: 'PENDING' }],
      });
    });

    it('should return property value when accessedProperty is specified', async () => {
      // Arrange
      mockGetCurrentNodeExecutor.execute.mockResolvedValueOnce({
        id: 10,
        nodeKey: 'approval_1',
        status: 'PENDING',
        approverId: [
          { assigneeId: 201, status: 'PENDING' },
          { assigneeId: 202, status: 'WAITING' },
        ],
      });
      const call: ExtractedFunctionCall = {
        functionName: CURRENT_NODE_FUNCTION,
        args: [],
        accessedProperty: 'approverId',
        originalText: 'getCurrentNode().approverId',
        start: 0,
        end: 27,
      };

      // Act
      const result = await service.execute(call, context);

      // Assert
      expect(result).toEqual([
        { assigneeId: 201, status: 'PENDING' },
        { assigneeId: 202, status: 'WAITING' },
      ]);
    });

    it('should return status when accessing status property', async () => {
      // Arrange
      mockGetCurrentNodeExecutor.execute.mockResolvedValueOnce({
        id: 10,
        status: 'COMPLETED',
        result: 'APPROVED',
        approverId: [],
      });
      const call: ExtractedFunctionCall = {
        functionName: CURRENT_NODE_FUNCTION,
        args: [],
        accessedProperty: 'status',
        originalText: 'getCurrentNode().status',
        start: 0,
        end: 23,
      };

      // Act
      const result = await service.execute(call, context);

      // Assert
      expect(result).toBe('COMPLETED');
    });
  });

  // ===========================================================================
  // execute - property access errors
  // ===========================================================================

  describe('execute property access errors', () => {
    it('should throw INVALID_EXPRESSION when accessing property on null', async () => {
      // Arrange
      mockGetFormFieldExecutor.execute.mockResolvedValue(null);
      const call: ExtractedFunctionCall = {
        functionName: FORM_FIELD_FUNCTION,
        args: ['field'],
        accessedProperty: 'value',
        originalText: 'getFormField("field").value',
        start: 0,
        end: 27,
      };

      // Act & Assert
      try {
        await service.execute(call, context);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FlowExecutionError);
        expect((error as FlowExecutionError).code).toBe(
          ErrorCode.EXEC_INVALID_EXPRESSION,
        );
        expect((error as FlowExecutionError).message).toContain(
          "Cannot access property 'value' of null",
        );
      }
    });

    it('should throw INVALID_EXPRESSION when accessing property on undefined', async () => {
      // Arrange
      mockGetFormFieldExecutor.execute.mockResolvedValue(undefined);
      const call: ExtractedFunctionCall = {
        functionName: FORM_FIELD_FUNCTION,
        args: ['field'],
        accessedProperty: 'value',
        originalText: 'getFormField("field").value',
        start: 0,
        end: 27,
      };

      // Act & Assert
      try {
        await service.execute(call, context);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FlowExecutionError);
        expect((error as FlowExecutionError).code).toBe(
          ErrorCode.EXEC_INVALID_EXPRESSION,
        );
        expect((error as FlowExecutionError).message).toContain(
          "Cannot access property 'value' of undefined",
        );
      }
    });

    it('should throw INVALID_EXPRESSION when accessing property on non-object', async () => {
      // Arrange
      mockGetFormFieldExecutor.execute.mockResolvedValue('string value');
      const call: ExtractedFunctionCall = {
        functionName: FORM_FIELD_FUNCTION,
        args: ['field'],
        accessedProperty: 'value',
        originalText: 'getFormField("field").value',
        start: 0,
        end: 27,
      };

      // Act & Assert
      try {
        await service.execute(call, context);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FlowExecutionError);
        expect((error as FlowExecutionError).code).toBe(
          ErrorCode.EXEC_INVALID_EXPRESSION,
        );
        expect((error as FlowExecutionError).message).toContain(
          "Cannot access property 'value' on non-object type",
        );
      }
    });

    it('should throw INVALID_EXPRESSION when property does not exist', async () => {
      // Arrange
      mockGetFormFieldExecutor.execute.mockResolvedValue({ value: 100 });
      const call: ExtractedFunctionCall = {
        functionName: FORM_FIELD_FUNCTION,
        args: ['field'],
        accessedProperty: 'nonexistent',
        originalText: 'getFormField("field").nonexistent',
        start: 0,
        end: 33,
      };

      // Act & Assert
      try {
        await service.execute(call, context);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(FlowExecutionError);
        expect((error as FlowExecutionError).code).toBe(
          ErrorCode.EXEC_INVALID_EXPRESSION,
        );
        expect((error as FlowExecutionError).message).toContain(
          "Property 'nonexistent' does not exist",
        );
      }
    });
  });

  // ===========================================================================
  // executeAll
  // ===========================================================================

  describe('executeAll', () => {
    it('should return map of values when executing multiple calls', async () => {
      // Arrange
      mockGetFormFieldExecutor.execute
        .mockResolvedValueOnce({ value: 100 })
        .mockResolvedValueOnce({ value: 200 });
      const calls: ExtractedFunctionCall[] = [
        {
          functionName: FORM_FIELD_FUNCTION,
          args: ['field_a'],
          accessedProperty: 'value',
          originalText: 'getFormField("field_a").value',
          start: 0,
          end: 29,
        },
        {
          functionName: FORM_FIELD_FUNCTION,
          args: ['field_b'],
          accessedProperty: 'value',
          originalText: 'getFormField("field_b").value',
          start: 35,
          end: 64,
        },
      ];

      // Act
      const result = await service.executeAll(calls, context);

      // Assert
      expect(result.size).toBe(2);
      expect(result.get('getFormField("field_a").value')).toBe(100);
      expect(result.get('getFormField("field_b").value')).toBe(200);
    });

    it('should return empty map when no calls provided', async () => {
      // Arrange
      const calls: ExtractedFunctionCall[] = [];

      // Act
      const result = await service.executeAll(calls, context);

      // Assert
      expect(result.size).toBe(0);
    });

    it('should execute mixed function types', async () => {
      // Arrange
      mockGetFormFieldExecutor.execute.mockResolvedValue({ value: 5000 });
      mockGetApplicantProfileExecutor.execute.mockResolvedValue({
        name: 'John',
      });
      const calls: ExtractedFunctionCall[] = [
        {
          functionName: FORM_FIELD_FUNCTION,
          args: ['amount'],
          accessedProperty: 'value',
          originalText: 'getFormField("amount").value',
          start: 0,
          end: 28,
        },
        {
          functionName: APPLICANT_PROFILE_FUNCTION,
          args: [],
          accessedProperty: 'name',
          originalText: 'getApplicantProfile().name',
          start: 32,
          end: 58,
        },
      ];

      // Act
      const result = await service.executeAll(calls, context);

      // Assert
      expect(result.size).toBe(2);
      expect(result.get('getFormField("amount").value')).toBe(5000);
      expect(result.get('getApplicantProfile().name')).toBe('John');
    });
  });
});
