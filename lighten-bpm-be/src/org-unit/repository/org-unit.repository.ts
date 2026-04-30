import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import {
  OrgUnit,
  OrgMembership,
  User,
  AssignType,
} from '../../common/types/common.types';
import { CreateOrgUnitDto } from '../dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from '../dto/update-org-unit.dto';
import { CreateOrgMembershipDto } from '../dto/create-org-membership.dto';
import { UpdateOrgMembershipDto } from '../dto/update-org-membership.dto';
import { OrgUnitWithRelations, OrgMember } from '../types/org-unit.types';
import { PrismaTransactionClient } from '../../prisma/transaction-client.type';
import { ListOrgQueryDto } from '../dto/list-org-query.dto';
import {
  AssignTypeFilter,
  ListOrgMembersQueryDto,
  MembershipStatusFilter,
} from '../dto/list-org-members-query.dto';
import { INDEFINITE_MEMBERSHIP_END_DATE } from '../../common/constants';

// Deep include for the user relation inside membership queries.
// Provides org_memberships and default_org_preference so UserDto.fromPrisma
// can resolve defaultOrgId / defaultOrgCode without a separate lookup.
const memberUserInclude = {
  org_memberships: { include: { org_unit: true } },
  default_org_preference: { include: { org_unit: true } },
} as const;

@Injectable()
export class OrgUnitRepository {
  private readonly logger = new Logger(OrgUnitRepository.name);

  constructor(public readonly prisma: PrismaService) {}

  async createOrgUnit(
    createOrgUnitDto: CreateOrgUnitDto,
    creatorId: number,
    tx?: PrismaTransactionClient,
  ): Promise<OrgUnit> {
    try {
      const client = tx ?? this.prisma;
      let parent_id: number | undefined;
      if (createOrgUnitDto.parentCode) {
        const parent = await client.orgUnit.findUnique({
          where: { code: createOrgUnitDto.parentCode },
        });
        if (!parent) {
          throw new NotFoundException(
            `Parent OrgUnit with code ${createOrgUnitDto.parentCode} not found`,
          );
        }
        parent_id = parent.id;
      }

      return await client.orgUnit.create({
        data: {
          code: createOrgUnitDto.code,
          name: createOrgUnitDto.name,
          type: createOrgUnitDto.type,
          parent_id,
          created_by: creatorId,
          updated_by: creatorId,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
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

  async findAllOrgUnits(
    query?: ListOrgQueryDto,
  ): Promise<OrgUnitWithRelations[]> {
    const now = new Date();

    const where: Prisma.OrgUnitWhereInput = {
      AND: [],
    };

    if (!query?.includeDeleted) {
      where.deleted_at = null;
    }

    if (query?.filter) {
      (where.AND as Prisma.OrgUnitWhereInput[]).push({ type: query.filter });
    }

    if (query?.name) {
      (where.AND as Prisma.OrgUnitWhereInput[]).push({
        name: { contains: query.name, mode: 'insensitive' },
      });
    }

    // Remove empty AND array to keep the query clean
    if ((where.AND as Prisma.OrgUnitWhereInput[]).length === 0) {
      delete where.AND;
    }

    return this.prisma.orgUnit.findMany({
      where,
      include: {
        members: {
          where: {
            end_date: { gt: now },
          },
          include: {
            user: {
              include: {
                ...memberUserInclude,
              },
            },
          },
        },
        children: true,
        parent: true,
      },
    });
  }
  async findOrgUnitById(id: number): Promise<OrgUnitWithRelations | null> {
    const now = new Date();
    return this.prisma.orgUnit.findFirst({
      where: { id, deleted_at: null },
      include: {
        members: {
          where: {
            end_date: { gt: now },
          },
          include: {
            user: {
              include: {
                ...memberUserInclude,
              },
            },
          },
        },
        children: true,
        parent: true,
      },
    });
  }

  async findOrgUnitByCode(
    code: string,
    tx?: PrismaTransactionClient,
  ): Promise<OrgUnitWithRelations | null> {
    const client = tx ?? this.prisma;
    const now = new Date();
    return client.orgUnit.findFirst({
      where: { code, deleted_at: null },
      include: {
        members: {
          where: {
            end_date: { gt: now },
          },
          include: {
            user: {
              include: {
                ...memberUserInclude,
              },
            },
          },
        },
        children: true,
        parent: true,
      },
    });
  }

  async findOrgUnitByIdIncludingDeleted(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<OrgUnitWithRelations | null> {
    const client = tx ?? this.prisma;
    const now = new Date();
    return client.orgUnit.findFirst({
      where: { id },
      include: {
        members: {
          where: { end_date: { gt: now } },
          include: {
            user: {
              include: {
                ...memberUserInclude,
              },
            },
          },
        },
        children: true,
        parent: true,
      },
    });
  }

  async findOrgUnitByCodeIncludingDeleted(
    code: string,
    tx?: PrismaTransactionClient,
  ): Promise<OrgUnitWithRelations | null> {
    const client = tx ?? this.prisma;
    const now = new Date();
    return client.orgUnit.findFirst({
      where: { code },
      include: {
        members: {
          where: {
            end_date: { gt: now },
          },
          include: {
            user: {
              include: {
                ...memberUserInclude,
              },
            },
          },
        },
        children: true,
        parent: true,
      },
    });
  }

  async restoreOrgUnit(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<OrgUnit> {
    const client = tx ?? this.prisma;
    return client.orgUnit.update({
      where: { id },
      data: { deleted_at: null },
    });
  }

  async updateOrgUnit(
    id: number,
    updateOrgUnitDto: UpdateOrgUnitDto,
    tx?: PrismaTransactionClient,
  ): Promise<OrgUnit> {
    const client = tx ?? this.prisma;
    let parent_id: number | null | undefined;
    if (updateOrgUnitDto.parentCode !== undefined) {
      if (updateOrgUnitDto.parentCode === null) {
        parent_id = null;
      } else {
        const parent = await client.orgUnit.findUnique({
          where: { code: updateOrgUnitDto.parentCode },
        });
        if (!parent) {
          throw new NotFoundException(
            `Parent OrgUnit with code ${updateOrgUnitDto.parentCode} not found`,
          );
        }
        parent_id = parent.id;
      }
    }

    return client.orgUnit.update({
      where: { id },
      data: {
        code: updateOrgUnitDto.code,
        name: updateOrgUnitDto.name,
        type: updateOrgUnitDto.type,
        parent_id,
      },
    });
  }

  async deleteOrgUnit(
    id: number,
    tx?: PrismaTransactionClient,
  ): Promise<OrgUnit> {
    const client = tx ?? this.prisma;
    return client.orgUnit.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  }

  async hardDeleteOrgUnit(id: number): Promise<OrgUnit> {
    return this.prisma.$transaction(async (tx) => {
      // Delete memberships first due to FK constraint
      await tx.orgMembership.deleteMany({
        where: { org_unit_id: id },
      });

      return tx.orgUnit.delete({
        where: { id },
      });
    });
  }

  async updateOrgUnitByCode(
    code: string,
    updateOrgUnitDto: UpdateOrgUnitDto,
  ): Promise<OrgUnit> {
    let parent_id: number | null | undefined;
    if (updateOrgUnitDto.parentCode !== undefined) {
      if (updateOrgUnitDto.parentCode === null) {
        parent_id = null;
      } else {
        const parent = await this.prisma.orgUnit.findUnique({
          where: { code: updateOrgUnitDto.parentCode },
        });
        if (!parent) {
          throw new NotFoundException(
            `Parent OrgUnit with code ${updateOrgUnitDto.parentCode} not found`,
          );
        }
        parent_id = parent.id;
      }
    }

    return this.prisma.orgUnit.update({
      where: { code },
      data: {
        code: updateOrgUnitDto.code,
        name: updateOrgUnitDto.name,
        type: updateOrgUnitDto.type,
        parent_id,
      },
    });
  }

  async deleteOrgUnitByCode(
    code: string,
    tx?: PrismaTransactionClient,
  ): Promise<OrgUnit> {
    const client = tx ?? this.prisma;
    return client.orgUnit.update({
      where: { code },
      data: { deleted_at: new Date() },
    });
  }

  async hardDeleteOrgUnitByCode(code: string): Promise<OrgUnit> {
    return this.prisma.$transaction(async (tx) => {
      const orgUnit = await tx.orgUnit.findUnique({ where: { code } });
      if (orgUnit) {
        await tx.orgMembership.deleteMany({
          where: { org_unit_id: orgUnit.id },
        });
      }

      return tx.orgUnit.delete({
        where: { code },
      });
    });
  }

  async findOrgMembership(
    orgUnitId: number,
    userId: number,
    tx?: PrismaTransactionClient,
  ): Promise<OrgMembership | null> {
    const client = tx ?? this.prisma;
    return client.orgMembership.findFirst({
      where: {
        org_unit_id: orgUnitId,
        user_id: userId,
      },
    });
  }

  async findOrgMembershipByStart(
    orgUnitId: number,
    userId: number,
    startDate: Date,
    tx?: PrismaTransactionClient,
  ): Promise<OrgMembership | null> {
    const client = tx ?? this.prisma;
    return client.orgMembership.findFirst({
      where: {
        org_unit_id: orgUnitId,
        user_id: userId,
        start_date: startDate,
      },
    });
  }

  async createOrgMembership(
    createDto: CreateOrgMembershipDto,
    creatorId: number,
    tx?: PrismaTransactionClient,
  ): Promise<OrgMembership> {
    const client = tx ?? this.prisma;
    const orgUnit = await client.orgUnit.findUnique({
      where: { code: createDto.orgUnitCode },
    });
    if (!orgUnit) {
      throw new NotFoundException(
        `OrgUnit with code ${createDto.orgUnitCode} not found`,
      );
    }

    this.logger.debug('createOrgMembership ' + JSON.stringify(createDto));

    return client.orgMembership.create({
      data: {
        org_unit_id: orgUnit.id,
        user_id: createDto.userId,
        assign_type: createDto.assignType,
        start_date: createDto.startDate,
        end_date: createDto.isIndefinite
          ? INDEFINITE_MEMBERSHIP_END_DATE
          : (createDto.endDate ?? INDEFINITE_MEMBERSHIP_END_DATE),
        note: createDto.note,
        created_by: creatorId,
        updated_by: creatorId,
      },
    });
  }

  async findAllOverlappingMemberships(
    userId: number,
    orgUnitId: number,
    startDate: Date,
    endDate: Date,
    tx?: PrismaTransactionClient,
  ): Promise<OrgMembership[]> {
    const client = tx ?? this.prisma;
    return client.orgMembership.findMany({
      where: {
        user_id: userId,
        org_unit_id: orgUnitId,
        AND: [{ start_date: { lt: endDate } }, { end_date: { gt: startDate } }],
      },
    });
  }

  async findOverlappingMembership(
    userId: number,
    orgUnitId: number,
    startDate: Date,
    endDate: Date,
    excludeId?: number,
    tx?: PrismaTransactionClient,
  ): Promise<OrgMembership | null> {
    const client = tx ?? this.prisma;
    const overlap = await client.orgMembership.findFirst({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        user_id: userId,
        org_unit_id: orgUnitId,
        AND: [
          {
            start_date: { lt: endDate },
          },
          {
            end_date: { gt: startDate },
          },
        ],
      },
    });

    if (overlap) {
      console.log(
        `[DEBUG] Overlap found for user ${userId}, org ${orgUnitId}:`,
        `New range: ${startDate.toISOString()} - ${endDate.toISOString()}`,
        `Existing overlap: ID ${overlap.id}, ${overlap.start_date.toISOString()} - ${overlap.end_date.toISOString()}`,
      );
    }

    return overlap;
  }

  async findOrgUnitHeadMemberships(orgUnitId: number): Promise<OrgMember[]> {
    return this.prisma.orgMembership.findMany({
      where: {
        org_unit_id: orgUnitId,
        assign_type: AssignType.HEAD,
        end_date: { gt: new Date() },
        user: { deleted_at: null },
      },
      include: {
        user: { include: { ...memberUserInclude } },
      },
    });
  }

  async findOrgUnitHeadMembershipsByCode(code: string): Promise<OrgMember[]> {
    return this.prisma.orgMembership.findMany({
      where: {
        org_unit: { code },
        assign_type: AssignType.HEAD,
        end_date: { gt: new Date() },
        user: { deleted_at: null },
      },
      include: {
        user: { include: { ...memberUserInclude } },
      },
    });
  }

  //get user list version of findOrgUnitHeadMemberships
  async getOrgUnitHeadUserList(orgUnitId: number): Promise<User[]> {
    const heads = await this.findOrgUnitHeadMemberships(orgUnitId);
    return heads.map((h) => h.user);
  }

  // Flexible membership query for GET /org-units/:id/users.
  // Supports filtering by assignType (USER/HEAD/ALL), membership status
  // (active/expired/all), and soft-deleted user inclusion.
  async findOrgUnitMemberships(
    orgUnitId: number,
    query?: ListOrgMembersQueryDto,
  ): Promise<OrgMember[]> {
    const now = new Date();
    const where: Prisma.OrgMembershipWhereInput = { org_unit_id: orgUnitId };

    const assignType = query?.assignType ?? AssignTypeFilter.USER;
    if (assignType !== AssignTypeFilter.ALL) {
      where.assign_type = assignType as AssignType;
    }

    const status = query?.status ?? MembershipStatusFilter.ACTIVE;
    if (status === MembershipStatusFilter.ACTIVE) {
      where.start_date = { lte: now };
      where.end_date = { gt: now };
    } else if (status === MembershipStatusFilter.EXPIRED) {
      where.end_date = { lte: now };
    } else if (status === MembershipStatusFilter.SCHEDULED) {
      where.start_date = { gt: now };
    }

    if (!query?.includeDeleted) {
      where.user = { deleted_at: null };
    }

    return this.prisma.orgMembership.findMany({
      where,
      include: {
        user: { include: { ...memberUserInclude } },
        org_unit: true,
      },
    });
  }

  async findOrgUnitMembershipsByCode(
    code: string,
    query?: ListOrgMembersQueryDto,
  ): Promise<OrgMember[]> {
    const now = new Date();
    const where: Prisma.OrgMembershipWhereInput = { org_unit: { code } };

    const assignType = query?.assignType ?? AssignTypeFilter.USER;
    if (assignType !== AssignTypeFilter.ALL) {
      where.assign_type = assignType as AssignType;
    }

    const status = query?.status ?? MembershipStatusFilter.ACTIVE;
    if (status === MembershipStatusFilter.ACTIVE) {
      where.start_date = { lte: now };
      where.end_date = { gt: now };
    } else if (status === MembershipStatusFilter.EXPIRED) {
      where.end_date = { lte: now };
    } else if (status === MembershipStatusFilter.SCHEDULED) {
      where.start_date = { gt: now };
    }

    if (!query?.includeDeleted) {
      where.user = { deleted_at: null };
    }

    return this.prisma.orgMembership.findMany({
      where,
      include: {
        user: { include: { ...memberUserInclude } },
        org_unit: true,
      },
    });
  }

  //get user list version of findOrgUnitMemberships (USER-type, active, non-deleted)
  async getOrgUnitMemberUserList(orgUnitId: number): Promise<User[]> {
    const memberships = await this.findOrgUnitMemberships(orgUnitId);
    return memberships.map((m) => m.user);
  }

  async findOrgMembershipsByUserId(
    userId: number,
  ): Promise<(OrgMembership & { org_unit: OrgUnitWithRelations })[]> {
    const now = new Date();
    const memberships = await this.prisma.orgMembership.findMany({
      where: {
        user_id: userId,
        start_date: { lte: now },
        end_date: { gt: now },
      },
      include: {
        org_unit: {
          include: {
            members: {
              where: {
                start_date: { lte: now },
                end_date: { gt: now },
              },
              include: {
                user: true,
              },
            },
            children: true,
            parent: true,
          },
        },
      },
    });
    return memberships as unknown as (OrgMembership & {
      org_unit: OrgUnitWithRelations;
    })[];
  }

  async findOrgMembershipsByUserIdWithUserAndOrgUnit(
    userId: number,
    query?: ListOrgMembersQueryDto,
  ): Promise<OrgMember[]> {
    const now = new Date();
    const where: Prisma.OrgMembershipWhereInput = { user_id: userId };

    const status = query?.status ?? MembershipStatusFilter.ACTIVE;
    if (status === MembershipStatusFilter.ACTIVE) {
      where.start_date = { lte: now };
      where.end_date = { gt: now };
    } else if (status === MembershipStatusFilter.EXPIRED) {
      where.end_date = { lte: now };
    } else if (status === MembershipStatusFilter.SCHEDULED) {
      where.start_date = { gt: now };
    }

    return this.prisma.orgMembership.findMany({
      where,
      include: {
        user: { include: { ...memberUserInclude } },
        org_unit: true,
      },
    });
  }

  async updateOrgMembership(
    mappingId: number,
    updateDto: UpdateOrgMembershipDto,
    tx?: PrismaTransactionClient,
  ): Promise<OrgMembership> {
    const client = tx ?? this.prisma;

    const data: Prisma.OrgMembershipUpdateInput = {
      assign_type: updateDto.assignType,
      start_date: updateDto.startDate,
      note: updateDto.note,
    };

    if (updateDto.isIndefinite) {
      data.end_date = INDEFINITE_MEMBERSHIP_END_DATE;
    } else if (updateDto.endDate !== undefined) {
      data.end_date = updateDto.endDate;
    }

    return client.orgMembership.update({
      where: { id: mappingId },
      data,
    });
  }

  async deleteOrgMembership(mappingId: number): Promise<OrgMembership> {
    return this.prisma.orgMembership.update({
      where: { id: mappingId },
      data: { end_date: new Date() },
    });
  }

  async hardDeleteOrgMembership(
    mappingId: number,
    tx?: PrismaTransactionClient,
  ): Promise<OrgMembership> {
    const client = tx ?? this.prisma;
    return client.orgMembership.delete({
      where: { id: mappingId },
    });
  }
}
