import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  User,
  OrgUnit,
  OrgMembership,
  UserDefaultOrg,
} from '../../common/types/common.types';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';
import {
  DEFAULT_USER_LIMIT,
  ListUserQueryDto,
} from '../dto/list-user-query.dto';

export type UserWithOrg = User & {
  default_org_preference?: (UserDefaultOrg & { org_unit: OrgUnit }) | null;
  org_memberships?: (OrgMembership & { org_unit: OrgUnit })[];
  resolved_default_org: OrgUnit;
};

export const userInclude = {
  default_org_preference: {
    include: {
      org_unit: true,
    },
  },
  org_memberships: {
    include: {
      org_unit: true,
    },
  },
};

/**
 * User Repository
 *
 * Data access layer for User Management
 */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly userInclude = userInclude;

  async findUserBySub(sub: string): Promise<UserWithOrg | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        sub,
        deleted_at: null,
      },
      include: this.userInclude,
    });
    return user as UserWithOrg | null;
  }

  async findUserById(userId: number): Promise<UserWithOrg | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        deleted_at: null,
      },
      include: this.userInclude,
    });
    return user as UserWithOrg | null;
  }

  async findUserByCode(
    code: string,
    tx?: PrismaTransactionClient,
  ): Promise<UserWithOrg | null> {
    const client = tx ?? this.prisma;
    const user = await client.user.findFirst({
      where: {
        code,
        deleted_at: null,
      },
      include: this.userInclude,
    });
    return user as UserWithOrg | null;
  }

  async findUserByIdIncludingDeleted(
    userId: number,
    tx?: PrismaTransactionClient,
  ): Promise<UserWithOrg | null> {
    const client = tx ?? this.prisma;
    const user = await client.user.findFirst({
      where: { id: userId },
      include: this.userInclude,
    });
    return user as UserWithOrg | null;
  }

  async findUserByCodeIncludingDeleted(
    code: string,
    tx?: PrismaTransactionClient,
  ): Promise<UserWithOrg | null> {
    const client = tx ?? this.prisma;
    const user = await client.user.findFirst({
      where: { code },
      include: this.userInclude,
    });
    return user as UserWithOrg | null;
  }

  async restoreUser(
    userId: number,
    tx?: PrismaTransactionClient,
  ): Promise<UserWithOrg> {
    const client = tx ?? this.prisma;
    const user = await client.user.update({
      where: { id: userId },
      data: { deleted_at: null },
      include: this.userInclude,
    });
    return user as UserWithOrg;
  }

  async findUsers(userIdList: number[]): Promise<UserWithOrg[]> {
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIdList },
        deleted_at: null,
      },
      include: this.userInclude,
    });
    return users as UserWithOrg[];
  }

  async findAllUsers(
    query?: ListUserQueryDto,
  ): Promise<{ items: UserWithOrg[]; total: number }> {
    const baseConditions: Prisma.UserWhereInput[] = [
      {
        OR: [{ sub: { not: 'system-workflow-enginge' } }, { sub: null }],
      },
    ];

    if (!query?.includeDeleted) {
      baseConditions.push({ deleted_at: null });
    }

    const where: Prisma.UserWhereInput = {
      AND: baseConditions,
    };

    if (query?.search) {
      (where.AND as Prisma.UserWhereInput[]).push({
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    }

    const page = query?.page ?? 1;
    const limit = query?.limit ?? DEFAULT_USER_LIMIT;
    const skip = (page - 1) * limit;

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: this.userInclude,
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { items: users as UserWithOrg[], total };
  }

  async updateUser(
    userId: number,
    data: Partial<
      Omit<User, 'id' | 'sub' | 'created_at' | 'updated_at' | 'deleted_at'>
    >,
    tx?: PrismaTransactionClient,
  ): Promise<UserWithOrg> {
    const client = tx ?? this.prisma;
    const updatedUser = await client.user.update({
      where: { id: userId },
      data,
      include: this.userInclude,
    });
    return updatedUser as UserWithOrg;
  }

  async delete(
    userId: number,
    tx?: PrismaTransactionClient,
  ): Promise<UserWithOrg> {
    // Soft delete
    const client = tx ?? this.prisma;
    const deletedUser = await client.user.update({
      where: { id: userId },
      data: {
        deleted_at: new Date(),
      },
      include: this.userInclude,
    });
    return deletedUser as UserWithOrg;
  }

  async hardDelete(userId: number): Promise<UserWithOrg> {
    return this.prisma.$transaction(async (tx) => {
      // Delete memberships first due to FK constraint
      await tx.orgMembership.deleteMany({
        where: { user_id: userId },
      });

      // Delete default org preference
      await tx.userDefaultOrg.deleteMany({
        where: { user_id: userId },
      });

      const deletedUser = await tx.user.delete({
        where: { id: userId },
        include: this.userInclude,
      });
      return deletedUser as UserWithOrg;
    });
  }

  async createUser(
    data: Omit<User, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'lang'> & { lang?: string },
    tx?: PrismaTransactionClient,
  ): Promise<UserWithOrg> {
    try {
      const client = tx ?? this.prisma;
      const newUser = await client.user.create({
        data,
        include: this.userInclude,
      });
      return newUser as UserWithOrg;
    } catch (e) {
      //Check if error e is a known prisma request error
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        Logger.log(`${e.code}/${e.message}/${JSON.stringify(e)}`);
        if (e.code == 'P2003') {
          const field = (e.meta?.constraint as string) ?? 'unknown constraint';
          throw new NotFoundException(
            `DB contraint violated: ${field} not found`,
          );
        }
      }
      throw e;
    }
  }

  private systemUser: UserWithOrg | null = null; // Cache for the system user

  async getSystemUser(): Promise<UserWithOrg> {
    if (this.systemUser) {
      return this.systemUser;
    }

    const systemUser = await this.prisma.user.findUnique({
      where: { sub: 'system-workflow-enginge' },
      include: this.userInclude,
    });

    if (!systemUser) {
      throw new NotFoundException(
        'System user not found. Please ensure the seed script has been run.',
      );
    }
    this.systemUser = systemUser as UserWithOrg;
    return systemUser as UserWithOrg;
  }

  async findDefaultOrgPreference(userId: number) {
    return this.prisma.userDefaultOrg.findUnique({
      where: { user_id: userId },
      include: { org_unit: true },
    });
  }

  async upsertDefaultOrgPreference(userId: number, orgUnitId: number) {
    return this.prisma.userDefaultOrg.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        org_unit_id: orgUnitId,
      },
      update: {
        org_unit_id: orgUnitId,
      },
      include: { org_unit: true },
    });
  }
}
