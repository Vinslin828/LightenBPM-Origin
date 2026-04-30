import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FormInstanceData } from '../../common/types/common.types';
import { Prisma } from '@prisma/client';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';

@Injectable()
export class FormInstanceDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.FormInstanceDataUncheckedCreateInput,
    tx?: PrismaTransactionClient,
  ): Promise<FormInstanceData> {
    const client = tx || this.prisma;
    return client.formInstanceData.create({
      data,
    });
  }

  async findLatestByFormInstanceId(
    formInstanceId: number,
    tx?: PrismaTransactionClient,
  ): Promise<FormInstanceData | null> {
    const client = tx || this.prisma;
    return client.formInstanceData.findFirst({
      where: { form_instance_id: formInstanceId },
      orderBy: { created_at: 'desc' },
    });
  }

  async findManyByFormInstanceId(
    formInstanceId: number,
    tx?: PrismaTransactionClient,
  ): Promise<FormInstanceData[]> {
    const client = tx || this.prisma;
    return client.formInstanceData.findMany({
      where: { form_instance_id: formInstanceId },
      orderBy: { created_at: 'desc' },
    });
  }
}
