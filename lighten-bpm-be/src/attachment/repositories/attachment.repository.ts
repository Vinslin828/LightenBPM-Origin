import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';
import { Attachment, AttachmentStatus, Prisma } from '@prisma/client';

export const attachmentWithUploader =
  Prisma.validator<Prisma.AttachmentInclude>()({
    uploader: {
      select: {
        id: true,
        name: true,
      },
    },
    approval_task: {
      include: {
        workflow_node: {
          select: {
            node_key: true,
          },
        },
      },
    },
  });

export type AttachmentWithUploader = Prisma.AttachmentGetPayload<{
  include: typeof attachmentWithUploader;
}>;

@Injectable()
export class AttachmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.AttachmentUncheckedCreateInput,
    tx?: PrismaTransactionClient,
  ): Promise<AttachmentWithUploader> {
    const client = tx || this.prisma;
    return client.attachment.create({
      data,
      include: attachmentWithUploader,
    });
  }

  async findBySerialNumberAndField(
    serialNumber: string,
    fieldKey?: string,
    tx?: PrismaTransactionClient,
  ): Promise<AttachmentWithUploader[]> {
    const client = tx || this.prisma;
    return client.attachment.findMany({
      where: {
        serial_number: serialNumber,
        status: AttachmentStatus.UPLOADED,
        ...(fieldKey ? { field_key: fieldKey } : {}),
      },
      include: attachmentWithUploader,
      orderBy: { created_at: 'desc' },
    });
  }

  async findByDraftId(
    draftId: string,
    tx?: PrismaTransactionClient,
  ): Promise<AttachmentWithUploader[]> {
    const client = tx || this.prisma;
    return client.attachment.findMany({
      where: {
        draft_id: draftId,
        status: AttachmentStatus.UPLOADED,
      },
      include: attachmentWithUploader,
      orderBy: { created_at: 'desc' },
    });
  }

  async findByS3Key(
    s3Key: string,
    tx?: PrismaTransactionClient,
  ): Promise<AttachmentWithUploader | null> {
    const client = tx || this.prisma;
    return client.attachment.findUnique({
      where: { s3_key: s3Key },
      include: attachmentWithUploader,
    });
  }

  async findById(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<Attachment | null> {
    const client = tx || this.prisma;
    return client.attachment.findUnique({
      where: { id },
    });
  }

  async update(
    id: number,
    data: Prisma.AttachmentUpdateInput,
    tx?: PrismaTransactionClient,
  ): Promise<AttachmentWithUploader> {
    const client = tx || this.prisma;
    return client.attachment.update({
      where: { id },
      data,
      include: attachmentWithUploader,
    });
  }

  async delete(id: number, tx?: PrismaTransactionClient): Promise<Attachment> {
    const client = tx || this.prisma;
    return client.attachment.delete({
      where: { id },
    });
  }

  async bindDraftToSerialNumber(
    draftId: string,
    serialNumber: string,
    tx?: PrismaTransactionClient,
  ): Promise<Prisma.BatchPayload> {
    const client = tx || this.prisma;
    return client.attachment.updateMany({
      where: {
        draft_id: draftId,
        status: AttachmentStatus.UPLOADED,
      },
      data: {
        serial_number: serialNumber,
        draft_id: null, // Clear draft_id after binding
      },
    });
  }

  async findExpiredPending(
    now: Date = new Date(),
    tx?: PrismaTransactionClient,
  ): Promise<AttachmentWithUploader[]> {
    const client = tx || this.prisma;
    return client.attachment.findMany({
      where: {
        status: AttachmentStatus.PENDING,
        expires_at: { lt: now },
      },
      include: attachmentWithUploader,
    });
  }
}
