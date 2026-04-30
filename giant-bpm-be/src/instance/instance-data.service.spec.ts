/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { InstanceDataService } from './instance-data.service';
import { ApplicationRepository } from './repositories/application.repository';
import { ApprovalTaskRepository } from './repositories/approval-task.repository';
import { FormInstanceRepository } from './repositories/form-instance.repository';
import { WorkflowCommentRepository } from './repositories/workflow-comment.repository';
import { WorkflowInstanceRepository } from './repositories/workflow-instance.repository';
import { WorkflowNodeRepository } from './repositories/workflow-node.repository';
import { FormInstanceDataRepository } from './repositories/form-instance-data.repository';
import { WorkflowEventRepository } from './repositories/workflow-event.repository';

describe('InstanceDataService', () => {
  let service: InstanceDataService;
  let approvalTaskRepository: ApprovalTaskRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstanceDataService,
        {
          provide: ApplicationRepository,
          useValue: {},
        },
        {
          provide: ApprovalTaskRepository,
          useValue: {
            count: jest.fn(),
          },
        },
        {
          provide: FormInstanceRepository,
          useValue: {},
        },
        {
          provide: WorkflowCommentRepository,
          useValue: {},
        },
        {
          provide: WorkflowInstanceRepository,
          useValue: {},
        },
        {
          provide: WorkflowNodeRepository,
          useValue: {},
        },
        {
          provide: FormInstanceDataRepository,
          useValue: {},
        },
        {
          provide: WorkflowEventRepository,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<InstanceDataService>(InstanceDataService);
    approvalTaskRepository = module.get<ApprovalTaskRepository>(
      ApprovalTaskRepository,
    );
  });

  describe('isUserInvolvedAsApprover', () => {
    it('should return true if user is involved as approver (count > 0)', async () => {
      const instanceId = 1;
      const userId = 10;
      (approvalTaskRepository.count as jest.Mock).mockResolvedValue(1);

      const result = await service.isUserInvolvedAsApprover(instanceId, userId);

      expect(result).toBe(true);
      expect(approvalTaskRepository.count).toHaveBeenCalledWith({
        workflow_node: {
          instance_id: instanceId,
        },
        OR: [{ assignee_id: userId }, { escalated_to: userId }],
      });
    });

    it('should return false if user is NOT involved as approver (count === 0)', async () => {
      const instanceId = 1;
      const userId = 10;
      (approvalTaskRepository.count as jest.Mock).mockResolvedValue(0);

      const result = await service.isUserInvolvedAsApprover(instanceId, userId);

      expect(result).toBe(false);
    });
  });
});
