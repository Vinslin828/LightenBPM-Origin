/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from '@nestjs/testing';
import { FormService } from './form.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFormRevisionDto } from './dto/create-form-revision.dto';
import { RevisionState } from '../common/types/common.types';
import { FormRepository } from './repositories/form.repository';
import { TransactionService } from '../prisma/transaction.service';
import { FormSchemaResolverService } from '../flow-engine/expression-engine';
import { PermissionBuilderService } from '../common/permission/permission-builder.service';
import { FormExpressionValidatorService } from '../flow-engine/validation/form-expression/form-expression-validator.service';
import { FormWorkflowBindingRepository } from '../form-workflow-binding/repositories/form-workflow-binding.repository';
import { AuthUser } from 'src/auth/types/auth-user';

const mockUser: AuthUser = {
  id: 1,
  code: 'U001',
  sub: 'sub-1',
  name: 'Alice',
  email: 'alice@example.com',
  jobGrade: 5,
  defaultOrgCode: 'DEPT-1',
  orgIds: [101, 102],
  roleIds: [201, 202],
  createAt: new Date(),
  bpmRole: 'user',
};

describe('FormService', () => {
  let service: FormService;
  // let prismaService: PrismaService;

  const mockPermissionBuilderService = {
    getFormVisibilityWhere: jest.fn().mockReturnValue({}),
    canPerformAction: jest.fn().mockReturnValue(true),
  };

  const mockPrismaService = {
    form: {
      findUnique: jest.fn(),
    },
    formRevision: {
      findFirst: jest.fn(),
      create: jest.fn(),
      updateMany: jest.fn(),
    },
    formTag: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockFormRepository = {
    findAll: jest.fn(),
    findByPublicId: jest.fn(),
    findRevisionsByFormId: jest.fn(),
    findRevisionByPublicId: jest.fn(),
    deleteRevision: jest.fn(),
    softDelete: jest.fn(),
    delete: jest.fn(),
    findLatestRevision: jest.fn(),
    createRevision: jest.fn(),
    updateTags: jest.fn(),
    archiveActiveRevisions: jest.fn(),
    findActiveFormSchema: jest.fn(),
    findPermissionsByFormId: jest.fn(),
  };

  const mockTransactionService = {
    runTransaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockFormSchemaResolverService = {
    resolveFormSchema: jest.fn((schema) => Promise.resolve(schema)),
  };

  const mockFormExpressionValidatorService = {
    validateFormExpressions: jest
      .fn()
      .mockResolvedValue({ isValid: true, errors: [] }),
  };

  const mockBindingRepository = {
    findWorkflowWithRevisionByFormPublicId: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FormRepository,
          useValue: mockFormRepository,
        },
        {
          provide: TransactionService,
          useValue: mockTransactionService,
        },
        {
          provide: FormSchemaResolverService,
          useValue: mockFormSchemaResolverService,
        },
        {
          provide: PermissionBuilderService,
          useValue: mockPermissionBuilderService,
        },
        {
          provide: FormExpressionValidatorService,
          useValue: mockFormExpressionValidatorService,
        },
        {
          provide: FormWorkflowBindingRepository,
          useValue: mockBindingRepository,
        },
      ],
    }).compile();

    service = module.get<FormService>(FormService);
    // prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFormRevision', () => {
    it('should create a form revision and update tags if tags are provided', async () => {
      const formId = 'form-uuid';
      const dto: CreateFormRevisionDto = {
        name: 'New Revision',
        tags: [1, 2],
      };

      const mockForm = { id: 1, public_id: formId };
      const mockLatestRevision = {
        version: 1,
        name: 'Old Revision',
        description: 'Old Description',
        form_schema: {},
        options: { can_withdraw: true },
      };
      const mockNewRevision = {
        id: 2,
        public_id: 'rev-uuid',
        version: 2,
        ...dto,
        state: RevisionState.DRAFT,
        options: {},
        created_at: new Date(),
      };

      mockFormRepository.findByPublicId.mockResolvedValue(mockForm);
      mockFormRepository.findLatestRevision.mockResolvedValue(
        mockLatestRevision,
      );
      mockFormRepository.createRevision.mockResolvedValue(mockNewRevision);

      await service.createFormRevision(formId, dto, mockUser);

      expect(mockFormRepository.updateTags).toHaveBeenCalledWith(
        mockForm.id,
        dto.tags,
        expect.anything(),
      );
    });

    it('should create a form revision and NOT update tags if tags are NOT provided', async () => {
      const formId = 'form-uuid';
      const dto: CreateFormRevisionDto = {
        name: 'New Revision',
        // tags is undefined
      };

      const mockForm = { id: 1, public_id: formId };
      const mockLatestRevision = {
        version: 1,
        name: 'Old Revision',
        description: 'Old Description',
        form_schema: {},
        options: { can_withdraw: true },
      };
      const mockNewRevision = {
        id: 2,
        public_id: 'rev-uuid',
        version: 2,
        ...dto,
        state: RevisionState.DRAFT,
        options: {},
        created_at: new Date(),
      };

      mockFormRepository.findByPublicId.mockResolvedValue(mockForm);
      mockFormRepository.findLatestRevision.mockResolvedValue(
        mockLatestRevision,
      );
      mockFormRepository.createRevision.mockResolvedValue(mockNewRevision);

      await service.createFormRevision(formId, dto, mockUser);

      expect(mockFormRepository.updateTags).not.toHaveBeenCalled();
    });

    it('should include validation when creating a form revision', async () => {
      const formId = 'form-uuid';
      const validation = { validation: { required: true, validators: [] } };
      const dto: CreateFormRevisionDto = {
        name: 'Revision with Validation',
        validation: validation,
      };

      const mockForm = { id: 1, public_id: formId };
      const mockLatestRevision = {
        version: 1,
        name: 'Old Revision',
        description: 'Old Description',
        form_schema: {},
        fe_validation: {},
        options: { can_withdraw: true },
      };
      const mockNewRevision = {
        id: 2,
        public_id: 'rev-uuid',
        version: 2,
        ...dto,
        state: RevisionState.DRAFT,
        options: {},
        created_at: new Date(),
      };

      mockFormRepository.findByPublicId.mockResolvedValue(mockForm);
      mockFormRepository.findLatestRevision.mockResolvedValue(
        mockLatestRevision,
      );
      mockFormRepository.createRevision.mockResolvedValue(mockNewRevision);

      await service.createFormRevision(formId, dto, mockUser);

      expect(mockFormRepository.createRevision).toHaveBeenCalledWith(
        expect.objectContaining({
          fe_validation: validation,
        }),
        expect.anything(),
      );
    });
  });

  describe('findActiveFormSchema', () => {
    it('should return active form schema when found', async () => {
      const formId = 1;
      const mockSchema = { type: 'object', properties: {} };
      mockFormRepository.findActiveFormSchema.mockResolvedValue(mockSchema);

      const result = await service.findActiveFormSchema(formId);

      expect(result).toEqual(mockSchema);
      expect(mockFormRepository.findActiveFormSchema).toHaveBeenCalledWith(
        formId,
      );
    });

    it('should return null when no active form schema found', async () => {
      const formId = 1;
      mockFormRepository.findActiveFormSchema.mockResolvedValue(null);

      const result = await service.findActiveFormSchema(formId);

      expect(result).toBeNull();
      expect(mockFormRepository.findActiveFormSchema).toHaveBeenCalledWith(
        formId,
      );
    });
  });

  describe('listFormPermissions', () => {
    it('should return aggregated form permissions', async () => {
      const formPublicId = 'form-uuid';
      const mockForm = {
        id: 1,
        public_id: formPublicId,
        created_by: 1,
        permissions: [],
      };
      const mockPermissions = [
        {
          id: 101,
          grantee_type: 'EVERYONE',
          grantee_value: '',
          action: 'VIEW',
        },
        { id: 102, grantee_type: 'EVERYONE', grantee_value: '', action: 'USE' },
        { id: 103, grantee_type: 'USER', grantee_value: '700', action: 'VIEW' },
      ];

      mockFormRepository.findByPublicId.mockResolvedValue(mockForm);
      mockFormRepository.findPermissionsByFormId.mockResolvedValue(
        mockPermissions,
      );

      const result = await service.listFormPermissions(formPublicId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        grantee_type: 'EVERYONE',
        grantee_value: '',
        form_id: 1,
        actions: [
          { id: 101, action: 'VIEW' },
          { id: 102, action: 'USE' },
        ],
      });
      expect(result[1]).toEqual({
        grantee_type: 'USER',
        grantee_value: '700',
        form_id: 1,
        actions: [{ id: 103, action: 'VIEW' }],
      });
    });
  });
});
