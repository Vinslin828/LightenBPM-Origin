import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import { Prisma } from '@prisma/client';
import { User } from '../common/types/common.types';
import { OrgUnitDto } from './dto/org-unit.dto';
import { OrgMembershipDto } from './dto/org-membership.dto';
import { CreateOrgMembershipDto } from './dto/create-org-membership.dto';
import { UpdateOrgMembershipDto } from './dto/update-org-membership.dto';
import { UserService } from '../user/user.service';
import { OrgUnitRepository } from './repository/org-unit.repository';
import { TransactionService } from '../prisma/transaction.service';
import { OrgMemberDto } from './dto/org-members.dto';
import { ListOrgQueryDto } from './dto/list-org-query.dto';
import { ListOrgMembersQueryDto } from './dto/list-org-members-query.dto';
import { OrgUnitWithRelations } from './types/org-unit.types';
import {
  AUTO_RESTORE_ON_CREATE_CONFLICT,
  INDEFINITE_MEMBERSHIP_END_DATE,
} from '../common/constants';

@Injectable()
export class OrgUnitService {
  constructor(
    private readonly orgUnitRepository: OrgUnitRepository,
    private readonly userService: UserService,
    private readonly transactionService: TransactionService,
  ) {}

  async create(
    createOrgUnitDto: CreateOrgUnitDto,
    userId: number,
  ): Promise<OrgUnitDto> {
    try {
      const orgUnit = await this.transactionService.runTransaction(
        async (tx) => {
          const existing =
            await this.orgUnitRepository.findOrgUnitByCodeIncludingDeleted(
              createOrgUnitDto.code,
              tx,
            );

          if (existing) {
            if (!existing.deleted_at) {
              throw new ConflictException(
                `OrgUnit with code ${createOrgUnitDto.code} already exists`,
              );
            }

            if (!AUTO_RESTORE_ON_CREATE_CONFLICT) {
              throw new ConflictException({
                code: 'ORG_UNIT_CODE_CONFLICT_DELETED',
                message: `OrgUnit with code ${createOrgUnitDto.code} was previously deleted`,
                deletedId: existing.id,
                deletedAt: existing.deleted_at,
              });
            }

            // Auto-restore path (AUTO_RESTORE_ON_CREATE_CONFLICT = true)
            await this.orgUnitRepository.restoreOrgUnit(existing.id, tx);
            await this.orgUnitRepository.updateOrgUnit(
              existing.id,
              {
                name: createOrgUnitDto.name,
                type: createOrgUnitDto.type,
                parentCode: createOrgUnitDto.parentCode,
              },
              tx,
            );
            // Re-read inside the tx to return full relations (updateOrgUnit returns bare OrgUnit)
            return this.orgUnitRepository.findOrgUnitByIdIncludingDeleted(
              existing.id,
              tx,
            );
          }

          return this.orgUnitRepository.createOrgUnit(
            createOrgUnitDto,
            userId,
            tx,
          );
        },
      );

      return OrgUnitDto.fromPrisma(orgUnit as OrgUnitWithRelations);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          const field =
            (error.meta?.constraint as string) ?? 'unknown constraint';
          throw new NotFoundException(
            `DB contraint violated: ${field} not found; ${JSON.stringify(createOrgUnitDto)}`,
          );
        }
      }
      throw error;
    }
  }

  async restore(id: number): Promise<OrgUnitDto> {
    const orgUnit =
      await this.orgUnitRepository.findOrgUnitByIdIncludingDeleted(id);
    if (!orgUnit) {
      throw new NotFoundException(`OrgUnit with ID ${id} not found`);
    }
    if (!orgUnit.deleted_at) {
      throw new ConflictException(`OrgUnit ${id} is already active`);
    }

    await this.orgUnitRepository.restoreOrgUnit(id);
    const restored = await this.orgUnitRepository.findOrgUnitById(id);
    return OrgUnitDto.fromPrisma(restored!);
  }

  async findAll(query?: ListOrgQueryDto): Promise<OrgUnitDto[]> {
    const orgUnits = await this.orgUnitRepository.findAllOrgUnits(query);
    return orgUnits.map((orgUnit) => OrgUnitDto.fromPrisma(orgUnit));
  }

  async findOne(id: number): Promise<OrgUnitDto> {
    const orgUnit = await this.orgUnitRepository.findOrgUnitById(id);

    if (!orgUnit) {
      throw new NotFoundException(`OrgUnit with ID ${id} not found`);
    }

    return OrgUnitDto.fromPrisma(orgUnit);
  }

  async findByCode(code: string): Promise<OrgUnitDto> {
    const orgUnit = await this.orgUnitRepository.findOrgUnitByCode(code);

    if (!orgUnit) {
      throw new NotFoundException(`OrgUnit with Code ${code} not found`);
    }

    return OrgUnitDto.fromPrisma(orgUnit);
  }

  async update(
    id: number,
    updateOrgUnitDto: UpdateOrgUnitDto,
  ): Promise<OrgUnitDto> {
    const orgUnit = await this.orgUnitRepository.updateOrgUnit(
      id,
      updateOrgUnitDto,
    );
    return OrgUnitDto.fromPrisma(orgUnit);
  }

  async remove(id: number): Promise<OrgUnitDto> {
    try {
      const orgUnit = await this.orgUnitRepository.deleteOrgUnit(id);
      return OrgUnitDto.fromPrisma(orgUnit);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`OrgUnit with ID ${id} not found`);
        }
        if (error.code === 'P2003') {
          throw new ForbiddenException(
            `Cannot delete OrgUnit with ID ${id} as it is referenced by other records.`,
          );
        }
      }
      throw error;
    }
  }

  async updateByCode(
    code: string,
    updateOrgUnitDto: UpdateOrgUnitDto,
  ): Promise<OrgUnitDto> {
    const orgUnit = await this.orgUnitRepository.updateOrgUnitByCode(
      code,
      updateOrgUnitDto,
    );
    return OrgUnitDto.fromPrisma(orgUnit);
  }

  async removeByCode(code: string): Promise<OrgUnitDto> {
    try {
      const orgUnit = await this.orgUnitRepository.deleteOrgUnitByCode(code);
      return OrgUnitDto.fromPrisma(orgUnit);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`OrgUnit with Code ${code} not found`);
        }
      }
      throw error;
    }
  }

  async hardRemove(id: number): Promise<OrgUnitDto> {
    try {
      const orgUnit = await this.orgUnitRepository.hardDeleteOrgUnit(id);
      return OrgUnitDto.fromPrisma(orgUnit);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`OrgUnit with ID ${id} not found`);
        }
      }
      throw error;
    }
  }

  async hardRemoveByCode(code: string): Promise<OrgUnitDto> {
    try {
      const orgUnit =
        await this.orgUnitRepository.hardDeleteOrgUnitByCode(code);
      return OrgUnitDto.fromPrisma(orgUnit);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(`OrgUnit with Code ${code} not found`);
        }
      }
      throw error;
    }
  }

  async createOrgMembership(
    createDto: CreateOrgMembershipDto,
    creatorId: number,
  ): Promise<OrgMembershipDto> {
    try {
      const orgUnit = await this.orgUnitRepository.findOrgUnitByCode(
        createDto.orgUnitCode,
      );
      if (!orgUnit) {
        throw new NotFoundException(
          `OrgUnit with code ${createDto.orgUnitCode} not found`,
        );
      }

      const endDate = createDto.isIndefinite
        ? INDEFINITE_MEMBERSHIP_END_DATE
        : (createDto.endDate ?? INDEFINITE_MEMBERSHIP_END_DATE);

      const overlap = await this.orgUnitRepository.findOverlappingMembership(
        createDto.userId,
        orgUnit.id,
        new Date(createDto.startDate),
        new Date(endDate),
      );

      if (overlap) {
        throw new BadRequestException(
          `Overlapping membership detected for user ${createDto.userId} in org unit ${createDto.orgUnitCode} between ${new Date(createDto.startDate).toISOString()} and ${new Date(endDate).toISOString()}`,
        );
      }

      const mapping = await this.orgUnitRepository.createOrgMembership(
        createDto,
        creatorId,
      );
      return OrgMembershipDto.fromPrisma(mapping);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        console.log(`Prisma Error: ${JSON.stringify(e.meta)}`);
        if (e.code == 'P2003') {
          const field = (e.meta?.constraint as string) ?? 'unknown constraint';
          throw new NotFoundException(
            `DB contraint violated: ${field} not found (userId = ${createDto.userId}, orgUnitCode = ${createDto.orgUnitCode})`,
          );
        }
      }
      throw e;
    }
  }

  async getOrgUnitHeads(orgUnitId: number): Promise<OrgMemberDto[]> {
    const mappings =
      await this.orgUnitRepository.findOrgUnitHeadMemberships(orgUnitId);
    return mappings.map((mapping) => OrgMemberDto.fromPrisma(mapping));
  }

  async getOrgUnitHeadUsers(orgUnitId: number): Promise<User[]> {
    const users =
      await this.orgUnitRepository.getOrgUnitHeadUserList(orgUnitId);
    return users;
  }

  async getOrgUnitMembers(
    orgUnitId: number,
    query?: ListOrgMembersQueryDto,
  ): Promise<OrgMemberDto[]> {
    const mappings = await this.orgUnitRepository.findOrgUnitMemberships(
      orgUnitId,
      query,
    );
    return mappings.map((mapping) => OrgMemberDto.fromPrisma(mapping));
  }

  async getOrgUnitMemberUsers(orgUnitId: number): Promise<User[]> {
    const users =
      await this.orgUnitRepository.getOrgUnitMemberUserList(orgUnitId);
    return users;
  }

  async getOrgUnitHeadsByCode(code: string): Promise<OrgMemberDto[]> {
    const mappings =
      await this.orgUnitRepository.findOrgUnitHeadMembershipsByCode(code);
    return mappings.map((mapping) => OrgMemberDto.fromPrisma(mapping));
  }

  async getOrgUnitMembersByCode(
    code: string,
    query?: ListOrgMembersQueryDto,
  ): Promise<OrgMemberDto[]> {
    const mappings = await this.orgUnitRepository.findOrgUnitMembershipsByCode(
      code,
      query,
    );
    return mappings.map((mapping) => OrgMemberDto.fromPrisma(mapping));
  }

  async getOrgUnitsByUser(userId: number): Promise<OrgUnitDto[]> {
    const mappings =
      await this.orgUnitRepository.findOrgMembershipsByUserId(userId);
    return mappings.map((mapping) => OrgUnitDto.fromPrisma(mapping.org_unit));
  }

  async getOrgMembershipsByUser(
    userId: number,
    query?: ListOrgMembersQueryDto,
  ): Promise<OrgMemberDto[]> {
    const mappings =
      await this.orgUnitRepository.findOrgMembershipsByUserIdWithUserAndOrgUnit(
        userId,
        query,
      );
    return mappings.map((mapping) => OrgMemberDto.fromPrisma(mapping));
  }

  async updateOrgMembership(
    mappingId: number,
    updateDto: UpdateOrgMembershipDto,
  ): Promise<OrgMembershipDto> {
    const existing =
      await this.orgUnitRepository.prisma.orgMembership.findUnique({
        where: { id: mappingId },
      });

    if (!existing) {
      throw new NotFoundException(`Membership with ID ${mappingId} not found`);
    }

    const startDate = updateDto.startDate
      ? new Date(updateDto.startDate)
      : existing.start_date;

    let endDate: Date;
    if (updateDto.isIndefinite) {
      endDate = INDEFINITE_MEMBERSHIP_END_DATE;
    } else if (updateDto.endDate) {
      endDate = new Date(updateDto.endDate);
    } else {
      endDate = existing.end_date;
    }

    const overlap = await this.orgUnitRepository.findOverlappingMembership(
      existing.user_id,
      existing.org_unit_id,
      startDate,
      endDate,
      mappingId,
    );

    if (overlap) {
      throw new BadRequestException(
        `Overlapping membership detected for user ${existing.user_id} in org unit ${existing.org_unit_id} between ${new Date(startDate).toISOString()} and ${new Date(endDate).toISOString()}`,
      );
    }

    const mapping = await this.orgUnitRepository.updateOrgMembership(
      mappingId,
      updateDto,
    );
    return OrgMembershipDto.fromPrisma(mapping);
  }

  async deleteOrgMembership(mappingId: number): Promise<OrgMembershipDto> {
    try {
      const mapping =
        await this.orgUnitRepository.deleteOrgMembership(mappingId);
      return OrgMembershipDto.fromPrisma(mapping);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            `MemberShip with ID ${mappingId} not found`,
          );
        }
      }
      throw error;
    }
  }

  async hardDeleteOrgMembership(mappingId: number): Promise<OrgMembershipDto> {
    try {
      const mapping =
        await this.orgUnitRepository.hardDeleteOrgMembership(mappingId);
      return OrgMembershipDto.fromPrisma(mapping);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException(
            `MemberShip with ID ${mappingId} not found`,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Gets users by role ID (role is stored as OrgUnit with type ROLE)
   * @param roleId - The role ID (org_unit id where type = ROLE)
   * @returns Array of users with that role
   */
  async getUsersByRoleId(roleId: number): Promise<User[]> {
    const memberships = await this.getOrgUnitMembers(roleId);
    const userIds = memberships.map((m) => m.user.id);
    return this.userService.findByIds(userIds);
  }

  /**
   * Gets the reporting line for a user within an organization
   *
   * Logic:
   * - Traverse up the org hierarchy
   * - At each org level, find the FIRST HEAD with job_grade higher than current highest
   * - Continue until reaching toLevel (number of people) or toJobGrade (job grade threshold)
   *
   * @param userId - The user ID
   * @param orgUnitId - The organization unit ID to start from
   * @param toJobGrade - Optional: Stop when reaching this job grade (inclusive)
   * @param toLevel - Optional: Stop after finding this many people (e.g., 1 = direct manager, 2 = manager's manager)
   * @returns Array of users in the reporting line (ordered from immediate manager to highest)
   */
  async getReportingLine(
    userId: number,
    orgUnitId: number,
    toJobGrade?: number,
    toLevel?: number,
  ): Promise<User[]> {
    const reportingLine: User[] = [];
    let currentOrgId: number | null = orgUnitId;

    // Get the user to determine their job grade
    const user = await this.userService.findOne(userId);

    if (!user) {
      return [];
    }

    // Track the current highest job grade in the reporting line
    // Start with the user's job grade
    // let currentHighestGrade = user.job_grade;

    // Traverse up the org hierarchy
    while (currentOrgId) {
      // Get heads of current org unit
      const headMemberships = await this.getOrgUnitHeads(currentOrgId);
      const headUserIds = headMemberships.map((m) => m.user.id);
      const heads = await this.userService.findByIds(headUserIds);

      // Find the FIRST head with job_grade higher than current highest
      // Sort heads by job_grade ascending to get the lowest qualifying head first
      const sortedHeads = heads
        .filter((head) => head.id !== userId)
        .sort((a, b) => a.job_grade - b.job_grade);

      if (sortedHeads.length > 0) {
        const nextHead = sortedHeads[0];
        reportingLine.push(nextHead);
        // currentHighestGrade = nextHead.job_grade;

        // Check if we've reached the target level (number of people)
        if (toLevel && reportingLine.length >= toLevel) {
          return reportingLine;
        }

        // Check if we've reached the target job grade
        if (toJobGrade && nextHead.job_grade >= toJobGrade) {
          return reportingLine;
        }
      }

      // Move to parent org unit
      const currentOrg =
        await this.orgUnitRepository.findOrgUnitById(currentOrgId);

      if (!currentOrg || !currentOrg.parent) {
        break;
      }

      currentOrgId = currentOrg.parent.id;
    }

    return reportingLine;
  }
}
