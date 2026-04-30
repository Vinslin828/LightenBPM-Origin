import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { AttachmentRepository } from './repositories/attachment.repository';
import { S3Service } from './s3.service';
import { WorkflowInstanceRepository } from '../instance/repositories/workflow-instance.repository';
import { ApprovalTaskRepository } from '../instance/repositories/approval-task.repository';
import { PresignUploadRequestDto } from './dto/presign-upload-request.dto';
import { PresignUploadResponseDto } from './dto/presign-upload-response.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { AttachmentResponseDto } from './dto/attachment-response.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';
import { DownloadResponseDto } from './dto/download-response.dto';
import { PendingUploadResponseDto } from './dto/pending-upload-response.dto';
import { DraftInitResponseDto } from './dto/draft-init-response.dto';
import { v4 as uuidv4 } from 'uuid';
import { InstanceStatus } from '../common/types/common.types';
import { TransactionService } from '../prisma/transaction.service';
import { ApprovalStatus, AttachmentStatus } from '@prisma/client';
import { PrismaTransactionClient } from '../prisma/transaction-client.type';
import { PermissionBuilderService } from '../common/permission/permission-builder.service';
import type { AuthUser } from '../auth/types/auth-user';
import {
  resolveComponentRules,
  VIEWER_ROLE,
} from '../instance/utils/component-rule-filter';
import { FlowDefinition } from '../flow-engine/types';
import { resolveNodeDescription } from '../flow-engine/shared/flow/flow-utils';
import { AttachmentWithUploader } from './repositories/attachment.repository';

@Injectable()
export class AttachmentService {
  private readonly logger = new Logger(AttachmentService.name);

  constructor(
    private readonly attachmentRepo: AttachmentRepository,
    private readonly s3Service: S3Service,
    private readonly workflowInstanceRepo: WorkflowInstanceRepository,
    private readonly approvalTaskRepo: ApprovalTaskRepository,
    private readonly transactionService: TransactionService,
    private readonly permissionBuilder: PermissionBuilderService,
  ) {}

  /**
   * Authorizes an attachment upload and returns the upload context to stamp.
   *
   * When approvalTaskPublicId is given, the caller must own a PENDING task
   * with that id on the matching instance and the field must be editable in
   * that task's component_rules. When omitted, the upload is treated as an
   * applicant upload at the start node (must be applicant + DRAFT + field
   * editable in start node component_rules).
   */
  private async authorizeUpload(
    serialNumber: string,
    userId: number,
    fieldKey: string,
    approvalTaskPublicId: string | undefined,
  ): Promise<{
    serialNumber: string;
    approvalTaskId: number | null;
  }> {
    const instance =
      await this.workflowInstanceRepo.findBySerialNumberWithRevision(
        serialNumber,
      );
    if (!instance) {
      throw new NotFoundException(`Application ${serialNumber} not found`);
    }

    const flowDef = instance.revision
      .flow_definition as unknown as FlowDefinition;

    if (approvalTaskPublicId) {
      const task =
        await this.approvalTaskRepo.findByPublicIdWithNode(
          approvalTaskPublicId,
        );
      if (!task || task.workflow_node.instance_id !== instance.id) {
        throw new NotFoundException(
          `Approval task ${approvalTaskPublicId} not found on application ${serialNumber}`,
        );
      }
      if (task.assignee_id !== userId && task.escalated_to !== userId) {
        throw new ForbiddenException('You do not own this approval task');
      }
      if (task.status !== ApprovalStatus.PENDING) {
        throw new ForbiddenException(
          `Approval task is not PENDING (current: ${task.status})`,
        );
      }
      const editable = resolveComponentRules(
        flowDef,
        VIEWER_ROLE.APPROVER_ACTIVE,
        [
          {
            nodeKey: task.workflow_node.node_key,
            groupIndex: task.approver_group_index,
          },
        ],
      ).editableNames;
      if (!editable.includes(fieldKey)) {
        throw new ForbiddenException(
          `Field "${fieldKey}" is not editable for this approval task`,
        );
      }
      return { serialNumber: instance.serial_number, approvalTaskId: task.id };
    }

    // Applicant path: must be applicant + DRAFT + field editable on start node
    if (instance.applicant_id !== userId) {
      this.logger.warn(
        `Upload denied: user ${userId} is not applicant of ${serialNumber} ` +
          `(applicant_id=${instance.applicant_id}); request did not include approval_task_id`,
      );
      throw new ForbiddenException(
        'You are not authorized to upload to this application. ' +
          'Approvers must include approval_task_id in the request body.',
      );
    }
    if (instance.status !== InstanceStatus.DRAFT) {
      this.logger.warn(
        `Upload denied: applicant ${userId} cannot upload to ${serialNumber} in status ${instance.status} (only DRAFT is allowed for applicant uploads)`,
      );
      throw new BadRequestException(
        'Applicants can only upload while the application is in DRAFT.',
      );
    }
    const editable = resolveComponentRules(
      flowDef,
      VIEWER_ROLE.APPLICANT_DRAFT,
    ).editableNames;
    if (!editable.includes(fieldKey)) {
      throw new ForbiddenException(
        `Field "${fieldKey}" is not editable for the applicant`,
      );
    }
    return { serialNumber: instance.serial_number, approvalTaskId: null };
  }

  /**
   * Verifies the upload context that produced this attachment is still active
   * for the given user. Used to gate post-upload mutations (remark, delete):
   *   - applicant uploads (approval_task_id = null): instance must be DRAFT
   *   - approver uploads: the original approval_task must still be PENDING
   *     and assigned to (or escalated to) the user
   */
  private async assertUploadContextActive(
    record: { approval_task_id: number | null },
    instanceStatus: InstanceStatus,
    userId: number,
  ): Promise<void> {
    if (record.approval_task_id === null) {
      if (instanceStatus !== InstanceStatus.DRAFT) {
        throw new ForbiddenException(
          'Cannot modify applicant attachment after submission',
        );
      }
      return;
    }
    const task = await this.approvalTaskRepo.findById(record.approval_task_id);
    if (
      !task ||
      task.status !== ApprovalStatus.PENDING ||
      (task.assignee_id !== userId && task.escalated_to !== userId)
    ) {
      throw new ForbiddenException(
        'Cannot modify attachment after your approval task is closed',
      );
    }
  }

  // READ access: applicant, assigned approvers, escalated approvers, shares, and admins.
  // Returns 404 for both "not found" and "no visibility" to avoid leaking existence.
  private async checkApplicationReadAccess(
    serialNumber: string,
    user: AuthUser,
  ) {
    const visibilityWhere =
      this.permissionBuilder.getInstanceVisibilityWhere(user);
    const instance = await this.workflowInstanceRepo.findBySerialNumber(
      serialNumber,
      visibilityWhere,
    );
    if (!instance) {
      throw new NotFoundException(`Application ${serialNumber} not found`);
    }
    return instance;
  }

  private generateS3Key(userCode: string, fileName: string): string {
    const uuid = uuidv4();
    const safeFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${userCode}/attachments/${uuid}_${safeFileName}`;
  }

  async presignUpload(
    serialNumber: string,
    userId: number,
    userCode: string,
    dto: PresignUploadRequestDto,
  ): Promise<PresignUploadResponseDto> {
    const ctx = await this.authorizeUpload(
      serialNumber,
      userId,
      dto.field_key,
      dto.approval_task_id,
    );

    const s3Key = this.generateS3Key(userCode, dto.file_name);
    const uploadUrl = await this.s3Service.generatePresignedUploadUrl(
      s3Key,
      dto.content_type,
    );

    const expiresAt = new Date(
      Date.now() + this.s3Service.presignExpiry * 1000,
    );
    await this.attachmentRepo.create({
      serial_number: ctx.serialNumber,
      field_key: dto.field_key,
      s3_key: s3Key,
      file_name: dto.file_name,
      file_size: dto.file_size,
      content_type: dto.content_type,
      uploaded_by: userId,
      status: AttachmentStatus.PENDING,
      expires_at: expiresAt,
      approval_task_id: ctx.approvalTaskId,
    });

    return {
      upload_url: uploadUrl,
      s3_key: s3Key,
      expires_in: this.s3Service.presignExpiry,
    };
  }

  async confirmUpload(
    serialNumber: string,
    userId: number,
    dto: ConfirmUploadDto,
  ): Promise<AttachmentResponseDto> {
    const instance =
      await this.workflowInstanceRepo.findBySerialNumberWithRevision(
        serialNumber,
      );
    if (!instance) {
      throw new NotFoundException(`Application ${serialNumber} not found`);
    }
    if (
      instance.status !== InstanceStatus.DRAFT &&
      instance.status !== InstanceStatus.RUNNING
    ) {
      throw new BadRequestException(
        `Cannot modify attachments in status ${instance.status}`,
      );
    }

    const record = await this.attachmentRepo.findByS3Key(dto.s3_key);
    if (!record || record.serial_number !== serialNumber) {
      throw new NotFoundException(
        `Attachment record for ${dto.s3_key} not found`,
      );
    }
    if (record.uploaded_by !== userId) {
      throw new ForbiddenException('You do not own this attachment');
    }

    const exists = await this.s3Service.objectExists(dto.s3_key);
    if (!exists) {
      throw new BadRequestException('File has not been uploaded to S3 yet');
    }

    const updated = await this.attachmentRepo.update(record.id, {
      status: AttachmentStatus.UPLOADED,
      remark: dto.remark,
    });

    const flowDef = instance.revision
      .flow_definition as unknown as FlowDefinition;
    return this.toResponseDto(updated, flowDef);
  }

  private toResponseDto(
    record: AttachmentWithUploader,
    flowDef: FlowDefinition | null,
  ): AttachmentResponseDto {
    const nodeDescription = flowDef
      ? resolveNodeDescription(
          flowDef,
          record.approval_task?.workflow_node.node_key ?? null,
          record.approval_task?.approver_group_index,
        )
      : null;
    return {
      id: record.id,
      field_key: record.field_key,
      file_name: record.file_name,
      file_size: record.file_size,
      content_type: record.content_type,
      status: record.status,
      serial_number: record.serial_number || undefined,
      draft_id: record.draft_id || undefined,
      remark: record.remark || undefined,
      uploaded_by: record.uploader,
      node_description: nodeDescription,
      approval_task_id: record.approval_task?.public_id ?? null,
      created_at: record.created_at,
    };
  }

  async listAttachments(
    serialNumber: string,
    user: AuthUser,
    fieldKey?: string,
  ): Promise<AttachmentResponseDto[]> {
    await this.checkApplicationReadAccess(serialNumber, user);

    const [instance, records] = await Promise.all([
      this.workflowInstanceRepo.findBySerialNumberWithRevision(serialNumber),
      this.attachmentRepo.findBySerialNumberAndField(serialNumber, fieldKey),
    ]);
    const flowDef = instance
      ? (instance.revision.flow_definition as unknown as FlowDefinition)
      : null;
    return records.map((r) => this.toResponseDto(r, flowDef));
  }

  // Draft Flow
  initDraft(): DraftInitResponseDto {
    return { draft_id: uuidv4() };
  }

  async presignDraftUpload(
    draftId: string,
    userId: number,
    userCode: string,
    dto: PresignUploadRequestDto,
  ): Promise<PresignUploadResponseDto> {
    const s3Key = this.generateS3Key(userCode, dto.file_name);
    const uploadUrl = await this.s3Service.generatePresignedUploadUrl(
      s3Key,
      dto.content_type,
    );

    const expiresAt = new Date(
      Date.now() + this.s3Service.presignExpiry * 1000,
    );
    await this.attachmentRepo.create({
      draft_id: draftId,
      field_key: dto.field_key,
      s3_key: s3Key,
      file_name: dto.file_name,
      file_size: dto.file_size,
      content_type: dto.content_type,
      uploaded_by: userId,
      status: AttachmentStatus.PENDING,
      expires_at: expiresAt,
    });

    return {
      upload_url: uploadUrl,
      s3_key: s3Key,
      expires_in: this.s3Service.presignExpiry,
    };
  }

  async confirmDraftUpload(
    draftId: string,
    userId: number,
    dto: ConfirmUploadDto,
  ): Promise<AttachmentResponseDto> {
    const record = await this.attachmentRepo.findByS3Key(dto.s3_key);
    if (!record || record.draft_id !== draftId) {
      throw new NotFoundException(
        `Draft attachment record for ${dto.s3_key} not found`,
      );
    }

    if (record.uploaded_by !== userId) {
      throw new ForbiddenException('You do not own this attachment');
    }

    const exists = await this.s3Service.objectExists(dto.s3_key);
    if (!exists) {
      throw new BadRequestException('File has not been uploaded to S3 yet');
    }

    const updated = await this.attachmentRepo.update(record.id, {
      status: AttachmentStatus.UPLOADED,
      remark: dto.remark,
    });

    return this.toResponseDto(updated, null);
  }

  async listDraftAttachments(
    draftId: string,
    userId: number,
  ): Promise<AttachmentResponseDto[]> {
    const records = await this.attachmentRepo.findByDraftId(draftId);
    // Security check: only show what user uploaded
    return records
      .filter((r) => r.uploaded_by === userId)
      .map((r) => this.toResponseDto(r, null));
  }

  async deleteDraftAttachment(
    draftId: string,
    userId: number,
    id: number,
  ): Promise<void> {
    const record = await this.attachmentRepo.findById(id);
    if (!record || record.draft_id !== draftId) {
      throw new NotFoundException(
        `Attachment ${id} not found in draft ${draftId}`,
      );
    }

    if (record.uploaded_by !== userId) {
      throw new ForbiddenException('You do not own this attachment');
    }

    await this.transactionService.runTransaction(async (tx) => {
      await this.attachmentRepo.delete(id, tx);
      await this.s3Service.deleteObject(record.s3_key);
    });
  }

  // Binding
  async bindDraftAttachments(
    draftId: string,
    serialNumber: string,
    userId: number,
    tx: PrismaTransactionClient,
  ): Promise<void> {
    const attachments = await this.attachmentRepo.findByDraftId(draftId, tx);

    // Security check: verify ownership of all attachments in this draft
    const malicious = attachments.find((a) => a.uploaded_by !== userId);
    if (malicious) {
      throw new ForbiddenException(
        'One or more attachments in the draft do not belong to you',
      );
    }

    await this.attachmentRepo.bindDraftToSerialNumber(
      draftId,
      serialNumber,
      tx,
    );
  }

  async presignDownload(
    serialNumber: string,
    user: AuthUser,
    id: number,
  ): Promise<DownloadResponseDto> {
    await this.checkApplicationReadAccess(serialNumber, user);

    const record = await this.attachmentRepo.findById(id);
    if (!record || record.serial_number !== serialNumber) {
      throw new NotFoundException(`Attachment ${id} not found`);
    }

    const contentDisposition = `attachment; filename="${encodeURIComponent(record.file_name)}"`;
    const downloadUrl = await this.s3Service.generatePresignedDownloadUrl(
      record.s3_key,
      contentDisposition,
    );

    return {
      download_url: downloadUrl,
      file_name: record.file_name,
      expires_in: this.s3Service.presignExpiry,
    };
  }

  async updateRemark(
    serialNumber: string,
    userId: number,
    id: number,
    dto: UpdateAttachmentDto,
  ): Promise<AttachmentResponseDto> {
    const instance =
      await this.workflowInstanceRepo.findBySerialNumberWithRevision(
        serialNumber,
      );
    if (!instance) {
      throw new NotFoundException(`Application ${serialNumber} not found`);
    }

    const record = await this.attachmentRepo.findById(id);
    if (!record || record.serial_number !== serialNumber) {
      throw new NotFoundException(`Attachment ${id} not found`);
    }
    if (record.uploaded_by !== userId) {
      throw new ForbiddenException('You do not own this attachment');
    }

    await this.assertUploadContextActive(record, instance.status, userId);

    const updated = await this.attachmentRepo.update(id, {
      remark: dto.remark,
    });
    const flowDef = instance.revision
      .flow_definition as unknown as FlowDefinition;
    return this.toResponseDto(updated, flowDef);
  }

  async deleteAttachment(
    serialNumber: string,
    userId: number,
    id: number,
  ): Promise<void> {
    const instance =
      await this.workflowInstanceRepo.findBySerialNumber(serialNumber);
    if (!instance) {
      throw new NotFoundException(`Application ${serialNumber} not found`);
    }

    const record = await this.attachmentRepo.findById(id);
    if (!record || record.serial_number !== serialNumber) {
      throw new NotFoundException(`Attachment ${id} not found`);
    }
    if (record.uploaded_by !== userId) {
      throw new ForbiddenException('You do not own this attachment');
    }

    await this.assertUploadContextActive(record, instance.status, userId);

    await this.transactionService.runTransaction(async (tx) => {
      await this.attachmentRepo.delete(id, tx);
      await this.s3Service.deleteObject(record.s3_key);
    });
  }

  async listExpiredAttachments(): Promise<PendingUploadResponseDto[]> {
    const records = await this.attachmentRepo.findExpiredPending();
    return records.map((r) => ({
      id: r.id,
      serial_number: r.serial_number || undefined,
      draft_id: r.draft_id || undefined,
      field_key: r.field_key,
      s3_key: r.s3_key,
      file_name: r.file_name,
      file_size: r.file_size,
      content_type: r.content_type,
      uploaded_by: r.uploader,
      created_at: r.created_at,
      expires_at: r.expires_at!,
    }));
  }

  async purgeAttachment(id: number): Promise<void> {
    const record = await this.attachmentRepo.findById(id);
    if (!record) {
      throw new NotFoundException(`Attachment record ${id} not found`);
    }

    await this.transactionService.runTransaction(async (tx) => {
      await this.attachmentRepo.delete(id, tx);
      await this.s3Service.deleteObject(record.s3_key);
    });
  }
}
