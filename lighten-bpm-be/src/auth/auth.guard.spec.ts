import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from './auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { JwtDecoder } from './jwt-decoder';
import { UserService } from '../user/user.service';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { IdToken } from './types';

describe('AuthGuard', () => {
  let guard: AuthGuard;

  const mockUserService = {
    findBySub: jest.fn(),
    create: jest.fn(),
  };

  const mockDecoder = {
    decode: jest.fn(),
  };

  const mockPrisma = {
    orgUnit: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        { provide: UserService, useValue: mockUserService },
        { provide: JwtDecoder, useValue: mockDecoder },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    guard = module.get<AuthGuard>(AuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access if user exists', async () => {
      const mockRequest = {
        headers: { authorization: 'Bearer token' },
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as unknown as ExecutionContext;

      const mockToken: IdToken = {
        sub: 'sub-123',
        name: 'Test User',
        email: 'test@example.com',
        BPM_Role: 'user',
      };

      const mockUser = {
        id: 1,
        code: 'USER001',
        sub: 'sub-123',
        name: 'Test User',
        email: 'test@example.com',
        job_grade: 1,
        resolved_default_org: { id: 1, code: 'UNASSIGNED' },
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDecoder.decode.mockReturnValue(mockToken);
      mockUserService.findBySub.mockResolvedValue(mockUser);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockRequest['user']).toBeDefined();
      expect((mockRequest as { user: { sub: string } }).user.sub).toBe(
        'sub-123',
      );
    });

    it('should create user if not exists (with optional email)', async () => {
      const mockRequest = {
        headers: { authorization: 'Bearer token' },
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as unknown as ExecutionContext;

      const mockToken: IdToken = {
        sub: 'sub-456',
        name: 'No Email User',
        // email is missing
        BPM_Role: 'user',
      };

      const mockCreatedUser = {
        id: 2,
        code: 'sub-456',
        sub: 'sub-456',
        name: 'No Email User',
        email: null,
        job_grade: 1,
        resolved_default_org: { id: 1, code: 'UNASSIGNED' },
        created_at: new Date(),
        updated_at: new Date(),
      };

      mockDecoder.decode.mockReturnValue(mockToken);
      mockUserService.findBySub.mockResolvedValue(null);
      mockPrisma.orgUnit.findUnique.mockResolvedValue({ code: 'UNASSIGNED' });
      mockUserService.create.mockResolvedValue(mockCreatedUser);

      const result = await guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockUserService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'sub-456',
          email: undefined,
        }),
        0,
      );
      expect(
        (mockRequest as { user: { email: string | null } }).user.email,
      ).toBeNull();
    });

    it('should throw UnauthorizedException if auth header is missing', async () => {
      const mockRequest = {
        headers: {},
      };
      const mockContext = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as unknown as ExecutionContext;

      await expect(guard.canActivate(mockContext)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
