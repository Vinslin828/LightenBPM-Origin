import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowOptions } from '../../common/types/common.types';

/**
 * Workflow Options Repository
 *
 * Data access layer for workflow_options operations.
 * Only contains pure data operations without business logic.
 */
@Injectable()
export class WorkflowOptionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Finds workflow options by workflow revision ID
   * @param revisionId - The workflow revision ID
   * @returns The workflow options or null if not found
   */
  async findByRevisionId(revisionId: number): Promise<WorkflowOptions | null> {
    return this.prisma.workflowOptions.findUnique({
      where: { workflow_revision_id: revisionId },
    });
  }
}
