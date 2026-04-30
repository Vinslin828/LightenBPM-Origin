import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthModule } from '../auth/auth.module';
import { MigrationService } from '../migration/migration.service';
import { FeatureFlagModule } from '../common/feature-flag/feature-flag.module';

describe('WorkflowController', () => {
  let controller: WorkflowController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AuthModule, FeatureFlagModule],
      controllers: [WorkflowController],
      providers: [
        {
          provide: WorkflowService,
          useValue: {
            listWorkflows: jest.fn(),
            listWorkflowVersions: jest.fn(),
            createWorkflow: jest.fn(),
            getWorkflow: jest.fn(),
            updateWorkflow: jest.fn(),
            deleteWorkflow: jest.fn(),
          },
        },
        {
          provide: MigrationService,
          useValue: {
            exportWorkflow: jest.fn(),
          },
        },
        {
          provide: UserService,
          useValue: {
            findOne: jest.fn(),
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

    controller = module.get<WorkflowController>(WorkflowController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
