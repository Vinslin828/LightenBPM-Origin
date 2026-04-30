import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowComment } from '../../common/types/common.types';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';

/**
 * Workflow Comment Repository
 *
 * Data access layer for workflow_comments operations.
 * Only contains pure data operations without business logic.
 */
@Injectable()
export class WorkflowCommentRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new workflow comment
   * @param data - The workflow comment data
   * @param tx - Optional Prisma transaction client
   * @returns The created workflow comment
   */
  async create(
    data: {
      text: string;
      serial_number: string;
      approval_task_id: number;
      author_id: number;
      updated_by: number;
    },
    tx?: PrismaTransactionClient,
  ): Promise<WorkflowComment> {
    const client = tx || this.prisma;
    return client.workflowComment.create({
      data,
    });
  }
}
