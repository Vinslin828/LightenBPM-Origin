import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';

@Injectable()
export class InstanceShareRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.InstanceShareUncheckedCreateInput,
    tx?: PrismaTransactionClient,
  ) {
    const client = tx || this.prisma;
    return client.instanceShare.create({
      data,
    });
  }

  async createMany(data: Prisma.InstanceShareUncheckedCreateInput[]) {
    return this.prisma.$transaction(
      data.map((s) =>
        this.prisma.instanceShare.create({
          data: s,
        }),
      ),
    );
  }

  async findManyByInstanceId(instanceId: number) {
    return this.prisma.instanceShare.findMany({
      where: { workflow_instance_id: instanceId },
      include: {
        user: true,
        creator: true,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.instanceShare.delete({
      where: { id },
    });
  }

  async deleteMany(
    instanceId: number,
    query: {
      user_id?: number;
    },
  ) {
    return this.prisma.instanceShare.deleteMany({
      where: {
        workflow_instance_id: instanceId,
        ...query,
      },
    });
  }

  async setShares(
    instanceId: number,
    data: Prisma.InstanceShareUncheckedCreateInput[],
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.instanceShare.deleteMany({
        where: { workflow_instance_id: instanceId },
      });

      return Promise.all(
        data.map((s) =>
          tx.instanceShare.create({
            data: s,
          }),
        ),
      );
    });
  }

  async findById(id: number) {
    return this.prisma.instanceShare.findUnique({
      where: { id },
    });
  }
}
