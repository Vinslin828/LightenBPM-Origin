/**
 * Unit Tests - RejectionHandlerService
 *
 * Tests for rejection behavior routing and execution.
 */

/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { BadRequestException } from '@nestjs/common';
import { RejectionHandlerService } from './rejection-handler.service';
import { InstanceDataService } from '../../instance/instance-data.service';
import { UserService } from '../../user/user.service';
import {
  ApprovalStatus,
  InstanceStatus,
  NodeStatus,
} from '../../common/types/common.types';
import { NodeType, RejectBehavior } from '../types';
import { ApprovalContext } from '../types/approval-context.types';

describe('RejectionHandlerService', () => {
  let service: RejectionHandlerService;
  let mockInstanceDataService: jest.Mocked<InstanceDataService>;
  let mockUserService: jest.Mocked<UserService>;
  const mockTx = {} as any;

  // ---------------------------------------------------------------------------
  // Shared fixtures
  // ---------------------------------------------------------------------------

  const systemUserId = 999;

  function buildContext(
    overrides: Partial<ApprovalContext> = {},
  ): ApprovalContext {
    return {
      workflowInstance: {
        id: 100,
        serial_number: 'APP-001',
        applicant_id: 2,
        status: InstanceStatus.RUNNING,
        current_iteration: 1,
        revision_id: 10,
        revision: {
          id: 10,
          flow_definition: {
            nodes: [
              {
                key: 'start',
                type: 'start',
                label: 'Start',
                next: ['approval1'],
              },
              {
                key: 'approval1',
                type: NodeType.APPROVAL,
                label: 'Approval 1',
                next: ['end'],
              },
            ],
          },
        },
      } as any,
      targetApprovalTask: {
        id: 1,
        public_id: 'task-1',
        assignee_id: 1,
        status: ApprovalStatus.PENDING,
        workflow_node: { id: 50, instance_id: 100, node_key: 'approval1' },
      } as any,
      targetWorkflowNode: {
        id: 50,
        instance_id: 100,
        node_key: 'approval1',
        status: NodeStatus.PENDING,
        created_at: new Date('2026-01-01'),
      } as any,
      approvalNodeConfig: {
        key: 'approval1',
        type: NodeType.APPROVAL,
        label: 'Approval 1',
        next: ['end'],
      } as any,
      ...overrides,
    };
  }

  // ---------------------------------------------------------------------------
  // Setup
  // ---------------------------------------------------------------------------

  beforeEach(() => {
    mockInstanceDataService = {
      updateApprovalTask: jest.fn(),
      updateManyApprovalTasks: jest.fn().mockResolvedValue(undefined),
      updateWorkflowNode: jest.fn().mockResolvedValue(undefined),
      updateManyWorkflowNodes: jest.fn().mockResolvedValue(undefined),
      updateWorkflowInstanceWithEvent: jest.fn().mockResolvedValue(undefined),
      findWorkflowNodeByInstanceAndKey: jest.fn(),
      findWorkflowNodesByInstanceId: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<InstanceDataService>;

    mockUserService = {
      getSystemUser: jest.fn().mockResolvedValue({ id: systemUserId }),
    } as unknown as jest.Mocked<UserService>;

    service = new RejectionHandlerService(
      mockInstanceDataService,
      mockUserService,
    );
  });

  // ===========================================================================
  // Behavior routing
  // ===========================================================================

  describe('behavior routing', () => {
    it('should default to CLOSE_APPLICATION when node has no reject_config', async () => {
      // Arrange
      const context = buildContext();

      // Act
      const result = await service.handleRejection(mockTx, context, 1);

      // Assert
      expect(result).toEqual({
        taskStatus: ApprovalStatus.REJECTED,
        nodeCompleted: true,
      });
    });

    it('should throw BadRequestException when API provides reject_behavior but node has no reject_config', async () => {
      // Arrange
      const context = buildContext();

      // Act & Assert
      await expect(
        service.handleRejection(
          mockTx,
          context,
          1,
          RejectBehavior.RETURN_TO_APPLICANT,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should use node config behavior when node has specific reject_config', async () => {
      // Arrange
      const context = buildContext({
        approvalNodeConfig: {
          key: 'approval1',
          type: NodeType.APPROVAL,
          label: 'Approval 1',
          next: ['end'],
          reject_config: { behavior: RejectBehavior.RETURN_TO_APPLICANT },
        } as any,
      });

      // Act
      const result = await service.handleRejection(mockTx, context, 1);

      // Assert
      expect(result).toEqual({
        taskStatus: ApprovalStatus.REJECTED,
        nodeCompleted: true,
      });
    });

    it('should throw BadRequestException when USER_SELECT but no API reject_behavior', async () => {
      // Arrange
      const context = buildContext({
        approvalNodeConfig: {
          key: 'approval1',
          type: NodeType.APPROVAL,
          label: 'Approval 1',
          next: ['end'],
          reject_config: { behavior: RejectBehavior.USER_SELECT },
        } as any,
      });

      // Act & Assert
      await expect(service.handleRejection(mockTx, context, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should use API reject_behavior when node config is USER_SELECT', async () => {
      // Arrange
      const context = buildContext({
        approvalNodeConfig: {
          key: 'approval1',
          type: NodeType.APPROVAL,
          label: 'Approval 1',
          next: ['end'],
          reject_config: { behavior: RejectBehavior.USER_SELECT },
        } as any,
      });

      // Act
      const result = await service.handleRejection(
        mockTx,
        context,
        1,
        RejectBehavior.CLOSE_APPLICATION,
      );

      // Assert
      expect(result).toEqual({
        taskStatus: ApprovalStatus.REJECTED,
        nodeCompleted: true,
      });
    });

    it('should throw BadRequestException when USER_SELECT selects SEND_TO_SPECIFIC_NODE without target_node_key', async () => {
      // Arrange
      const context = buildContext({
        approvalNodeConfig: {
          key: 'approval1',
          type: NodeType.APPROVAL,
          label: 'Approval 1',
          next: ['end'],
          reject_config: { behavior: RejectBehavior.USER_SELECT },
        } as any,
      });

      // Act & Assert
      await expect(
        service.handleRejection(
          mockTx,
          context,
          1,
          RejectBehavior.SEND_TO_SPECIFIC_NODE,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ===========================================================================
  // CLOSE_APPLICATION
  // ===========================================================================

  describe('handleCloseApplication', () => {
    it('should return REJECTED status when closing application', async () => {
      // Arrange
      const context = buildContext();

      // Act
      const result = await service.handleRejection(mockTx, context, 1);

      // Assert
      expect(result.taskStatus).toBe(ApprovalStatus.REJECTED);
      expect(result.nodeCompleted).toBe(true);
    });
  });

  // ===========================================================================
  // RETURN_TO_APPLICANT
  // ===========================================================================

  describe('handleReturnToApplicant', () => {
    it('should return REJECTED status when returning to applicant', async () => {
      // Arrange
      const context = buildContext({
        approvalNodeConfig: {
          key: 'approval1',
          type: NodeType.APPROVAL,
          label: 'Approval 1',
          next: ['end'],
          reject_config: { behavior: RejectBehavior.RETURN_TO_APPLICANT },
        } as any,
      });

      // Act
      const result = await service.handleRejection(mockTx, context, 1);

      // Assert
      expect(result.taskStatus).toBe(ApprovalStatus.REJECTED);
      expect(result.nodeCompleted).toBe(true);
    });
  });

  // ===========================================================================
  // SEND_TO_SPECIFIC_NODE
  // ===========================================================================

  describe('handleSendToSpecificNode', () => {
    it('should return resumeFromNodeKey when sending to specific node', async () => {
      // Arrange
      const context = buildContext({
        approvalNodeConfig: {
          key: 'approval1',
          type: NodeType.APPROVAL,
          label: 'Approval 1',
          next: ['end'],
          reject_config: {
            behavior: RejectBehavior.SEND_TO_SPECIFIC_NODE,
            target_node_key: 'start',
          },
        } as any,
      });

      // Act
      const result = await service.handleRejection(mockTx, context, 1);

      // Assert
      expect(result.taskStatus).toBe(ApprovalStatus.REJECTED);
      expect(result.nodeCompleted).toBe(true);
      expect(result.resumeFromNodeKey).toBe('start');
    });

    it('should throw BadRequestException when target node not found in flow definition', async () => {
      // Arrange
      const context = buildContext({
        approvalNodeConfig: {
          key: 'approval1',
          type: NodeType.APPROVAL,
          label: 'Approval 1',
          next: ['end'],
          reject_config: {
            behavior: RejectBehavior.SEND_TO_SPECIFIC_NODE,
            target_node_key: 'nonexistent',
          },
        } as any,
      });

      // Act & Assert
      await expect(service.handleRejection(mockTx, context, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when target approval node has not been executed', async () => {
      // Arrange
      const flowDef = {
        nodes: [
          { key: 'start', type: 'start', label: 'Start', next: ['approval1'] },
          {
            key: 'approval1',
            type: NodeType.APPROVAL,
            label: 'Approval 1',
            next: ['approval2'],
          },
          {
            key: 'approval2',
            type: NodeType.APPROVAL,
            label: 'Approval 2',
            next: ['end'],
          },
        ],
      };
      const context = buildContext({
        workflowInstance: {
          id: 100,
          serial_number: 'APP-001',
          applicant_id: 2,
          status: InstanceStatus.RUNNING,
          current_iteration: 1,
          revision_id: 10,
          revision: { id: 10, flow_definition: flowDef },
        } as any,
        approvalNodeConfig: {
          key: 'approval2',
          type: NodeType.APPROVAL,
          label: 'Approval 2',
          next: ['end'],
          reject_config: {
            behavior: RejectBehavior.SEND_TO_SPECIFIC_NODE,
            target_node_key: 'approval1',
          },
        } as any,
      });
      mockInstanceDataService.findWorkflowNodeByInstanceAndKey.mockResolvedValueOnce(
        null,
      );

      // Act & Assert
      await expect(service.handleRejection(mockTx, context, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ===========================================================================
  // BACK_TO_PREVIOUS_NODE
  // ===========================================================================

  describe('handleBackToPreviousNode', () => {
    it('should throw BadRequestException when no previous node exists', async () => {
      // Arrange — start node has no predecessors
      const flowDef = {
        nodes: [
          {
            key: 'approval1',
            type: NodeType.APPROVAL,
            label: 'Approval 1',
            next: ['end'],
          },
        ],
      };
      const context = buildContext({
        workflowInstance: {
          id: 100,
          serial_number: 'APP-001',
          applicant_id: 2,
          status: InstanceStatus.RUNNING,
          current_iteration: 1,
          revision_id: 10,
          revision: { id: 10, flow_definition: flowDef },
        } as any,
        approvalNodeConfig: {
          key: 'approval1',
          type: NodeType.APPROVAL,
          label: 'Approval 1',
          next: ['end'],
          reject_config: { behavior: RejectBehavior.BACK_TO_PREVIOUS_NODE },
        } as any,
      });

      // Act & Assert
      await expect(service.handleRejection(mockTx, context, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when previous node has not been executed', async () => {
      // Arrange
      const context = buildContext({
        approvalNodeConfig: {
          key: 'approval1',
          type: NodeType.APPROVAL,
          label: 'Approval 1',
          next: ['end'],
          reject_config: { behavior: RejectBehavior.BACK_TO_PREVIOUS_NODE },
        } as any,
      });
      // start points to approval1, but no completed nodes found
      mockInstanceDataService.findWorkflowNodesByInstanceId.mockResolvedValueOnce(
        [],
      );

      // Act & Assert
      await expect(service.handleRejection(mockTx, context, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
