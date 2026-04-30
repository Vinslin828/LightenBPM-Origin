import { ApiProperty } from '@nestjs/swagger';
import { OrgMembership, AssignType } from '../../common/types/common.types';

export class OrgMembershipDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  orgUnitId: number;

  //@deprecated('Use orgUnitCode instead')
  @ApiProperty()
  orgUnitCode: string;

  @ApiProperty()
  userId: number;

  @ApiProperty({ enum: AssignType })
  assignType: AssignType;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty({ nullable: true })
  note?: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty({ nullable: true })
  updatedAt: Date | null;

  static fromPrisma(
    mapping: OrgMembership & { org_unit?: { code: string } },
  ): OrgMembershipDto {
    const dto = new OrgMembershipDto();
    dto.id = mapping.id;
    dto.orgUnitId = mapping.org_unit_id;
    dto.userId = mapping.user_id;
    dto.assignType = mapping.assign_type;
    dto.startDate = mapping.start_date;
    dto.endDate = mapping.end_date;
    dto.note = mapping.note;
    dto.createdAt = mapping.created_at;
    dto.updatedAt = mapping.updated_at;
    return dto;
  }
}
