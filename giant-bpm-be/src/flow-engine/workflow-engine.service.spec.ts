/**
 * Unit Tests - WorkflowEngineService (approver form data)
 *
 * Tests for validateAndMergeApproverFormData integration in updateApproval.
 */

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WorkflowEngineService } from './workflow-engine.service';
import { TransactionService } from '../prisma/transaction.service';
import { WorkflowExecutorService } from './execution/workflow-executor.service';
import { RoutingBuilder } from './routing-builder/routing-builder';
import { InstanceDataService } from '../instance/instance-data.service';
import { UserService } from '../user/user.service';
import { ApplicationService } from '../instance/application.service';
import { ExpressionEvaluatorService } from './expression-engine';
import { FormDataValidatorService } from './validation/form-data/form-data-validator.service';
import { ValidationExecutorService } from './expression-engine/services/validation-executor.service';
import {
  ApprovalRequest,
  ApprovalRequestDto,
} from '../instance/dto/approval-types.dto';
import { ApprovalStatus, InstanceStatus } from '../common/types/common.types';
import {
  NodeType,
  ApprovalMethod,
  ApproverType,
  COMPONENT_RULE_ACTION,
  FORM_FIELD_VALUE_TYPES,
} from './types';

describe('WorkflowEngineService - approver form data', () => {
  let service: WorkflowEngineService;
  let mockTransactionService: jest.Mocked<TransactionService>;
  let mockWorkflowExecutor: jest.Mocked<WorkflowExecutorService>;
  let mockRoutingBuilder: jest.Mocked<RoutingBuilder>;
  let mockInstanceDataService: jest.Mocked<InstanceDataService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockApplicationService: jest.Mocked<ApplicationService>;
  let mockExpressionEvaluator: jest.Mocked<ExpressionEvaluatorService>;
  let mockFormDataValidator: jest.Mocked<FormDataValidatorService>;
  let mockValidationExecutor: jest.Mocked<ValidationExecutorService>;

  // ---------------------------------------------------------------------------
  // Shared fixtures
  // ---------------------------------------------------------------------------

  const userId = 1;
  const serialNumber = 'APP-123';
  const approvalTaskPublicId = 'task-pub-id';

  const mockFlowDefinition = {
    nodes: [
      {
        key: 'start',
        type: 'start' as const,
        label: 'Start',
        next: ['approval1'],
        component_rules: [],
      },
      {
        key: 'approval1',
        type: NodeType.APPROVAL,
        label: 'Approval',
        next: ['end'],
        approval_method: ApprovalMethod.SINGLE,
        approvers: {
          type: ApproverType.SPECIFIC_USERS,
          user_ids: [userId],
          component_rules: [
            {
              component_name: 'approved_amount',
              actions: [COMPONENT_RULE_ACTION.EDITABLE],
            },
            {
              component_name: 'note',
              actions: [
                COMPONENT_RULE_ACTION.EDITABLE,
                COMPONENT_RULE_ACTION.REQUIRED,
              ],
            },
          ],
        },
      },
    ],
  };

  const mockWorkflowInstance = {
    id: 100,
    serial_number: serialNumber,
    applicant_id: 2,
    status: InstanceStatus.RUNNING,
    revision: {
      id: 10,
      flow_definition: mockFlowDefinition,
    },
  };

  const mockApprovalTask = {
    id: 1,
    public_id: approvalTaskPublicId,
    assignee_id: userId,
    status: ApprovalStatus.PENDING,
    approver_group_index: 0,
    workflow_node: {
      id: 50,
      instance_id: 100,
      node_key: 'approval1',
    },
  };

  const mockFormSchema = {
    root: ['entity-1', 'entity-2', 'entity-3'],
    entities: {
      'entity-1': {
        type: 'input',
        attributes: {
          name: 'amount',
          valueType: FORM_FIELD_VALUE_TYPES.NUMBER,
        },
      },
      'entity-2': {
        type: 'input',
        attributes: {
          name: 'approved_amount',
          valueType: FORM_FIELD_VALUE_TYPES.NUMBER,
        },
      },
      'entity-3': {
        type: 'input',
        attributes: {
          name: 'note',
          valueType: FORM_FIELD_VALUE_TYPES.TEXT,
        },
      },
    },
  };

  const mockFormInstance = {
    id: 200,
    form_revision: {
      form_schema: mockFormSchema,
      fe_validation: null,
    },
    data_history: [
      {
        data: { amount: 10000, approved_amount: 10000, note: 'original' },
      },
    ],
  };

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  beforeEach(() => {
    mockTransactionService = {
      runTransaction: jest.fn((fn) => fn({})),
    } as unknown as jest.Mocked<TransactionService>;

    mockWorkflowExecutor = {
      executeFromNode: jest.fn(),
      executeWorkflow: jest.fn().mockResolvedValue({
        success: true,
        status: 'waiting_approval',
        stoppedAtNodeKey: 'approval2',
      }),
    } as unknown as jest.Mocked<WorkflowExecutorService>;

    mockRoutingBuilder = {} as unknown as jest.Mocked<RoutingBuilder>;

    mockInstanceDataService = {
      findApprovalTaskByPublicIdWithNode: jest
        .fn()
        .mockResolvedValue(mockApprovalTask),
      updateApprovalTask: jest.fn().mockResolvedValue({
        ...mockApprovalTask,
        status: ApprovalStatus.APPROVED,
      }),
      createWorkflowComment: jest.fn(),
      findFormInstanceByWorkflowInstanceId: jest.fn(),
    } as unknown as jest.Mocked<InstanceDataService>;

    mockUserService = {
      findById: jest.fn(),
      findOne: jest.fn().mockResolvedValue({ id: 1, name: 'User' }),
      getSystemUser: jest.fn().mockResolvedValue({ id: 999 }),
    } as unknown as jest.Mocked<UserService>;

    mockApplicationService = {
      findWorkflowInstanceWithRevision: jest
        .fn()
        .mockResolvedValue(mockWorkflowInstance),
      findFormInstance: jest.fn().mockResolvedValue(mockFormInstance),
      updateFormData: jest.fn().mockResolvedValue(mockFormInstance),
      executeExpressionComponents: jest
        .fn()
        .mockImplementation((_schema, data) => data),
    } as unknown as jest.Mocked<ApplicationService>;

    mockExpressionEvaluator = {
      evaluate: jest.fn(),
    } as unknown as jest.Mocked<ExpressionEvaluatorService>;

    mockFormDataValidator = {
      validateAndCoerceFormData: jest.fn().mockReturnValue({
        isValid: true,
        errors: [],
        coercedData: {
          amount: 10000,
          approved_amount: 5000,
          note: 'approved by manager',
        },
      }),
    } as unknown as jest.Mocked<FormDataValidatorService>;

    mockValidationExecutor = {
      execute: jest.fn().mockResolvedValue({
        isValid: true,
        errors: [],
      }),
    } as unknown as jest.Mocked<ValidationExecutorService>;

    const mockAutoApproveService = {
      shouldAutoApprove: jest.fn().mockReturnValue(false),
      resolveReusePriorApprovals: jest.fn().mockReturnValue(true),
      autoApproveTask: jest.fn(),
    };

    const mockRejectionHandler = {
      handleRejection: jest.fn().mockResolvedValue({
        taskStatus: ApprovalStatus.REJECTED,
        nodeCompleted: true,
      }),
    };

    const mockApprovalNotification = {
      notifyTaskPending: jest.fn(),
      notifyApprovalDecision: jest.fn(),
      notifyWorkflowCompleted: jest.fn(),
    };

    service = new WorkflowEngineService(
      mockTransactionService,
      mockWorkflowExecutor,
      mockRoutingBuilder,
      mockInstanceDataService,
      mockUserService,
      mockApplicationService,
      mockExpressionEvaluator,
      mockFormDataValidator,
      mockValidationExecutor,
      mockAutoApproveService as any,
      mockRejectionHandler as any,
      mockApprovalNotification as any,
    );
  });

  // ===========================================================================
  // Helper
  // ===========================================================================

  /**
   * Build an ApprovalRequestDto with optional form_data
   */
  function buildApprovalRequest(
    overrides: Partial<ApprovalRequestDto> = {},
  ): ApprovalRequestDto {
    return {
      approval_id: approvalTaskPublicId,
      approval_result: ApprovalRequest.APPROVE,
      ...overrides,
    } as ApprovalRequestDto;
  }

  /**
   * Stub the post-transaction paths so updateApproval can complete.
   * The transaction callback still executes (so we can assert form_data logic),
   * but continueWorkflowExecution and notifications are handled by mocks.
   */
  function stubPostApprovalPath() {
    // Transaction executes callback and returns its result; we need to
    // override it to skip the real handleApproval internals.
    mockTransactionService.runTransaction.mockResolvedValue({
      taskStatus: ApprovalStatus.APPROVED,
      nodeCompleted: true,
    });

    // continueWorkflowExecution needs executeWorkflow + findWorkflowInstanceById
    mockApplicationService.findWorkflowInstanceById = jest
      .fn()
      .mockResolvedValue(mockWorkflowInstance) as any;
    mockInstanceDataService.updateManyApprovalTasksByInstanceId = jest
      .fn()
      .mockResolvedValue(undefined) as any;
    mockInstanceDataService.updateManyWorkflowNodesByInstanceId = jest
      .fn()
      .mockResolvedValue(undefined) as any;
    mockInstanceDataService.findActiveWorkflowNodeByInstanceId = jest
      .fn()
      .mockResolvedValue(null) as any;
  }

  // ===========================================================================
  // Approver form data - happy paths
  // ===========================================================================

  describe('approver form data', () => {
    it('should save merged form data when approver approves with form_data', async () => {
      // Arrange
      stubPostApprovalPath();
      const request = buildApprovalRequest({
        form_data: { approved_amount: 5000, note: 'approved by manager' },
      });

      // Act
      await service.updateApproval(serialNumber, request, userId);

      // Assert
      expect(mockApplicationService.findFormInstance).toHaveBeenCalledWith(
        serialNumber,
      );
      expect(
        mockFormDataValidator.validateAndCoerceFormData,
      ).toHaveBeenCalled();
      expect(mockValidationExecutor.execute).toHaveBeenCalled();
    });

    it('should ignore non-editable fields in submitted form_data when approver submits extra fields', async () => {
      // Arrange
      stubPostApprovalPath();
      const request = buildApprovalRequest({
        form_data: {
          approved_amount: 5000,
          note: 'ok',
          amount: 99999, // non-editable — should be ignored
        },
      });

      // Act
      await service.updateApproval(serialNumber, request, userId);

      // Assert — validateAndCoerceFormData should receive merged data
      // where amount stays as original (10000), not the submitted 99999
      const callArgs =
        mockFormDataValidator.validateAndCoerceFormData.mock.calls[0];
      const mergedData = callArgs[2]; // 3rd argument is the merged form data
      expect(mergedData.amount).toBe(10000);
      expect(mergedData.approved_amount).toBe(5000);
    });

    it('should save form data when approver rejects with form_data', async () => {
      // Arrange
      mockTransactionService.runTransaction.mockResolvedValue({
        taskStatus: ApprovalStatus.REJECTED,
        nodeCompleted: true,
      });
      mockInstanceDataService.updateApprovalTask.mockResolvedValue({
        ...mockApprovalTask,
        status: ApprovalStatus.REJECTED,
      } as any);
      mockApplicationService.findWorkflowInstanceWithRevision
        .mockResolvedValueOnce(mockWorkflowInstance as any)
        .mockResolvedValueOnce({
          ...mockWorkflowInstance,
          status: InstanceStatus.REJECTED,
        } as any);

      const request = buildApprovalRequest({
        approval_result: ApprovalRequest.REJECT,
        form_data: { approved_amount: 0, note: 'rejected' },
      });

      // Act
      await service.updateApproval(serialNumber, request, userId);

      // Assert
      expect(mockApplicationService.findFormInstance).toHaveBeenCalledWith(
        serialNumber,
      );
      expect(
        mockFormDataValidator.validateAndCoerceFormData,
      ).toHaveBeenCalled();
    });

    it('should not call form data validation when approving without form_data', async () => {
      // Arrange
      stubPostApprovalPath();
      const request = buildApprovalRequest(); // no form_data

      // Act
      await service.updateApproval(serialNumber, request, userId);

      // Assert
      expect(mockApplicationService.findFormInstance).not.toHaveBeenCalled();
      expect(
        mockFormDataValidator.validateAndCoerceFormData,
      ).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Approver form data - error cases
  // ===========================================================================

  describe('approver form data - error handling', () => {
    it('should throw BadRequestException when form data validation fails', async () => {
      // Arrange
      mockFormDataValidator.validateAndCoerceFormData.mockReturnValue({
        isValid: false,
        errors: [
          {
            code: 'FORM_DATA_TYPE_CONVERSION_FAILED',
            message: "Field 'approved_amount' cannot be converted to number",
          },
        ],
      });
      const request = buildApprovalRequest({
        form_data: { approved_amount: 'not-a-number', note: 'ok' },
      });

      // Act & Assert
      await expect(
        service.updateApproval(serialNumber, request, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when expression validation fails', async () => {
      // Arrange
      mockValidationExecutor.execute.mockResolvedValue({
        isValid: false,
        errors: [{ code: 'CUSTOM', message: 'Amount too high' }],
        message: 'Form validation failed',
      });
      const request = buildApprovalRequest({
        form_data: { approved_amount: 5000, note: 'ok' },
      });

      // Act & Assert
      await expect(
        service.updateApproval(serialNumber, request, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when form instance not found', async () => {
      // Arrange
      mockApplicationService.findFormInstance.mockResolvedValue(null);
      const request = buildApprovalRequest({
        form_data: { approved_amount: 5000, note: 'ok' },
      });

      // Act & Assert
      await expect(
        service.updateApproval(serialNumber, request, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
