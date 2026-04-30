import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { UserRepository } from './repository/user.repository';
import { OrgUnitRepository } from '../org-unit/repository/org-unit.repository';
import { TransactionService } from '../prisma/transaction.service';
import { AssignType } from '../common/types/common.types';

describe('UserService', () => {
  let service: UserService;

  const mockUserRepository = {
    createUser: jest.fn(),
    updateUser: jest.fn(),
    findUserById: jest.fn(),
    findUserByCode: jest.fn(),
    findUserByCodeIncludingDeleted: jest.fn().mockResolvedValue(null),
    findUserByIdIncludingDeleted: jest.fn(),
    restoreUser: jest.fn(),
    findDefaultOrgPreference: jest.fn(),
    findAllUsers: jest.fn(),
  };

  const mockOrgUnitRepository = {
    findOrgUnitByCode: jest.fn(),
  };

  const mockTransactionService = {
    runTransaction: jest.fn((cb: (tx: unknown) => Promise<unknown>) =>
      cb({
        user: { create: jest.fn(), update: jest.fn() },
        orgMembership: {
          findFirst: jest.fn(),
          update: jest.fn(),
          create: jest.fn(),
          count: jest.fn(),
        },
        userDefaultOrg: { deleteMany: jest.fn(), upsert: jest.fn() },
      }),
    ),
  };

  const mockUnassignedOrg = { id: 1, code: 'UNASSIGNED', name: 'Unassigned' };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: OrgUnitRepository, useValue: mockOrgUnitRepository },
        { provide: TransactionService, useValue: mockTransactionService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);

    // Default mock for UNASSIGNED org
    mockOrgUnitRepository.findOrgUnitByCode.mockImplementation((code) => {
      if (code === 'UNASSIGNED') return Promise.resolve(mockUnassignedOrg);
      return Promise.resolve(null);
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update', () => {
    it('should update a user and respect defaultOrgId if defaultOrgCode is not provided', async () => {
      const id = 1;
      const actorId = 99;
      const updateDto = {
        name: 'Updated Name',
        defaultOrgId: 10,
      };

      const updatedUser = { id, name: 'Updated Name', org_memberships: [] };
      mockUserRepository.findUserById.mockResolvedValue(updatedUser);

      const result = await service.update(id, updateDto, actorId);

      expect(mockUserRepository.updateUser).toHaveBeenCalled();
      expect(result.name).toEqual('Updated Name');
      expect(result.resolved_default_org?.code).toEqual('UNASSIGNED');
    });
  });

  describe('create', () => {
    it('should create a user and resolve default org', async () => {
      const createUserDto = {
        code: 'USER001',
        name: 'Test User',
        jobGrade: 1,
        defaultOrgCode: 'ORG001',
      };
      const actorId = 99;

      const mockOrgUnit = { id: 2, code: 'ORG001' };
      const mockCreatedUser = {
        id: 1,
        ...createUserDto,
        org_memberships: [
          {
            org_unit: mockOrgUnit,
            end_date: new Date(Date.now() + 86400000),
            start_date: new Date(),
          },
        ],
      };

      mockOrgUnitRepository.findOrgUnitByCode.mockImplementation((code) => {
        if (code === 'ORG001') return Promise.resolve(mockOrgUnit);
        if (code === 'UNASSIGNED') return Promise.resolve(mockUnassignedOrg);
        return Promise.resolve(null);
      });
      mockUserRepository.createUser.mockResolvedValue(mockCreatedUser);
      mockUserRepository.findUserById.mockResolvedValue(mockCreatedUser);

      const result = await service.create(createUserDto, actorId);

      expect(result.code).toEqual('USER001');
      expect(result.resolved_default_org?.code).toEqual('ORG001');
    });
  });

  describe('resolveDefaultOrg fallback logic', () => {
    it('should pick the earliest created_at membership when same type and no preference', async () => {
      const now = new Date();
      const farFuture = new Date('2999-12-31');
      const createdEarlier = new Date(now.getTime() - 86400000 * 2);
      const createdLater = new Date(now.getTime() - 86400000);

      const mockUser = {
        id: 1,
        org_memberships: [
          {
            org_unit: { id: 10, code: 'NEWER' },
            org_unit_id: 10,
            assign_type: AssignType.USER,
            start_date: now,
            end_date: farFuture,
            created_at: createdLater,
          },
          {
            org_unit: { id: 5, code: 'OLDER' },
            org_unit_id: 5,
            assign_type: AssignType.USER,
            start_date: now,
            end_date: farFuture,
            created_at: createdEarlier,
          },
        ],
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);
      const result = await service.findOne(1);
      expect(result.resolved_default_org.code).toEqual('OLDER');
    });

    it('should prefer HEAD over USER membership when no preference is set', async () => {
      const now = new Date();
      const farFuture = new Date('2999-12-31');
      const createdAt = new Date(now.getTime() - 86400000);

      const mockUser = {
        id: 1,
        org_memberships: [
          {
            org_unit: { id: 20, code: 'USER_ORG' },
            org_unit_id: 20,
            assign_type: AssignType.USER,
            start_date: now,
            end_date: farFuture,
            created_at: createdAt,
          },
          {
            org_unit: { id: 30, code: 'HEAD_ORG' },
            org_unit_id: 30,
            assign_type: AssignType.HEAD,
            start_date: now,
            end_date: farFuture,
            created_at: new Date(now.getTime() - 86400000 * 2), // older, but still HEAD
          },
        ],
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);
      const result = await service.findOne(1);
      expect(result.resolved_default_org.code).toEqual('HEAD_ORG');
    });

    it('should respect valid preference even if a HEAD membership exists', async () => {
      const now = new Date();
      const farFuture = new Date('2999-12-31');
      const createdAt = new Date(now.getTime() - 86400000);

      const mockUser = {
        id: 1,
        org_memberships: [
          {
            org_unit: { id: 20, code: 'USER_ORG' },
            org_unit_id: 20,
            assign_type: AssignType.USER,
            start_date: now,
            end_date: farFuture,
            created_at: createdAt,
          },
          {
            org_unit: { id: 30, code: 'HEAD_ORG' },
            org_unit_id: 30,
            assign_type: AssignType.HEAD,
            start_date: now,
            end_date: farFuture,
            created_at: createdAt,
          },
        ],
        default_org_preference: {
          org_unit_id: 20,
          org_unit: { id: 20, code: 'USER_ORG' },
        },
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);
      const result = await service.findOne(1);
      expect(result.resolved_default_org.code).toEqual('USER_ORG');
    });

    it('should fallback to UNASSIGNED when no active memberships exist', async () => {
      const now = new Date();
      const past = new Date(now.getTime() - 86400000 * 10);
      const pastEnd = new Date(now.getTime() - 86400000);

      const mockUser = {
        id: 1,
        org_memberships: [
          {
            org_unit: { id: 5, code: 'EXPIRED' },
            org_unit_id: 5,
            assign_type: AssignType.USER,
            start_date: past,
            end_date: pastEnd,
            created_at: past,
          },
        ],
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);
      const result = await service.findOne(1);
      expect(result.resolved_default_org.code).toEqual('UNASSIGNED');
    });
  });

  describe('findAll', () => {
    it('should return paginated shape with enriched users', async () => {
      const mockUser = { id: 1, name: 'Alice', org_memberships: [] };
      mockUserRepository.findAllUsers.mockResolvedValue({
        items: [mockUser],
        total: 1,
      });

      const result = await service.findAll();

      expect(result.total).toEqual(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].resolved_default_org.code).toEqual('UNASSIGNED');
    });

    it('should forward pagination params to the repository', async () => {
      mockUserRepository.findAllUsers.mockResolvedValue({
        items: [],
        total: 0,
      });
      const query = { page: 2, limit: 10 };

      await service.findAll(query);

      expect(mockUserRepository.findAllUsers).toHaveBeenCalledWith(query);
    });

    it('should use DEFAULT_USER_LIMIT when no limit is provided', async () => {
      mockUserRepository.findAllUsers.mockResolvedValue({
        items: [],
        total: 100,
      });

      const result = await service.findAll();

      expect(result.total).toEqual(100);
      expect(mockUserRepository.findAllUsers).toHaveBeenCalledWith(undefined);
    });
  });
});
