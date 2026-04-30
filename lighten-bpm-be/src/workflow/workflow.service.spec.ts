/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowService } from './workflow.service';
import { WorkflowRepository } from './repositories/workflow.repository';
import { FormWorkflowBindingService } from '../form-workflow-binding/form-workflow-binding.service';
import { FormService } from '../form/form.service';
import { CreateWorkflowRevisionDto } from './dto/create-workflow-revision.dto';
import { RevisionState } from '../common/types/common.types';
import { FlowValidatorService } from '../flow-engine/validation/flow-definition/flow-validator.service';
import { FormReferenceValidatorService } from '../flow-engine/validation/form-reference/form-reference-validator.service';
import { FlowAnalysisService } from '../flow-engine/analysis/flow-analysis.service';
import { NodeType } from '../flow-engine/types';
import { TransactionService } from '../prisma/transaction.service';
import { PermissionBuilderService } from '../common/permission/permission-builder.service';
import { AuthUser } from '../auth/types/auth-user';

describe('WorkflowService', () => {
  let service: WorkflowService;

  const mockPermissionBuilderService = {
    getWorkflowVisibilityWhere: jest.fn().mockReturnValue({}),
    canPerformAction: jest.fn().mockReturnValue(true),
  };

  const mockWorkflowRepository = {
    findWorkflowByPublicId: jest.fn(),
    createWorkflowRevision: jest.fn(),
    updateWorkflow: jest.fn(),
    archiveActiveWorkflowRevisions: jest.fn(),
    findPermissionsByWorkflowId: jest.fn(),
  };

  const mockTransactionService = {
    runTransaction: jest.fn((callback) => callback(mockWorkflowRepository)),
  };

  const mockBindingService = {
    findFormIdByWorkflowPublicId: jest.fn(),
    getBindingFormByWorkflowId: jest.fn(),
  };

  const mockFormService = {
    findActiveFormSchema: jest.fn(),
  };

  const mockFlowValidator = {
    validateFlowDefinition: jest.fn().mockResolvedValue({
      isValid: true,
      errors: [],
    }),
  };

  const mockFormReferenceValidator = {
    validateFlowFormReferences: jest.fn().mockReturnValue({
      isValid: true,
      errors: [],
    }),
  };

  const mockFlowAnalysisService = {
    findGuaranteedPrecedingNodes: jest.fn().mockReturnValue([]),
    findPossiblePrecedingNodes: jest.fn().mockReturnValue([]),
    findSelectableRejectTargets: jest.fn().mockReturnValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
        {
          provide: WorkflowRepository,
          useValue: mockWorkflowRepository,
        },
        {
          provide: FormWorkflowBindingService,
          useValue: mockBindingService,
        },
        {
          provide: FormService,
          useValue: mockFormService,
        },
        {
          provide: FlowValidatorService,
          useValue: mockFlowValidator,
        },
        {
          provide: FormReferenceValidatorService,
          useValue: mockFormReferenceValidator,
        },
        {
          provide: FlowAnalysisService,
          useValue: mockFlowAnalysisService,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
        {
          provide: PermissionBuilderService,
          useValue: mockPermissionBuilderService,
        },
      ],
    }).compile();

    service = module.get<WorkflowService>(WorkflowService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createWorkflowRevision', () => {
    it('should create a workflow revision and update tags if tags are provided', async () => {
      const workflowId = 'workflow-uuid';
      const userId = 1;
      const dto: CreateWorkflowRevisionDto = {
        name: 'New Revision',
        flow_definition: {
          version: 1,
          nodes: [
            { key: 'start', type: NodeType.START, next: 'end' },
            { key: 'end', type: NodeType.END },
          ],
        },
        tags: [1, 2],
        status: RevisionState.DRAFT,
      };

      const mockWorkflow = { id: 1, public_id: workflowId };
      const mockNewRevision = {
        id: 2,
        public_id: 'rev-uuid',
        version: 2,
        ...dto,
        state: RevisionState.DRAFT,
        created_at: new Date(),
      };

      mockBindingService.findFormIdByWorkflowPublicId.mockResolvedValue(1);
      mockWorkflowRepository.findWorkflowByPublicId.mockResolvedValue(
        mockWorkflow,
      );
      mockWorkflowRepository.createWorkflowRevision.mockResolvedValue(
        mockNewRevision,
      );

      await service.createWorkflowRevision(workflowId, dto, {
        id: userId,
      } as AuthUser);

      expect(mockWorkflowRepository.updateWorkflow).toHaveBeenCalledWith(
        mockWorkflow.id,
        mockWorkflow.public_id,
        { tags: [1, 2] },
        userId,
        expect.anything(), // tx
      );
    });

    it('should create a workflow revision and NOT update tags if tags are NOT provided', async () => {
      const workflowId = 'workflow-uuid';
      const userId = 1;
      const dto: CreateWorkflowRevisionDto = {
        name: 'New Revision',
        flow_definition: {
          version: 1,
          nodes: [
            { key: 'start', type: NodeType.START, next: 'end' },
            { key: 'end', type: NodeType.END },
          ],
        },
        // tags is undefined
        status: RevisionState.DRAFT,
      };

      const mockWorkflow = { id: 1, public_id: workflowId };
      const mockNewRevision = {
        id: 2,
        public_id: 'rev-uuid',
        version: 2,
        ...dto,
        state: RevisionState.DRAFT,
        created_at: new Date(),
      };

      mockBindingService.findFormIdByWorkflowPublicId.mockResolvedValue(1);
      mockWorkflowRepository.findWorkflowByPublicId.mockResolvedValue(
        mockWorkflow,
      );
      mockWorkflowRepository.createWorkflowRevision.mockResolvedValue(
        mockNewRevision,
      );

      await service.createWorkflowRevision(workflowId, dto, {
        id: userId,
      } as AuthUser);

      expect(mockWorkflowRepository.updateWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('listWorkflowPermissions', () => {
    it('should return aggregated workflow permissions', async () => {
      const workflowPublicId = 'workflow-uuid';
      const mockWorkflow = {
        id: 1,
        public_id: workflowPublicId,
        created_by: 1,
        permissions: [],
      };
      const mockPermissions = [
        {
          id: 201,
          grantee_type: 'EVERYONE',
          grantee_value: '',
          action: 'VIEW',
        },
        { id: 202, grantee_type: 'EVERYONE', grantee_value: '', action: 'USE' },
        {
          id: 203,
          grantee_type: 'ROLE',
          grantee_value: 'admin',
          action: 'VIEW',
        },
      ];

      mockWorkflowRepository.findWorkflowByPublicId.mockResolvedValue(
        mockWorkflow,
      );
      mockWorkflowRepository.findPermissionsByWorkflowId.mockResolvedValue(
        mockPermissions,
      );

      const result = await service.listWorkflowPermissions(workflowPublicId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        grantee_type: 'EVERYONE',
        grantee_value: '',
        workflow_id: 1,
        actions: [
          { id: 201, action: 'VIEW' },
          { id: 202, action: 'USE' },
        ],
      });
      expect(result[1]).toEqual({
        grantee_type: 'ROLE',
        grantee_value: 'admin',
        workflow_id: 1,
        actions: [{ id: 203, action: 'VIEW' }],
      });
    });
  });
});
