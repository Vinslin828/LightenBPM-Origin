import { ApiProperty } from '@nestjs/swagger';
import { AssignType } from '../../common/types/common.types';
import { OrgMember } from '../types';
import { UserDto } from '../../user/dto/user.dto';

export class OrgMemberDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  orgUnitCode: string;

  @ApiProperty({ type: () => UserDto })
  user: UserDto;

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

  static fromPrisma(mapping: OrgMember): OrgMemberDto {
    const dto = new OrgMemberDto();
    dto.id = mapping.id;
    dto.orgUnitCode = mapping.org_unit?.code || '';
    dto.user = UserDto.fromPrisma(mapping.user);
    dto.assignType = mapping.assign_type;
    dto.startDate = mapping.start_date;
    dto.endDate = mapping.end_date;
    dto.note = mapping.note;
    dto.createdAt = mapping.created_at;
    dto.updatedAt = mapping.updated_at;
    return dto;
  }
}
