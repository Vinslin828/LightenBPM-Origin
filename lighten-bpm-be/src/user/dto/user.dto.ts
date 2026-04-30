import { ApiProperty } from '@nestjs/swagger';
import {
  User,
  OrgUnit,
  OrgMembership,
  UserDefaultOrg,
} from '../../common/types/common.types';

export class UserDto {
  @ApiProperty({ description: 'User ID' })
  id: number;

  @ApiProperty({
    type: String,
    description: 'User Code (External ID)',
    nullable: true,
  })
  code: string | null;

  @ApiProperty({ type: String, description: 'Cognito sub', nullable: true })
  sub: string | null;

  @ApiProperty({ type: String, description: 'User email', nullable: true })
  email: string | null;

  @ApiProperty({ description: 'User name' })
  name: string;

  @ApiProperty({ description: 'Job grade level' })
  jobGrade: number;

  @ApiProperty({ description: 'Default organization unit ID' })
  defaultOrgId: number;

  @ApiProperty({ description: 'Default organization unit Code' })
  defaultOrgCode: string;

  @ApiProperty({ type: Date, description: 'User creation timestamp' })
  createdAt: Date;

  @ApiProperty({
    type: Date,
    description: 'User last update timestamp',
    nullable: true,
  })
  updatedAt: Date | null;

  @ApiProperty({
    type: Date,
    description: 'Soft-delete timestamp; null if active',
    nullable: true,
  })
  deletedAt: Date | null;

  @ApiProperty({ description: 'is admin user', default: false })
  isAdmin: boolean;

  constructor(data: Partial<UserDto>) {
    Object.assign(this, data);
  }

  static fromPrisma(
    user: User & {
      isAdmin?: boolean;
      resolved_default_org?: OrgUnit;
      org_memberships?: (OrgMembership & { org_unit: OrgUnit })[];
      default_org_preference?: (UserDefaultOrg & { org_unit: OrgUnit }) | null;
    },
  ): UserDto {
    let resolvedOrgId = user.resolved_default_org?.id;
    let resolvedOrgCode = user.resolved_default_org?.code;

    // Local resolution if service-layer resolution is missing but data is available
    if (!resolvedOrgId && user.org_memberships) {
      const now = new Date();
      const activeMemberships = user.org_memberships.filter(
        (m) => m.end_date > now && m.start_date <= now,
      );

      if (activeMemberships.length === 1) {
        resolvedOrgId = activeMemberships[0].org_unit.id;
        resolvedOrgCode = activeMemberships[0].org_unit.code;
      } else if (activeMemberships.length > 1 && user.default_org_preference) {
        const preferredOrgId = user.default_org_preference.org_unit_id;
        const isPreferredActive = activeMemberships.some(
          (m) => m.org_unit_id === preferredOrgId,
        );
        if (isPreferredActive) {
          resolvedOrgId = user.default_org_preference.org_unit.id;
          resolvedOrgCode = user.default_org_preference.org_unit.code;
        }
      }
    }

    return new UserDto({
      id: user.id,
      code: user.code,
      sub: user.sub,
      email: user.email,
      name: user.name,
      jobGrade: user.job_grade,
      defaultOrgId: resolvedOrgId ?? 0,
      defaultOrgCode: resolvedOrgCode || '',
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      deletedAt: user.deleted_at,
      isAdmin: user.isAdmin || false,
    });
  }
}
