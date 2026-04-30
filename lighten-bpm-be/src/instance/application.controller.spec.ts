import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationController } from './application.controller';
import { ApplicationService } from './application.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { ListApplicationsQueryDto } from './dto/list-applications-query.dto';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { AuthUser } from '../auth/types/auth-user';
import { WorkflowEngineService } from '../flow-engine/workflow-engine.service';
import { FormWorkflowBindingService } from '../form-workflow-binding/form-workflow-binding.service';
import { FormDataValidatorService } from '../flow-engine/validation/form-data/form-data-validator.service';
import { ValidationExecutorService } from '../flow-engine/expression-engine/services/validation-executor.service';
import { TransactionService } from '../prisma/transaction.service';
import { AttachmentService } from '../attachment/attachment.service';
import { FeatureFlagModule } from '../common/feature-flag/feature-flag.module';

describe('ApplicationController', () => {
  let controller: ApplicationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, FeatureFlagModule],
      controllers: [ApplicationController],
      providers: [
        {
          provide: ApplicationService,
          useValue: {
            listAvailableApplications: jest
              .fn()
              .mockResolvedValue({ items: [], total: 0 }),
            listApplications: jest
              .fn()
              .mockResolvedValue({ items: [], total: 0 }),
            checkDuplicate: jest.fn(),
          },
        },
        {
          provide: WorkflowEngineService,
          useValue: {
            createInstance: jest.fn(),
            submit: jest.fn(),
            withdrawApplicationInstance: jest.fn(),
            forceDeleteApplicationInstance: jest.fn(),
            updateApproval: jest.fn(),
            restartWorkflow: jest.fn(),
          },
        },
        {
          provide: FormWorkflowBindingService,
          useValue: {
            getBinding: jest.fn(),
          },
        },
        {
          provide: FormDataValidatorService,
          useValue: {
            validateAndCoerceFormData: jest.fn(),
          },
        },
        {
          provide: ValidationExecutorService,
          useValue: {
            execute: jest.fn().mockResolvedValue({
              isValid: true,
              errors: [],
            }),
          },
        },
        {
          provide: TransactionService,
          useValue: {
            runTransaction: jest.fn((cb: () => unknown) => cb()),
          },
        },
        {
          provide: AttachmentService,
          useValue: {
            bindDraftAttachments: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<ApplicationController>(ApplicationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listAvailableApplications', () => {
    it('should return a paginated response', async () => {
      const user = {
        id: 1,
        sub: 'test',
        email: 'test@example.com',
      } as AuthUser;
      const query: PaginationQueryDto = {};

      const result = await controller.listAvailableApplications(user, query);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
      expect(result.page).toBe(1); // Default page
      expect(result.limit).toBe(10); // Default limit
    });
  });

  describe('listApplications', () => {
    it('should return a paginated response', async () => {
      const user = {
        id: 1,
        sub: 'test',
        email: 'test@example.com',
      } as AuthUser;
      const query: ListApplicationsQueryDto = {};

      const result = await controller.listApplications(user, query);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('totalPages');
      expect(result.page).toBe(1); // Default page
      expect(result.limit).toBe(10); // Default limit
    });
  });
});
