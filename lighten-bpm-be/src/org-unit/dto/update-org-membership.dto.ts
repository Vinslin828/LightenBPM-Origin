import { PartialType } from '@nestjs/swagger';
import { CreateOrgMembershipDto } from './create-org-membership.dto';

export class UpdateOrgMembershipDto extends PartialType(
  CreateOrgMembershipDto,
) {}
