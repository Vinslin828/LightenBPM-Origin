import { ApiProperty } from '@nestjs/swagger';
import { AssignType, OrgUnitType } from '../../common/types/common.types';
import { UserDto } from '../../user/dto/user.dto';
import { OrgUnitWithRelations } from '../types/org-unit.types';

export class OrgUnitDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  code: string;

  @ApiProperty()
  name: string;

  @ApiProperty({
    description: 'Localized organization names keyed by language code',
    example: { en: 'Engineering Department', 'zh-TW': '工程部' },
    required: false,
    type: Object,
  })
  nameTranslations?: Record<string, string>;

  @ApiProperty({ enum: OrgUnitType })
  type: OrgUnitType;

  @ApiProperty({ type: () => OrgUnitDto, required: false, nullable: true })
  parent?: OrgUnitDto | null;

  @ApiProperty({ type: () => [OrgUnitDto], required: false })
  children?: OrgUnitDto[];

  @ApiProperty({ type: () => [UserDto] })
  members: UserDto[];

  @ApiProperty({ type: () => [UserDto] })
  heads: UserDto[];

  @ApiProperty({ type: Date })
  createdAt: Date;

  @ApiProperty({ type: Date, nullable: true })
  updatedAt: Date | null;

  @ApiProperty({ type: Date, nullable: true })
  deletedAt: Date | null;

  static fromPrisma(orgUnit: OrgUnitWithRelations): OrgUnitDto {
    const dto = new OrgUnitDto();
    dto.id = orgUnit.id;
    dto.code = orgUnit.code;
    dto.name = orgUnit.name;
    dto.nameTranslations = orgUnit.translations?.reduce(
      (acc, translation) => {
        acc[translation.lang] = translation.name;
        return acc;
      },
      {} as Record<string, string>,
    );
    dto.type = orgUnit.type;
    dto.createdAt = orgUnit.created_at;
    dto.updatedAt = orgUnit.updated_at;
    dto.deletedAt = orgUnit.deleted_at;
    dto.parent = orgUnit.parent
      ? OrgUnitDto.fromPrisma(orgUnit.parent)
      : undefined;
    dto.children =
      orgUnit.children?.map((child) => OrgUnitDto.fromPrisma(child)) ??
      undefined;
    dto.members =
      orgUnit.members?.map((member) => UserDto.fromPrisma(member.user)) ?? [];
    dto.heads =
      orgUnit.members
        ?.filter((m) => m.assign_type === AssignType.HEAD)
        .map((m) => UserDto.fromPrisma(m.user)) ?? [];
    return dto;
  }
}
