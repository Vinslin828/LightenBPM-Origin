/**
 * Unit Tests - AttachmentService
 *
 * authorizeUpload, assertUploadContextActive and node_description handling
 * tested through the public methods that use them (presignUpload,
 * confirmUpload, listAttachments, updateRemark, deleteAttachment).
 */

/* eslint-disable @typescript-eslint/unbound-method */
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApprovalStatus } from '@prisma/client';
import { AttachmentService } from './attachment.service';
import { AttachmentRepository } from './repositories/attachment.repository';
import { S3Service } from './s3.service';
import { WorkflowInstanceRepository } from '../instance/repositories/workflow-instance.repository';
import { ApprovalTaskRepository } from '../instance/repositories/approval-task.repository';
import { TransactionService } from '../prisma/transaction.service';
import { PermissionBuilderService } from '../common/permission/permission-builder.service';
import { InstanceStatus } from '../common/types/common.types';
import { NodeType, ApprovalMethod, ApproverType } from '../flow-engine/types';

const APPLICANT_ID = 100;
const APPROVER_ID = 200;
const OTHER_ID = 999;
const TASK_PUBLIC_ID = 'task-uuid-1';
const TASK_INTERNAL_ID = 11;

type InstanceWithRevision = NonNullable<
  Awaited<
    ReturnType<WorkflowInstanceRepository['findBySerialNumberWithRevision']>
  >
>;

function buildInstance(opts: {
  status: InstanceStatus;
  componentRules?: {
    start?: Array<{ component_name: string; actions: string[] }>;
    approval?: Array<{ component_name: string; actions: string[] }>;
  };
  startDescription?: string;
  approvalDescription?: string;
}): InstanceWithRevision {
  return {
    id: 1,
    serial_number: 'SN-2026-0001',
    applicant_id: APPLICANT_ID,
    submitter_id: APPLICANT_ID,
    status: opts.status,
    revision: {
      flow_definition: {
        version: 1,
        nodes: [
          {
            key: 'start',
            type: NodeType.START,
            next: 'approval',
            description: opts.startDescription,
            component_rules: opts.componentRules?.start ?? [],
          },
          {
            key: 'approval',
            type: NodeType.APPROVAL,
            next: 'end',
            approval_method: ApprovalMethod.SINGLE,
            approvers: {
              type: ApproverType.SPECIFIC_USERS,
              config: { user_ids: [APPROVER_ID] },
              description: opts.approvalDescription,
              component_rules: opts.componentRules?.approval ?? [],
            },
          },
          { key: 'end', type: NodeType.END },
        ],
      },
    },
  } as unknown as InstanceWithRevision;
}

function buildPendingTask(
  overrides: Partial<{
    status: ApprovalStatus;
    assignee_id: number;
    escalated_to: number | null;
  }> = {},
) {
  return {
    id: TASK_INTERNAL_ID,
    public_id: TASK_PUBLIC_ID,
    workflow_node_id: 7,
    approver_group_index: 0,
    assignee_id: overrides.assignee_id ?? APPROVER_ID,
    escalated_to: overrides.escalated_to ?? null,
    status: overrides.status ?? ApprovalStatus.PENDING,
    workflow_node: {
      instance_id: 1,
      node_key: 'approval',
    },
  };
}

describe('AttachmentService - authorizeUpload (via presignUpload)', () => {
  let service: AttachmentService;
  let attachmentRepo: jest.Mocked<AttachmentRepository>;
  let s3Service: jest.Mocked<S3Service>;
  let workflowInstanceRepo: jest.Mocked<WorkflowInstanceRepository>;
  let approvalTaskRepo: jest.Mocked<ApprovalTaskRepository>;

  beforeEach(() => {
    attachmentRepo = {
      create: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<AttachmentRepository>;

    s3Service = {
      generatePresignedUploadUrl: jest
        .fn()
        .mockResolvedValue('https://s3.example/upload'),
      presignExpiry: 600,
    } as unknown as jest.Mocked<S3Service>;

    workflowInstanceRepo = {
      findBySerialNumberWithRevision: jest.fn(),
    } as unknown as jest.Mocked<WorkflowInstanceRepository>;

    approvalTaskRepo = {
      findByPublicIdWithNode: jest.fn(),
    } as unknown as jest.Mocked<ApprovalTaskRepository>;

    service = new AttachmentService(
      attachmentRepo,
      s3Service,
      workflowInstanceRepo,
      approvalTaskRepo,
      {} as TransactionService,
      {} as PermissionBuilderService,
    );
  });

  // ===========================================================================
  // Approver path (approval_task_id provided)
  // ===========================================================================

  describe('approver path with approval_task_id', () => {
    it('should stamp approval_task_id when task is PENDING, owned by user, and field is editable', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        buildInstance({
          status: InstanceStatus.RUNNING,
          componentRules: {
            approval: [{ component_name: 'attach_b', actions: ['editable'] }],
          },
        }),
      );
      approvalTaskRepo.findByPublicIdWithNode.mockResolvedValueOnce(
        buildPendingTask() as never,
      );

      // Act
      await service.presignUpload('SN-2026-0001', APPROVER_ID, 'usr-b', {
        field_key: 'attach_b',
        file_name: 'r.pdf',
        file_size: 200,
        content_type: 'application/pdf',
        approval_task_id: TASK_PUBLIC_ID,
      });

      // Assert
      const created = attachmentRepo.create.mock.calls[0][0];
      expect(created.approval_task_id).toBe(TASK_INTERNAL_ID);
    });

    it('should accept upload when task is escalated to user', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        buildInstance({
          status: InstanceStatus.RUNNING,
          componentRules: {
            approval: [{ component_name: 'attach_b', actions: ['editable'] }],
          },
        }),
      );
      approvalTaskRepo.findByPublicIdWithNode.mockResolvedValueOnce(
        buildPendingTask({
          assignee_id: OTHER_ID,
          escalated_to: APPROVER_ID,
        }) as never,
      );

      // Act
      await service.presignUpload('SN-2026-0001', APPROVER_ID, 'usr-b', {
        field_key: 'attach_b',
        file_name: 'r.pdf',
        file_size: 200,
        content_type: 'application/pdf',
        approval_task_id: TASK_PUBLIC_ID,
      });

      // Assert
      const created = attachmentRepo.create.mock.calls[0][0];
      expect(created.approval_task_id).toBe(TASK_INTERNAL_ID);
    });

    it('should throw NotFoundException when approval_task_id does not exist', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        buildInstance({ status: InstanceStatus.RUNNING }),
      );
      approvalTaskRepo.findByPublicIdWithNode.mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        service.presignUpload('SN-2026-0001', APPROVER_ID, 'usr-b', {
          field_key: 'attach_b',
          file_name: 'r.pdf',
          file_size: 200,
          content_type: 'application/pdf',
          approval_task_id: TASK_PUBLIC_ID,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when task belongs to a different instance', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        buildInstance({ status: InstanceStatus.RUNNING }),
      );
      const wrongTask = buildPendingTask();
      wrongTask.workflow_node.instance_id = 999;
      approvalTaskRepo.findByPublicIdWithNode.mockResolvedValueOnce(
        wrongTask as never,
      );

      // Act & Assert
      await expect(
        service.presignUpload('SN-2026-0001', APPROVER_ID, 'usr-b', {
          field_key: 'attach_b',
          file_name: 'r.pdf',
          file_size: 200,
          content_type: 'application/pdf',
          approval_task_id: TASK_PUBLIC_ID,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when task is not owned by user', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        buildInstance({ status: InstanceStatus.RUNNING }),
      );
      approvalTaskRepo.findByPublicIdWithNode.mockResolvedValueOnce(
        buildPendingTask({ assignee_id: OTHER_ID }) as never,
      );

      // Act & Assert
      await expect(
        service.presignUpload('SN-2026-0001', APPROVER_ID, 'usr-b', {
          field_key: 'attach_b',
          file_name: 'r.pdf',
          file_size: 200,
          content_type: 'application/pdf',
          approval_task_id: TASK_PUBLIC_ID,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when task is no longer PENDING', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        buildInstance({ status: InstanceStatus.RUNNING }),
      );
      approvalTaskRepo.findByPublicIdWithNode.mockResolvedValueOnce(
        buildPendingTask({ status: ApprovalStatus.APPROVED }) as never,
      );

      // Act & Assert
      await expect(
        service.presignUpload('SN-2026-0001', APPROVER_ID, 'usr-b', {
          field_key: 'attach_b',
          file_name: 'r.pdf',
          file_size: 200,
          content_type: 'application/pdf',
          approval_task_id: TASK_PUBLIC_ID,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when field is not editable for the task', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        buildInstance({
          status: InstanceStatus.RUNNING,
          componentRules: {
            approval: [{ component_name: 'other', actions: ['editable'] }],
          },
        }),
      );
      approvalTaskRepo.findByPublicIdWithNode.mockResolvedValueOnce(
        buildPendingTask() as never,
      );

      // Act & Assert
      await expect(
        service.presignUpload('SN-2026-0001', APPROVER_ID, 'usr-b', {
          field_key: 'attach_b',
          file_name: 'r.pdf',
          file_size: 200,
          content_type: 'application/pdf',
          approval_task_id: TASK_PUBLIC_ID,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ===========================================================================
  // Applicant path (no approval_task_id)
  // ===========================================================================

  describe('applicant path without approval_task_id', () => {
    it('should stamp approval_task_id null when applicant uploads editable field in DRAFT', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        buildInstance({
          status: InstanceStatus.DRAFT,
          componentRules: {
            start: [{ component_name: 'attach_a', actions: ['editable'] }],
          },
        }),
      );

      // Act
      await service.presignUpload('SN-2026-0001', APPLICANT_ID, 'usr-a', {
        field_key: 'attach_a',
        file_name: 'x.pdf',
        file_size: 100,
        content_type: 'application/pdf',
      });

      // Assert
      const created = attachmentRepo.create.mock.calls[0][0];
      expect(created.approval_task_id).toBeNull();
    });

    it('should throw ForbiddenException when applicant uploads non-editable field in DRAFT', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        buildInstance({
          status: InstanceStatus.DRAFT,
          componentRules: {
            start: [{ component_name: 'other', actions: ['editable'] }],
          },
        }),
      );

      // Act & Assert
      await expect(
        service.presignUpload('SN-2026-0001', APPLICANT_ID, 'usr-a', {
          field_key: 'attach_a',
          file_name: 'x.pdf',
          file_size: 100,
          content_type: 'application/pdf',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when applicant tries to upload in RUNNING', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        buildInstance({
          status: InstanceStatus.RUNNING,
          componentRules: {
            start: [{ component_name: 'attach_a', actions: ['editable'] }],
          },
        }),
      );

      // Act & Assert
      await expect(
        service.presignUpload('SN-2026-0001', APPLICANT_ID, 'usr-a', {
          field_key: 'attach_a',
          file_name: 'x.pdf',
          file_size: 100,
          content_type: 'application/pdf',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when non-applicant uploads without approval_task_id', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        buildInstance({ status: InstanceStatus.DRAFT }),
      );

      // Act & Assert
      await expect(
        service.presignUpload('SN-2026-0001', OTHER_ID, 'usr-x', {
          field_key: 'attach_a',
          file_name: 'x.pdf',
          file_size: 100,
          content_type: 'application/pdf',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when application does not exist', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        null,
      );

      // Act & Assert
      await expect(
        service.presignUpload('SN-MISSING', APPLICANT_ID, 'usr-a', {
          field_key: 'attach_a',
          file_name: 'x.pdf',
          file_size: 100,
          content_type: 'application/pdf',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

describe('AttachmentService - response includes node_description', () => {
  let service: AttachmentService;
  let attachmentRepo: jest.Mocked<AttachmentRepository>;
  let s3Service: jest.Mocked<S3Service>;
  let workflowInstanceRepo: jest.Mocked<WorkflowInstanceRepository>;

  beforeEach(() => {
    attachmentRepo = {
      findByS3Key: jest.fn(),
      findBySerialNumberAndField: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    } as unknown as jest.Mocked<AttachmentRepository>;

    s3Service = {
      objectExists: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<S3Service>;

    workflowInstanceRepo = {
      findBySerialNumberWithRevision: jest.fn().mockResolvedValue(
        buildInstance({
          status: InstanceStatus.RUNNING,
          startDescription: 'Submit your request',
          approvalDescription: 'Manager review',
        }),
      ),
      findBySerialNumber: jest.fn().mockResolvedValue({
        id: 1,
        serial_number: 'SN-2026-0001',
        applicant_id: APPLICANT_ID,
      }),
    } as unknown as jest.Mocked<WorkflowInstanceRepository>;

    service = new AttachmentService(
      attachmentRepo,
      s3Service,
      workflowInstanceRepo,
      {} as ApprovalTaskRepository,
      {} as TransactionService,
      {
        getInstanceVisibilityWhere: jest.fn().mockReturnValue({}),
      } as unknown as PermissionBuilderService,
    );
  });

  it('should set node_description to start node and approval_task_id to null for applicant attachment', async () => {
    // Arrange
    attachmentRepo.findByS3Key.mockResolvedValueOnce({
      id: 5,
      serial_number: 'SN-2026-0001',
      uploaded_by: APPLICANT_ID,
    } as never);
    attachmentRepo.update.mockResolvedValueOnce({
      id: 5,
      field_key: 'attach_a',
      file_name: 'x.pdf',
      file_size: 100,
      content_type: 'application/pdf',
      status: 'UPLOADED',
      serial_number: 'SN-2026-0001',
      draft_id: null,
      remark: null,
      uploader: { id: APPLICANT_ID, name: 'Alice' },
      approval_task: null,
      created_at: new Date(),
    } as never);

    // Act
    const result = await service.confirmUpload('SN-2026-0001', APPLICANT_ID, {
      s3_key: 's3://x',
    } as never);

    // Assert
    expect(result.node_description).toBe('Submit your request');
    expect(result.approval_task_id).toBeNull();
  });

  it('should set node_description to approval node and approval_task_id to public_id for approver attachment', async () => {
    // Arrange
    attachmentRepo.findByS3Key.mockResolvedValueOnce({
      id: 6,
      serial_number: 'SN-2026-0001',
      uploaded_by: APPLICANT_ID,
    } as never);
    attachmentRepo.update.mockResolvedValueOnce({
      id: 6,
      field_key: 'attach_b',
      file_name: 'r.pdf',
      file_size: 200,
      content_type: 'application/pdf',
      status: 'UPLOADED',
      serial_number: 'SN-2026-0001',
      draft_id: null,
      remark: null,
      uploader: { id: APPLICANT_ID, name: 'Alice' },
      approval_task: {
        public_id: TASK_PUBLIC_ID,
        approver_group_index: 0,
        workflow_node: { node_key: 'approval' },
      },
      created_at: new Date(),
    } as never);

    // Act
    const result = await service.confirmUpload('SN-2026-0001', APPLICANT_ID, {
      s3_key: 's3://x',
    } as never);

    // Assert
    expect(result.node_description).toBe('Manager review');
    expect(result.approval_task_id).toBe(TASK_PUBLIC_ID);
  });

  it('should populate node_description and approval_task_id per record in listAttachments', async () => {
    // Arrange
    attachmentRepo.findBySerialNumberAndField.mockResolvedValueOnce([
      {
        id: 1,
        field_key: 'attach_a',
        file_name: 'a.pdf',
        file_size: 100,
        content_type: 'application/pdf',
        status: 'UPLOADED',
        serial_number: 'SN-2026-0001',
        draft_id: null,
        remark: null,
        uploader: { id: APPLICANT_ID, name: 'Alice' },
        approval_task: null,
        created_at: new Date(),
      },
      {
        id: 2,
        field_key: 'attach_b',
        file_name: 'b.pdf',
        file_size: 200,
        content_type: 'application/pdf',
        status: 'UPLOADED',
        serial_number: 'SN-2026-0001',
        draft_id: null,
        remark: null,
        uploader: { id: APPLICANT_ID, name: 'Alice' },
        approval_task: {
          public_id: TASK_PUBLIC_ID,
          workflow_node: { node_key: 'approval' },
        },
        created_at: new Date(),
      },
    ] as never);

    // Act
    const result = await service.listAttachments('SN-2026-0001', {
      id: APPLICANT_ID,
    } as never);

    // Assert
    expect(result.map((r) => r.node_description)).toEqual([
      'Submit your request',
      'Manager review',
    ]);
    expect(result.map((r) => r.approval_task_id)).toEqual([
      null,
      TASK_PUBLIC_ID,
    ]);
  });
});

describe('AttachmentService - updateRemark / deleteAttachment authorization', () => {
  let service: AttachmentService;
  let attachmentRepo: jest.Mocked<AttachmentRepository>;
  let s3Service: jest.Mocked<S3Service>;
  let workflowInstanceRepo: jest.Mocked<WorkflowInstanceRepository>;
  let approvalTaskRepo: jest.Mocked<ApprovalTaskRepository>;
  let transactionService: jest.Mocked<TransactionService>;

  const UPLOADER_ID = 300;

  beforeEach(() => {
    attachmentRepo = {
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<AttachmentRepository>;

    s3Service = {
      deleteObject: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<S3Service>;

    workflowInstanceRepo = {
      findBySerialNumber: jest.fn(),
      findBySerialNumberWithRevision: jest.fn(),
    } as unknown as jest.Mocked<WorkflowInstanceRepository>;

    approvalTaskRepo = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<ApprovalTaskRepository>;

    transactionService = {
      runTransaction: jest
        .fn()
        .mockImplementation(async (cb: (tx: unknown) => Promise<unknown>) =>
          cb({}),
        ),
    } as unknown as jest.Mocked<TransactionService>;

    service = new AttachmentService(
      attachmentRepo,
      s3Service,
      workflowInstanceRepo,
      approvalTaskRepo,
      transactionService,
      {} as PermissionBuilderService,
    );
  });

  function bareInstance(status: InstanceStatus) {
    return {
      id: 1,
      serial_number: 'SN-2026-0001',
      status,
    } as unknown as Awaited<
      ReturnType<WorkflowInstanceRepository['findBySerialNumber']>
    >;
  }

  function instanceWithRevision(status: InstanceStatus) {
    return {
      id: 1,
      serial_number: 'SN-2026-0001',
      status,
      revision: {
        flow_definition: {
          version: 1,
          nodes: [
            { key: 'start', type: NodeType.START, next: 'end' },
            { key: 'end', type: NodeType.END },
          ],
        },
      },
    } as unknown as Awaited<
      ReturnType<WorkflowInstanceRepository['findBySerialNumberWithRevision']>
    >;
  }

  function attachmentRecord(opts: {
    approval_task_id: number | null;
    uploaded_by?: number;
  }) {
    return {
      id: 5,
      serial_number: 'SN-2026-0001',
      uploaded_by: opts.uploaded_by ?? UPLOADER_ID,
      approval_task_id: opts.approval_task_id,
      s3_key: 's3://x',
    };
  }

  // ===========================================================================
  // updateRemark
  // ===========================================================================

  describe('updateRemark', () => {
    it('should allow update when applicant uploader modifies their attachment in DRAFT', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        instanceWithRevision(InstanceStatus.DRAFT),
      );
      attachmentRepo.findById.mockResolvedValueOnce(
        attachmentRecord({ approval_task_id: null }) as never,
      );
      attachmentRepo.update.mockResolvedValueOnce({
        id: 5,
        field_key: 'attach_a',
        file_name: 'a.pdf',
        file_size: 100,
        content_type: 'application/pdf',
        status: 'UPLOADED',
        serial_number: 'SN-2026-0001',
        draft_id: null,
        remark: 'updated',
        uploader: { id: UPLOADER_ID, name: 'U' },
        approval_task: null,
        created_at: new Date(),
      } as never);

      // Act
      const result = await service.updateRemark(
        'SN-2026-0001',
        UPLOADER_ID,
        5,
        { remark: 'updated' } as never,
      );

      // Assert
      expect(result.remark).toBe('updated');
    });

    it('should reject when caller is not the uploader', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        instanceWithRevision(InstanceStatus.DRAFT),
      );
      attachmentRepo.findById.mockResolvedValueOnce(
        attachmentRecord({ approval_task_id: null }) as never,
      );

      // Act & Assert
      await expect(
        service.updateRemark('SN-2026-0001', OTHER_ID, 5, {
          remark: 'x',
        } as never),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject when applicant attachment is no longer in DRAFT', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        instanceWithRevision(InstanceStatus.RUNNING),
      );
      attachmentRepo.findById.mockResolvedValueOnce(
        attachmentRecord({ approval_task_id: null }) as never,
      );

      // Act & Assert
      await expect(
        service.updateRemark('SN-2026-0001', UPLOADER_ID, 5, {
          remark: 'x',
        } as never),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow when approver uploader and original task is still PENDING and owned', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        instanceWithRevision(InstanceStatus.RUNNING),
      );
      attachmentRepo.findById.mockResolvedValueOnce(
        attachmentRecord({ approval_task_id: TASK_INTERNAL_ID }) as never,
      );
      approvalTaskRepo.findById.mockResolvedValueOnce({
        id: TASK_INTERNAL_ID,
        status: ApprovalStatus.PENDING,
        assignee_id: UPLOADER_ID,
        escalated_to: null,
      } as never);
      attachmentRepo.update.mockResolvedValueOnce({
        id: 5,
        field_key: 'attach_b',
        file_name: 'b.pdf',
        file_size: 100,
        content_type: 'application/pdf',
        status: 'UPLOADED',
        serial_number: 'SN-2026-0001',
        draft_id: null,
        remark: 'updated',
        uploader: { id: UPLOADER_ID, name: 'U' },
        approval_task: null,
        created_at: new Date(),
      } as never);

      // Act
      const result = await service.updateRemark(
        'SN-2026-0001',
        UPLOADER_ID,
        5,
        { remark: 'updated' } as never,
      );

      // Assert
      expect(result.remark).toBe('updated');
    });

    it('should reject when original approver task is no longer PENDING', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        instanceWithRevision(InstanceStatus.RUNNING),
      );
      attachmentRepo.findById.mockResolvedValueOnce(
        attachmentRecord({ approval_task_id: TASK_INTERNAL_ID }) as never,
      );
      approvalTaskRepo.findById.mockResolvedValueOnce({
        id: TASK_INTERNAL_ID,
        status: ApprovalStatus.APPROVED,
        assignee_id: UPLOADER_ID,
        escalated_to: null,
      } as never);

      // Act & Assert
      await expect(
        service.updateRemark('SN-2026-0001', UPLOADER_ID, 5, {
          remark: 'x',
        } as never),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject when original approver task was reassigned away from uploader', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumberWithRevision.mockResolvedValueOnce(
        instanceWithRevision(InstanceStatus.RUNNING),
      );
      attachmentRepo.findById.mockResolvedValueOnce(
        attachmentRecord({ approval_task_id: TASK_INTERNAL_ID }) as never,
      );
      approvalTaskRepo.findById.mockResolvedValueOnce({
        id: TASK_INTERNAL_ID,
        status: ApprovalStatus.PENDING,
        assignee_id: OTHER_ID,
        escalated_to: null,
      } as never);

      // Act & Assert
      await expect(
        service.updateRemark('SN-2026-0001', UPLOADER_ID, 5, {
          remark: 'x',
        } as never),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ===========================================================================
  // deleteAttachment
  // ===========================================================================

  describe('deleteAttachment', () => {
    it('should delete from DB and S3 when applicant uploader deletes in DRAFT', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumber.mockResolvedValueOnce(
        bareInstance(InstanceStatus.DRAFT),
      );
      attachmentRepo.findById.mockResolvedValueOnce(
        attachmentRecord({ approval_task_id: null }) as never,
      );

      // Act
      await service.deleteAttachment('SN-2026-0001', UPLOADER_ID, 5);

      // Assert
      expect(attachmentRepo.delete).toHaveBeenCalledWith(5, expect.anything());
      expect(s3Service.deleteObject).toHaveBeenCalledWith('s3://x');
    });

    it('should reject when caller is not the uploader', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumber.mockResolvedValueOnce(
        bareInstance(InstanceStatus.DRAFT),
      );
      attachmentRepo.findById.mockResolvedValueOnce(
        attachmentRecord({ approval_task_id: null }) as never,
      );

      // Act & Assert
      await expect(
        service.deleteAttachment('SN-2026-0001', OTHER_ID, 5),
      ).rejects.toThrow(ForbiddenException);
      expect(attachmentRepo.delete).not.toHaveBeenCalled();
    });

    it('should reject when applicant attachment is no longer in DRAFT', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumber.mockResolvedValueOnce(
        bareInstance(InstanceStatus.RUNNING),
      );
      attachmentRepo.findById.mockResolvedValueOnce(
        attachmentRecord({ approval_task_id: null }) as never,
      );

      // Act & Assert
      await expect(
        service.deleteAttachment('SN-2026-0001', UPLOADER_ID, 5),
      ).rejects.toThrow(ForbiddenException);
      expect(attachmentRepo.delete).not.toHaveBeenCalled();
    });

    it('should allow when approver uploader and original task still PENDING and owned', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumber.mockResolvedValueOnce(
        bareInstance(InstanceStatus.RUNNING),
      );
      attachmentRepo.findById.mockResolvedValueOnce(
        attachmentRecord({ approval_task_id: TASK_INTERNAL_ID }) as never,
      );
      approvalTaskRepo.findById.mockResolvedValueOnce({
        id: TASK_INTERNAL_ID,
        status: ApprovalStatus.PENDING,
        assignee_id: UPLOADER_ID,
        escalated_to: null,
      } as never);

      // Act
      await service.deleteAttachment('SN-2026-0001', UPLOADER_ID, 5);

      // Assert
      expect(attachmentRepo.delete).toHaveBeenCalledWith(5, expect.anything());
    });

    it('should reject when original approver task is no longer PENDING', async () => {
      // Arrange
      workflowInstanceRepo.findBySerialNumber.mockResolvedValueOnce(
        bareInstance(InstanceStatus.RUNNING),
      );
      attachmentRepo.findById.mockResolvedValueOnce(
        attachmentRecord({ approval_task_id: TASK_INTERNAL_ID }) as never,
      );
      approvalTaskRepo.findById.mockResolvedValueOnce({
        id: TASK_INTERNAL_ID,
        status: ApprovalStatus.REJECTED,
        assignee_id: UPLOADER_ID,
        escalated_to: null,
      } as never);

      // Act & Assert
      await expect(
        service.deleteAttachment('SN-2026-0001', UPLOADER_ID, 5),
      ).rejects.toThrow(ForbiddenException);
      expect(attachmentRepo.delete).not.toHaveBeenCalled();
    });
  });
});
