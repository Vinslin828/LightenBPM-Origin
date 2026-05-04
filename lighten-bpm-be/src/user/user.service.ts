import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository, UserWithOrg } from './repository/user.repository';
import { OrgUnitRepository } from '../org-unit/repository/org-unit.repository';
import { ListUserQueryDto } from './dto/list-user-query.dto';
import { ORG_CODE_UNASSIGNED } from '../org-unit/types/org-unit.types';
import { OrgUnit, AssignType } from '../common/types/common.types';
import { UserDefaultOrgDto } from './dto/user-default-org.dto';
import { TransactionService } from '../prisma/transaction.service';
import {
  AUTO_RESTORE_ON_CREATE_CONFLICT,
  INDEFINITE_MEMBERSHIP_END_DATE,
} from '../common/constants';
import { PrismaTransactionClient } from '../prisma/transaction-client.type';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  private unassignedOrgCache: OrgUnit | null = null;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly orgUnitRepository: OrgUnitRepository,
    private readonly transactionService: TransactionService,
  ) {}

  private async getUnassignedOrg(): Promise<OrgUnit> {
    if (this.unassignedOrgCache) return this.unassignedOrgCache;
    const org =
      await this.orgUnitRepository.findOrgUnitByCode(ORG_CODE_UNASSIGNED);
    if (!org) {
      throw new Error(
        `UNASSIGNED organization (code: ${ORG_CODE_UNASSIGNED}) not found. Please ensure seed script has been run.`,
      );
    }
    this.unassignedOrgCache = org;
    return org;
  }

  /**
   * Resolves the default organization for a user based on active memberships
   * and explicit preferences.
   */
  async resolveDefaultOrg(user: UserWithOrg): Promise<OrgUnit> {
    const now = new Date();
    const activeMemberships = (user.org_memberships ?? []).filter((m) => {
      const start = new Date(m.start_date);
      const end = new Date(m.end_date);
      return end.getTime() > now.getTime() && start.getTime() <= now.getTime();
    });

    // Case 0: No active memberships -> Fallback to UNASSIGNED
    if (activeMemberships.length === 0) {
      return this.getUnassignedOrg();
    }

    // Case 1: Exactly 1 active membership
    if (activeMemberships.length === 1) {
      return activeMemberships[0].org_unit;
    }

    // Case 2: Multiple active memberships - check for configured preference
    if (user.default_org_preference) {
      const preferredOrgId = user.default_org_preference.org_unit_id;
      const preferredMembership = activeMemberships.find(
        (m) => m.org_unit_id === preferredOrgId,
      );
      if (preferredMembership) {
        return preferredMembership.org_unit;
      }
    }

    // Case 3: Multiple active memberships, no valid preference
    // Priority: HEAD > USER, then earliest created_at
    const sorted = [...activeMemberships].sort((a, b) => {
      if (a.assign_type !== b.assign_type) {
        return a.assign_type === AssignType.HEAD ? -1 : 1;
      }
      return (
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    });

    return sorted[0].org_unit;
  }

  private async enrichWithResolvedOrg(
    user: UserWithOrg | null,
  ): Promise<UserWithOrg | null> {
    if (!user) return null;
    const resolvedDefaultOrg = await this.resolveDefaultOrg(user);
    return {
      ...user,
      resolved_default_org: resolvedDefaultOrg,
      default_org_id: resolvedDefaultOrg.id,
    };
  }

  private async syncMembershipAndPreference(
    userId: number,
    orgUnitId: number,
    actorId: number,
    tx: PrismaTransactionClient,
  ) {
    const unassigned = await this.getUnassignedOrg();
    if (orgUnitId === unassigned.id) {
      await tx.userDefaultOrg.deleteMany({ where: { user_id: userId } });
      return;
    }

    const now = new Date();
    const endDate = INDEFINITE_MEMBERSHIP_END_DATE;

    // 1. Check if an active USER membership already exists
    const existing = await tx.orgMembership.findFirst({
      where: {
        user_id: userId,
        org_unit_id: orgUnitId,
        assign_type: AssignType.USER,
        end_date: { gt: now },
      },
    });

    if (existing) {
      await tx.orgMembership.update({
        where: { id: existing.id },
        data: {
          end_date: endDate,
          updated_by: actorId,
        },
      });
    } else {
      await tx.orgMembership.create({
        data: {
          user_id: userId,
          org_unit_id: orgUnitId,
          assign_type: AssignType.USER,
          start_date: now,
          end_date: endDate,
          created_by: actorId,
          updated_by: actorId,
        },
      });
    }

    // 2. Count all active memberships across all org types.
    //    Preference is meaningful whenever the user belongs to more than one org.
    const activeCount = await tx.orgMembership.count({
      where: {
        user_id: userId,
        end_date: { gt: now },
      },
    });

    if (activeCount > 1) {
      await tx.userDefaultOrg.upsert({
        where: { user_id: userId },
        create: { user_id: userId, org_unit_id: orgUnitId },
        update: { org_unit_id: orgUnitId },
      });
    } else {
      await tx.userDefaultOrg.deleteMany({ where: { user_id: userId } });
    }
  }

  async create(data: CreateUserDto, actorId: number): Promise<UserWithOrg> {
    const user = await this.transactionService.runTransaction(async (tx) => {
      const existing = await this.userRepository.findUserByCodeIncludingDeleted(
        data.code,
        tx,
      );

      if (existing) {
        if (!existing.deleted_at) {
          throw new ConflictException(
            `User with code ${data.code} already exists`,
          );
        }

        if (!AUTO_RESTORE_ON_CREATE_CONFLICT) {
          throw new ConflictException({
            code: 'USER_CODE_CONFLICT_DELETED',
            message: `User with code ${data.code} was previously deleted`,
            deletedId: existing.id,
            deletedAt: existing.deleted_at,
          });
        }

        // Auto-restore path (AUTO_RESTORE_ON_CREATE_CONFLICT = true)
        await this.userRepository.restoreUser(existing.id, tx);
        await this.userRepository.updateUser(
          existing.id,
          {
            name: data.name,
            email: data.email ?? null,
            job_grade: data.jobGrade,
          },
          tx,
        );

        if (data.defaultOrgCode) {
          const orgUnit = await this.orgUnitRepository.findOrgUnitByCode(
            data.defaultOrgCode,
            tx,
          );
          if (!orgUnit) {
            throw new NotFoundException(
              `Default OrgUnit with code ${data.defaultOrgCode} not found`,
            );
          }
          await this.syncMembershipAndPreference(
            existing.id,
            orgUnit.id,
            actorId,
            tx,
          );
        }
        return existing;
      }

      const newUser = await this.userRepository.createUser(
        {
          code: data.code,
          name: data.name,
          sub: data.sub ?? null,
          email: data.email ?? null,
          job_grade: data.jobGrade,
        },
        tx,
      );

      if (data.defaultOrgCode) {
        const orgUnit = await this.orgUnitRepository.findOrgUnitByCode(
          data.defaultOrgCode,
          tx,
        );
        if (!orgUnit) {
          throw new NotFoundException(
            `Default OrgUnit with code ${data.defaultOrgCode} not found`,
          );
        }
        await this.syncMembershipAndPreference(
          newUser.id,
          orgUnit.id,
          actorId,
          tx,
        );
      }
      return newUser;
    });

    const refreshedUser = await this.userRepository.findUserById(user.id);
    return (await this.enrichWithResolvedOrg(refreshedUser))!;
  }

  async restore(id: number): Promise<UserWithOrg> {
    const user = await this.userRepository.findUserByIdIncludingDeleted(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    if (!user.deleted_at) {
      throw new ConflictException(`User ${id} is already active`);
    }

    await this.userRepository.restoreUser(id);
    const refreshedUser = await this.userRepository.findUserById(id);
    return (await this.enrichWithResolvedOrg(refreshedUser))!;
  }

  async findAll(
    query?: ListUserQueryDto,
  ): Promise<{ items: UserWithOrg[]; total: number }> {
    const { items, total } = await this.userRepository.findAllUsers(query);
    const enriched = await Promise.all(
      items.map((u) => this.enrichWithResolvedOrg(u) as Promise<UserWithOrg>),
    );
    return { items: enriched, total };
  }

  async findOne(id: number): Promise<UserWithOrg | null> {
    const user = await this.userRepository.findUserById(id);
    return this.enrichWithResolvedOrg(user);
  }

  async findBySub(sub: string): Promise<UserWithOrg | null> {
    const user = await this.userRepository.findUserBySub(sub);
    return this.enrichWithResolvedOrg(user);
  }

  async findByCode(code: string): Promise<UserWithOrg | null> {
    const user = await this.userRepository.findUserByCode(code);
    return this.enrichWithResolvedOrg(user);
  }

  async update(
    id: number,
    data: UpdateUserDto,
    actorId: number,
  ): Promise<UserWithOrg> {
    try {
      await this.transactionService.runTransaction(async (tx) => {
        await this.userRepository.updateUser(
          id,
          {
            name: data.name,
            email: data.email,
            job_grade: data.jobGrade,
            ...(data.lang !== undefined && { lang: data.lang }),
          },
          tx,
        );

        let targetOrgUnitId: number | undefined;
        if (data.defaultOrgCode) {
          const orgUnit = await this.orgUnitRepository.findOrgUnitByCode(
            data.defaultOrgCode,
            tx,
          );
          if (!orgUnit) {
            throw new NotFoundException(
              `Default OrgUnit with code ${data.defaultOrgCode} not found`,
            );
          }
          targetOrgUnitId = orgUnit.id;
        } else if (data.defaultOrgId) {
          targetOrgUnitId = data.defaultOrgId;
        }

        if (targetOrgUnitId) {
          await this.syncMembershipAndPreference(
            id,
            targetOrgUnitId,
            actorId,
            tx,
          );
        }
      });

      const refreshedUser = await this.userRepository.findUserById(id);
      return (await this.enrichWithResolvedOrg(refreshedUser))!;
    } catch (e) {
      this.logger.error(`Failed to update user ${id}: ${e}`);
      throw e;
    }
  }

  async updateByCode(
    code: string,
    data: UpdateUserDto,
    actorId: number,
  ): Promise<UserWithOrg> {
    const user = await this.userRepository.findUserByCode(code);
    if (!user) {
      throw new Error(`User with code ${code} not found`);
    }
    return this.update(user.id, data, actorId);
  }

  async remove(id: number): Promise<UserWithOrg> {
    const user = await this.userRepository.delete(id);
    return (await this.enrichWithResolvedOrg(user))!;
  }

  async hardRemove(id: number): Promise<UserWithOrg> {
    const user = await this.userRepository.hardDelete(id);
    return (await this.enrichWithResolvedOrg(user))!;
  }

  async removeByCode(code: string): Promise<UserWithOrg> {
    const user = await this.userRepository.findUserByCode(code);
    if (!user) {
      throw new Error(`User with code ${code} not found`);
    }
    return this.remove(user.id);
  }

  async getSystemUser(): Promise<UserWithOrg> {
    const user = await this.userRepository.getSystemUser();
    return (await this.enrichWithResolvedOrg(user))!;
  }

  /**
   * Finds multiple users by their IDs
   * @param ids - Array of user IDs
   * @returns Array of users
   */
  async findByIds(ids: number[]): Promise<UserWithOrg[]> {
    const users = await this.userRepository.findUsers(ids);
    return Promise.all(
      users.map((u) => this.enrichWithResolvedOrg(u) as Promise<UserWithOrg>),
    );
  }

  async getDefaultOrgPreference(
    userId: number,
  ): Promise<UserDefaultOrgDto | null> {
    const preference =
      await this.userRepository.findDefaultOrgPreference(userId);
    if (!preference) return null;
    return {
      userId: preference.user_id,
      orgUnitId: preference.org_unit_id,
      orgUnitCode: preference.org_unit.code,
      orgUnitName: preference.org_unit.name,
      updatedAt: preference.updated_at,
    };
  }

  async updateDefaultOrgPreference(
    userId: number,
    orgUnitId: number,
  ): Promise<UserWithOrg> {
    const user = await this.userRepository.findUserById(userId);
    if (!user) throw new NotFoundException(`User ${userId} not found`);

    const now = new Date();

    // Require any active membership (HEAD or USER) for the target org.
    // HEAD memberships are first-class in default-org resolution (HEAD > USER fallback),
    // so a user may explicitly prefer a HEAD org just as validly as a USER org.
    const isActiveMembership = (user.org_memberships ?? []).some(
      (m) =>
        m.org_unit_id === orgUnitId && m.end_date > now && m.start_date <= now,
    );

    if (!isActiveMembership) {
      throw new BadRequestException(
        `Organization ${orgUnitId} does not have an active membership for user ${userId}`,
      );
    }

    await this.userRepository.upsertDefaultOrgPreference(userId, orgUnitId);

    // Return a fully refreshed UserWithOrg so the caller gets the resolved defaultOrgId
    // in a single round trip without a follow-up GET.
    const refreshed = await this.userRepository.findUserById(userId);
    return (await this.enrichWithResolvedOrg(refreshed))!;
  }
}
