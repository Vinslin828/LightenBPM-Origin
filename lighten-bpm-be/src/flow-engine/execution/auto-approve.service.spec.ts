/**
 * Unit Tests - AutoApproveService
 *
 * Tests for auto-approve decision logic and task execution.
 */

/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { AutoApproveService } from './auto-approve.service';
import { InstanceDataService } from '../../instance/instance-data.service';
import { ApprovalStatus } from '../../common/types/common.types';
import { ApprovalMethod, ApproverType } from '../types';

describe('AutoApproveService', () => {
  let service: AutoApproveService;
  let mockInstanceDataService: jest.Mocked<InstanceDataService>;

  beforeEach(() => {
    mockInstanceDataService = {
      updateApprovalTask: jest.fn(),
      createWorkflowComment: jest.fn(),
    } as unknown as jest.Mocked<InstanceDataService>;

    service = new AutoApproveService(mockInstanceDataService);
  });

  // ===========================================================================
  // shouldAutoApprove
  // ===========================================================================

  describe('shouldAutoApprove', () => {
    it('should return true when reuse is enabled and assignee has prior approval', () => {
      // Arrange
      const priorApprovedUsers = new Set([1, 2, 3]);

      // Act
      const result = service.shouldAutoApprove(true, 2, priorApprovedUsers);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when reuse is disabled', () => {
      // Arrange
      const priorApprovedUsers = new Set([1, 2, 3]);

      // Act
      const result = service.shouldAutoApprove(false, 2, priorApprovedUsers);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when assignee has no prior approval', () => {
      // Arrange
      const priorApprovedUsers = new Set([1, 3]);

      // Act
      const result = service.shouldAutoApprove(true, 2, priorApprovedUsers);

      // Assert
      expect(result).toBe(false);
    });

    it('should return false when reuse is disabled and assignee has no prior approval', () => {
      // Arrange
      const priorApprovedUsers = new Set<number>();

      // Act
      const result = service.shouldAutoApprove(false, 5, priorApprovedUsers);

      // Assert
      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // resolveReusePriorApprovals
  // ===========================================================================

  describe('resolveReusePriorApprovals', () => {
    it('should return configured value when approval method is SINGLE', () => {
      // Arrange
      const config = {
        approval_method: ApprovalMethod.SINGLE,
        approvers: {
          type: ApproverType.SPECIFIC_USERS,
          user_ids: [1],
          reuse_prior_approvals: false,
        },
      } as any;

      // Act
      const result = service.resolveReusePriorApprovals(config, 0);

      // Assert
      expect(result).toBe(false);
    });

    it('should default to true when SINGLE config omits reuse_prior_approvals', () => {
      // Arrange
      const config = {
        approval_method: ApprovalMethod.SINGLE,
        approvers: {
          type: ApproverType.SPECIFIC_USERS,
          user_ids: [1],
        },
      } as any;

      // Act
      const result = service.resolveReusePriorApprovals(config, 0);

      // Assert
      expect(result).toBe(true);
    });

    it('should return group-specific value when approval method is PARALLEL', () => {
      // Arrange
      const config = {
        approval_method: ApprovalMethod.PARALLEL,
        approvers: [
          {
            type: ApproverType.SPECIFIC_USERS,
            user_ids: [1],
            reuse_prior_approvals: false,
          },
          {
            type: ApproverType.SPECIFIC_USERS,
            user_ids: [2],
            reuse_prior_approvals: true,
          },
        ],
      } as any;

      // Act
      const result = service.resolveReusePriorApprovals(config, 1);

      // Assert
      expect(result).toBe(true);
    });

    it('should default to true when PARALLEL group omits reuse_prior_approvals', () => {
      // Arrange
      const config = {
        approval_method: ApprovalMethod.PARALLEL,
        approvers: [{ type: ApproverType.SPECIFIC_USERS, user_ids: [1] }],
      } as any;

      // Act
      const result = service.resolveReusePriorApprovals(config, 0);

      // Assert
      expect(result).toBe(true);
    });
  });

  // ===========================================================================
  // autoApproveTask
  // ===========================================================================

  describe('autoApproveTask', () => {
    it('should return approved task when auto-approve executes', async () => {
      // Arrange
      const approvedTask = { id: 10, status: ApprovalStatus.APPROVED };
      mockInstanceDataService.updateApprovalTask.mockResolvedValueOnce(
        approvedTask as any,
      );
      mockInstanceDataService.createWorkflowComment.mockResolvedValueOnce(
        {} as any,
      );

      // Act
      const result = await service.autoApproveTask(10, 'APP-001', 1, 999);

      // Assert
      expect(result).toEqual(approvedTask);
    });

    it('should pass transaction client when provided', async () => {
      // Arrange
      const approvedTask = { id: 10, status: ApprovalStatus.APPROVED };
      mockInstanceDataService.updateApprovalTask.mockResolvedValueOnce(
        approvedTask as any,
      );
      mockInstanceDataService.createWorkflowComment.mockResolvedValueOnce(
        {} as any,
      );
      const mockTx = {} as any;

      // Act
      await service.autoApproveTask(10, 'APP-001', 1, 999, mockTx);

      // Assert — verify tx was passed through
      expect(mockInstanceDataService.updateApprovalTask).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ status: ApprovalStatus.APPROVED }),
        mockTx,
      );
      expect(
        mockInstanceDataService.createWorkflowComment,
      ).toHaveBeenCalledWith(
        expect.objectContaining({ serial_number: 'APP-001' }),
        mockTx,
      );
    });
  });
});
