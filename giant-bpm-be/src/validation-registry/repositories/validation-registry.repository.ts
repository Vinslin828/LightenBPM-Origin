import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, ValidationRegistry } from '@prisma/client';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';
import { generatePublicId } from '../../common/utils/id-generator';

@Injectable()
export class ValidationRegistryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ValidationRegistryUncheckedCreateInput,
    tx?: PrismaTransactionClient,
  ): Promise<ValidationRegistry> {
    const client = tx || this.prisma;
    if (!data.public_id) {
      data.public_id = generatePublicId();
    }
    return await client.validationRegistry.create({ data });
  }

  async findAll(
    params?: {
      skip?: number;
      take?: number;
      where?: Prisma.ValidationRegistryWhereInput;
      orderBy?: Prisma.ValidationRegistryOrderByWithRelationInput;
    },
    tx?: PrismaTransactionClient,
  ): Promise<ValidationRegistry[]> {
    const client = tx || this.prisma;
    return await client.validationRegistry.findMany({
      ...params,
    });
  }

  async count(
    where?: Prisma.ValidationRegistryWhereInput,
    tx?: PrismaTransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;
    return await client.validationRegistry.count({ where });
  }

  async findByPublicId(
    publicId: string,
    tx?: PrismaTransactionClient,
  ): Promise<ValidationRegistry | null> {
    const client = tx || this.prisma;
    return await client.validationRegistry.findUnique({
      where: { public_id: publicId },
    });
  }

  async findByName(
    name: string,
    tx?: PrismaTransactionClient,
  ): Promise<ValidationRegistry | null> {
    const client = tx || this.prisma;
    return await client.validationRegistry.findUnique({
      where: { name },
    });
  }

  async update(
    publicId: string,
    data: Prisma.ValidationRegistryUncheckedUpdateInput,
    tx?: PrismaTransactionClient,
  ): Promise<ValidationRegistry> {
    const client = tx || this.prisma;
    return await client.validationRegistry.update({
      where: { public_id: publicId },
      data,
    });
  }

  async delete(
    publicId: string,
    tx?: PrismaTransactionClient,
  ): Promise<ValidationRegistry> {
    const client = tx || this.prisma;
    return await client.validationRegistry.delete({
      where: { public_id: publicId },
    });
  }
}
