/**
 * Unit Tests - ApprovalNotificationService
 *
 * Tests for approval notification dispatch logic.
 */

/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ApprovalNotificationService } from './approval-notification.service';
import { NotificationService } from '../../notification/notification.service';
import { UserService } from '../../user/user.service';
import { InstanceStatus } from '../../common/types/common.types';
import { ApprovalContext } from '../types/approval-context.types';

describe('ApprovalNotificationService', () => {
  let service: ApprovalNotificationService;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockUserService: jest.Mocked<UserService>;

  // ---------------------------------------------------------------------------
  // Shared fixtures
  // ---------------------------------------------------------------------------

  const mockApplicant = {
    id: 2,
    name: 'Applicant',
    email: 'applicant@test.com',
  };
  const mockApprover = { id: 1, name: 'Approver', email: 'approver@test.com' };
  const mockAssignee = { id: 3, name: 'Assignee', email: 'assignee@test.com' };

  function buildContext(): ApprovalContext {
    return {
      workflowInstance: {
        id: 100,
        serial_number: 'APP-001',
        applicant_id: 2,
        status: InstanceStatus.RUNNING,
        revision: { id: 10, name: 'Test Workflow' },
      } as any,
      targetApprovalTask: {
        id: 1,
        public_id: 'task-1',
        assignee_id: 1,
        workflow_node: { id: 50 },
      } as any,
      targetWorkflowNode: { id: 50, node_key: 'approval1' } as any,
      approvalNodeConfig: {} as any,
    };
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  beforeEach(() => {
    mockNotificationService = {
      notifyApprovalTaskPending: jest.fn().mockResolvedValue(undefined),
      notifyApprovalDecision: jest.fn().mockResolvedValue(undefined),
      notifyWorkflowCompleted: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NotificationService>;

    mockUserService = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<UserService>;

    service = new ApprovalNotificationService(
      mockNotificationService,
      mockUserService,
    );
  });

  // ===========================================================================
  // notifyTaskPending
  // ===========================================================================

  describe('notifyTaskPending', () => {
    it('should not throw when assignee not found', async () => {
      // Arrange
      mockUserService.findOne.mockResolvedValueOnce(null as any);
      const task = { assignee_id: 3, public_id: 'task-1' } as any;

      // Act & Assert — should silently return, not throw
      await expect(
        service.notifyTaskPending(task, buildContext()),
      ).resolves.toBeUndefined();
    });

    it('should not throw when applicant not found', async () => {
      // Arrange
      mockUserService.findOne
        .mockResolvedValueOnce(mockAssignee as any) // assignee found
        .mockResolvedValueOnce(null as any); // applicant not found
      const task = { assignee_id: 3, public_id: 'task-1' } as any;

      // Act & Assert
      await expect(
        service.notifyTaskPending(task, buildContext()),
      ).resolves.toBeUndefined();
    });

    it('should not throw when notification service throws', async () => {
      // Arrange
      mockUserService.findOne
        .mockResolvedValueOnce(mockAssignee as any)
        .mockResolvedValueOnce(mockApplicant as any);
      mockNotificationService.notifyApprovalTaskPending.mockRejectedValueOnce(
        new Error('SNS error'),
      );
      const task = { assignee_id: 3, public_id: 'task-1' } as any;

      // Act & Assert — errors are caught internally
      await expect(
        service.notifyTaskPending(task, buildContext()),
      ).resolves.toBeUndefined();
    });
  });

  // ===========================================================================
  // notifyApprovalDecision
  // ===========================================================================

  describe('notifyApprovalDecision', () => {
    it('should not throw when approver not found', async () => {
      // Arrange
      mockUserService.findOne.mockResolvedValueOnce(null as any);

      // Act & Assert
      await expect(
        service.notifyApprovalDecision('APPROVED', 1, buildContext()),
      ).resolves.toBeUndefined();
    });

    it('should not throw when notification service throws', async () => {
      // Arrange
      mockUserService.findOne
        .mockResolvedValueOnce(mockApprover as any)
        .mockResolvedValueOnce(mockApplicant as any);
      mockNotificationService.notifyApprovalDecision.mockRejectedValueOnce(
        new Error('SNS error'),
      );

      // Act & Assert
      await expect(
        service.notifyApprovalDecision('REJECTED', 1, buildContext()),
      ).resolves.toBeUndefined();
    });
  });

  // ===========================================================================
  // notifyWorkflowCompleted
  // ===========================================================================

  describe('notifyWorkflowCompleted', () => {
    it('should not throw when applicant not found', async () => {
      // Arrange
      mockUserService.findOne.mockResolvedValueOnce(null as any);
      const instance = {
        id: 100,
        public_id: 'inst-1',
        serial_number: 'APP-001',
        applicant_id: 2,
        status: InstanceStatus.COMPLETED,
        revision: { name: 'Test Workflow' },
      } as any;

      // Act & Assert
      await expect(
        service.notifyWorkflowCompleted(instance),
      ).resolves.toBeUndefined();
    });

    it('should not throw when notification service throws', async () => {
      // Arrange
      mockUserService.findOne.mockResolvedValueOnce(mockApplicant as any);
      mockNotificationService.notifyWorkflowCompleted.mockRejectedValueOnce(
        new Error('SNS error'),
      );
      const instance = {
        id: 100,
        public_id: 'inst-1',
        serial_number: 'APP-001',
        applicant_id: 2,
        status: InstanceStatus.COMPLETED,
        revision: { name: 'Test Workflow' },
      } as any;

      // Act & Assert
      await expect(
        service.notifyWorkflowCompleted(instance),
      ).resolves.toBeUndefined();
    });
  });
});
