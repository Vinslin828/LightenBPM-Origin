import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  Prisma,
  ValidationComponentMapping,
  ValidationRegistry,
} from '@prisma/client';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';
import { generatePublicId } from '../../common/utils/id-generator';

@Injectable()
export class ValidationComponentMappingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByValidationId(
    validationId: number,
    tx?: PrismaTransactionClient,
  ): Promise<
    Array<ValidationComponentMapping & { validation: { public_id: string } }>
  > {
    const client = tx || this.prisma;
    return await client.validationComponentMapping.findMany({
      where: { validation_id: validationId },
      include: {
        validation: {
          select: { public_id: true },
        },
      },
      orderBy: { component: 'asc' },
    });
  }

  async findByValidationIdAndComponentType(
    validationId: number,
    component: string,
    tx?: PrismaTransactionClient,
  ): Promise<ValidationComponentMapping | null> {
    const client = tx || this.prisma;
    return await client.validationComponentMapping.findFirst({
      where: {
        validation_id: validationId,
        component: component,
      },
    });
  }

  async create(
    data: Prisma.ValidationComponentMappingUncheckedCreateInput,
    tx?: PrismaTransactionClient,
  ): Promise<ValidationComponentMapping> {
    const client = tx || this.prisma;
    if (!data.public_id) {
      data.public_id = generatePublicId();
    }
    return await client.validationComponentMapping.create({ data });
  }

  async createMany(
    data: Prisma.ValidationComponentMappingUncheckedCreateInput[],
    tx?: PrismaTransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;
    const finalData = data.map((item) => ({
      ...item,
      public_id: item.public_id || generatePublicId(),
    }));
    const result = await client.validationComponentMapping.createMany({
      data: finalData,
      skipDuplicates: true,
    });
    return result.count;
  }

  async deleteByValidationIdAndComponentType(
    validationId: number,
    component: string,
    tx?: PrismaTransactionClient,
  ): Promise<ValidationComponentMapping | null> {
    const client = tx || this.prisma;
    try {
      return await client.validationComponentMapping.delete({
        where: {
          uq_validation_component: {
            validation_id: validationId,
            component: component,
          },
        },
      });
    } catch {
      // If not found, return null
      return null;
    }
  }

  async deleteAllByValidationId(
    validationId: number,
    tx?: PrismaTransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;
    const result = await client.validationComponentMapping.deleteMany({
      where: { validation_id: validationId },
    });
    return result.count;
  }

  async count(
    where?: Prisma.ValidationComponentMappingWhereInput,
    tx?: PrismaTransactionClient,
  ): Promise<number> {
    const client = tx || this.prisma;
    return await client.validationComponentMapping.count({ where });
  }

  /**
   * Find all validation rules that support a specific component type
   */
  async findByComponentType(
    component: string,
    tx?: PrismaTransactionClient,
  ): Promise<
    Array<ValidationComponentMapping & { validation: ValidationRegistry }>
  > {
    const client = tx || this.prisma;
    return await client.validationComponentMapping.findMany({
      where: {
        component: component,
      },
      include: {
        validation: true,
      },
      orderBy: {
        validation: {
          name: 'asc',
        },
      },
    });
  }
}
