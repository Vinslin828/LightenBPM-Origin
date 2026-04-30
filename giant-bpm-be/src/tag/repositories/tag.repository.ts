import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { Tag } from '../../common/types/common.types';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';

@Injectable()
export class TagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.TagUncheckedCreateInput,
    tx?: PrismaTransactionClient,
  ): Promise<Tag> {
    const client = tx || this.prisma;
    return await client.tag.create({ data });
  }

  async findAll(tx?: PrismaTransactionClient): Promise<Tag[]> {
    const client = tx || this.prisma;
    return await client.tag.findMany();
  }

  async findById(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<Tag | null> {
    const client = tx || this.prisma;
    return await client.tag.findUnique({
      where: { id },
    });
  }

  async update(
    id: number,
    data: Prisma.TagUpdateInput,
    tx?: PrismaTransactionClient,
  ): Promise<Tag> {
    const client = tx || this.prisma;
    return await client.tag.update({
      where: { id },
      data,
    });
  }

  async delete(id: number, tx?: PrismaTransactionClient): Promise<Tag> {
    const client = tx || this.prisma;
    return await client.tag.delete({
      where: { id },
    });
  }
}
