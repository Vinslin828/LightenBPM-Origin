import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtDecoder } from '../auth/jwt-decoder';
import { AuthUser } from 'src/auth/types/auth-user';
import { FeatureFlagModule } from '../common/feature-flag/feature-flag.module';
import { DEFAULT_USER_LIMIT } from './dto/list-user-query.dto';

describe('UserController', () => {
  let controller: UserController;

  const mockUserService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateByCode: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      imports: [FeatureFlagModule],
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: PrismaService,
          useValue: {},
        },
        {
          provide: 'AuthGuard',
          useValue: {},
        },
        {
          provide: JwtDecoder,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('should return paginated response with default page=1 and limit=50', async () => {
      const mockUser = {
        id: 1,
        name: 'Alice',
        email: 'alice@example.com',
        code: 'U001',
        sub: null,
        job_grade: 1,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        default_org_id: 1,
        resolved_default_org: { id: 1, code: 'UNASSIGNED', name: 'Unassigned' },
        org_memberships: [],
        default_org_preference: null,
      };

      mockUserService.findAll.mockResolvedValue({
        items: [mockUser],
        total: 1,
      });

      const result = await controller.getUsers();

      expect(result.page).toEqual(1);
      expect(result.limit).toEqual(DEFAULT_USER_LIMIT);
      expect(result.total).toEqual(1);
      expect(result.totalPages).toEqual(1);
      expect(result.items).toHaveLength(1);
    });

    it('should reflect explicit page and limit in response', async () => {
      mockUserService.findAll.mockResolvedValue({ items: [], total: 25 });

      const result = await controller.getUsers({ page: 2, limit: 10 });

      expect(result.page).toEqual(2);
      expect(result.limit).toEqual(10);
      expect(result.total).toEqual(25);
      expect(result.totalPages).toEqual(3);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('updateUser', () => {
    it('should update a user when the user is an admin', async () => {
      const id = 1;
      const updateUserDto = { name: 'Updated Name' };
      const currentUser = { id: 2, bpmRole: 'admin' } as AuthUser;
      const updatedUser = {
        id,
        name: 'Updated Name',
        default_org: { code: 'ORG1' },
      };

      mockUserService.update.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(
        id,
        updateUserDto,
        currentUser,
      );

      expect(result).toBeDefined();
      expect(mockUserService.update).toHaveBeenCalledWith(
        id,
        updateUserDto,
        currentUser.id,
      );
    });

    it('should update a user when the user is updating their own profile', async () => {
      const id = 1;
      const updateUserDto = { name: 'Updated Name' };
      const currentUser = { id: 1, bpmRole: 'user' } as AuthUser;
      const updatedUser = {
        id,
        name: 'Updated Name',
        default_org: { code: 'ORG1' },
      };

      mockUserService.update.mockResolvedValue(updatedUser);

      const result = await controller.updateUser(
        id,
        updateUserDto,
        currentUser,
      );

      expect(result).toBeDefined();
      expect(mockUserService.update).toHaveBeenCalledWith(
        id,
        updateUserDto,
        currentUser.id,
      );
    });

    it('should throw ForbiddenException when a non-admin updates another user', async () => {
      const id = 1;
      const updateUserDto = { name: 'Updated Name' };
      const currentUser = { id: 2, bpmRole: 'user' } as AuthUser;

      await expect(
        controller.updateUser(id, updateUserDto, currentUser),
      ).rejects.toThrow('Only Admin is allowed to update profile of others');
    });
  });
});
