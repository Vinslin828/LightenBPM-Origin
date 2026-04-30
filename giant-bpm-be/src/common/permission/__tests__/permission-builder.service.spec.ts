import { Test, TestingModule } from '@nestjs/testing';
import { PermissionBuilderService } from '../permission-builder.service';
import { AuthUser } from '../../../auth/types/auth-user';
import { GranteeType, PermissionAction } from '../../types/common.types';

describe('PermissionBuilderService', () => {
  let service: PermissionBuilderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PermissionBuilderService],
    }).compile();

    service = module.get<PermissionBuilderService>(PermissionBuilderService);
  });

  const mockUser: AuthUser = {
    id: 1,
    code: 'U001',
    sub: 'sub-1',
    name: 'Alice',
    email: 'alice@example.com',
    jobGrade: 5,
    defaultOrgCode: 'DEPT-1',
    orgIds: [101, 102],
    roleIds: [201, 202],
    createAt: new Date(),
    bpmRole: 'user',
  };

  const adminUser: AuthUser = {
    ...mockUser,
    id: 99,
    bpmRole: 'admin',
  };

  describe('getFormVisibilityWhere', () => {
    it('should return empty where for admin', () => {
      const result = service.getFormVisibilityWhere(adminUser);
      expect(result).toEqual({});
    });

    it('should return OR filter for normal user including creator and permissions', () => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const result = service.getFormVisibilityWhere(mockUser) as any;
      expect(result).toHaveProperty('OR');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const orArray = result.OR as any[];

      // Creator check
      expect(orArray).toContainEqual({ created_by: mockUser.id });

      // Permissions check
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const permissionsCheck = orArray.find((item) => item.permissions);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(permissionsCheck?.permissions.some.action).toBe(
        PermissionAction.VIEW,
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const granteeFilters = permissionsCheck?.permissions.some.OR;
      expect(granteeFilters).toContainEqual({
        grantee_type: GranteeType.EVERYONE,
      });
      expect(granteeFilters).toContainEqual({
        grantee_type: GranteeType.USER,
        grantee_value: '1',
      });
      // Verification of pre-fetched ID logic
      expect(granteeFilters).toContainEqual({
        grantee_type: GranteeType.ORG_UNIT,
        grantee_value: { in: ['101', '102'] },
      });
      expect(granteeFilters).toContainEqual({
        grantee_type: GranteeType.ROLE,
        grantee_value: { in: ['201', '202'] },
      });
    });
  });

  describe('canPerformAction', () => {
    it('should return true for admin', () => {
      expect(
        service.canPerformAction(adminUser, PermissionAction.MANAGE, []),
      ).toBe(true);
    });

    it('should return true for resource creator', () => {
      expect(
        service.canPerformAction(
          mockUser,
          PermissionAction.MANAGE,
          [],
          mockUser.id,
        ),
      ).toBe(true);
    });

    it('should return true for EVERYONE permission', () => {
      const perms = [
        {
          action: PermissionAction.VIEW,
          grantee_type: GranteeType.EVERYONE,
          grantee_value: '',
        },
      ];
      expect(
        service.canPerformAction(mockUser, PermissionAction.VIEW, perms),
      ).toBe(true);
    });

    it('should return true if user ID matches', () => {
      const perms = [
        {
          action: PermissionAction.VIEW,
          grantee_type: GranteeType.USER,
          grantee_value: '1',
        },
      ];
      expect(
        service.canPerformAction(mockUser, PermissionAction.VIEW, perms),
      ).toBe(true);
    });

    it('should return true if job grade matches', () => {
      const perms = [
        {
          action: PermissionAction.VIEW,
          grantee_type: GranteeType.JOB_GRADE,
          grantee_value: '3',
        },
      ]; // 3 <= 5
      expect(
        service.canPerformAction(mockUser, PermissionAction.VIEW, perms),
      ).toBe(true);
    });

    it('should return true if user is member of ORG_UNIT', () => {
      const perms = [
        {
          action: PermissionAction.VIEW,
          grantee_type: GranteeType.ORG_UNIT,
          grantee_value: '101',
        },
      ];
      expect(
        service.canPerformAction(mockUser, PermissionAction.VIEW, perms),
      ).toBe(true);
    });

    it('should return true if user is member of ROLE', () => {
      const perms = [
        {
          action: PermissionAction.VIEW,
          grantee_type: GranteeType.ROLE,
          grantee_value: '201',
        },
      ];
      expect(
        service.canPerformAction(mockUser, PermissionAction.VIEW, perms),
      ).toBe(true);
    });

    it('should return false if user is NOT member', () => {
      const perms = [
        {
          action: PermissionAction.VIEW,
          grantee_type: GranteeType.ORG_UNIT,
          grantee_value: '999',
        },
      ];
      expect(
        service.canPerformAction(mockUser, PermissionAction.VIEW, perms),
      ).toBe(false);
    });
  });
});
