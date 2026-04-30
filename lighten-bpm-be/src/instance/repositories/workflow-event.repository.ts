import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WorkflowEvent } from '../../common/types/common.types';
import { Prisma } from '@prisma/client';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';

@Injectable()
export class WorkflowEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.WorkflowEventUncheckedCreateInput,
    tx?: PrismaTransactionClient,
  ): Promise<WorkflowEvent> {
    const client = tx || this.prisma;
    return client.workflowEvent.create({
      data,
    });
  }

  async findManyByWorkflowInstanceId(
    workflowInstanceId: number,
    tx?: PrismaTransactionClient,
  ): Promise<WorkflowEvent[]> {
    const client = tx || this.prisma;
    return client.workflowEvent.findMany({
      where: { workflow_instance_id: workflowInstanceId },
      orderBy: { created_at: 'asc' },
      include: {
        actor: true,
      },
    });
  }
}
