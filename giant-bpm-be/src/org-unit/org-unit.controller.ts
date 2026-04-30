import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { OrgUnitService } from './org-unit.service';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExtraModels,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { OrgUnitDto } from './dto/org-unit.dto';
import { OrgMembershipDto } from './dto/org-membership.dto';
import { CreateOrgMembershipDto } from './dto/create-org-membership.dto';
import { UpdateOrgMembershipDto } from './dto/update-org-membership.dto';
import { OrgMemberDto } from './dto/org-members.dto';
import { ListOrgQueryDto } from './dto/list-org-query.dto';
import { ListOrgMembersQueryDto } from './dto/list-org-members-query.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { isAdminUser } from '../auth/types/auth-user';
import type { AuthUser } from '../auth/types/auth-user';
import { FeatureFlagGuard } from '../common/feature-flag/feature-flag.guard';
import { RequireFeature } from '../common/feature-flag/feature-flag.decorator';

@ApiTags('Organization Unit Management API')
@UseGuards(AuthGuard)
@ApiExtraModels(OrgUnitDto)
@Controller('org-units')
export class OrgUnitController {
  constructor(private readonly orgUnitService: OrgUnitService) {}

  @Post()
  @RequireFeature('orgUnitWriteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @ApiOperation({ summary: 'Create a new organization unit' })
  @ApiResponse({
    status: 201,
    description: 'The organization unit has been successfully created.',
    type: OrgUnitDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  create(
    @Body() createOrgUnitDto: CreateOrgUnitDto,
    @CurrentUser() user: AuthUser,
  ): Promise<OrgUnitDto> {
    return this.orgUnitService.create(createOrgUnitDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all organization units' })
  @ApiResponse({
    status: 200,
    description: 'List of organization units.',
    type: [OrgUnitDto],
  })
  findAll(@Query() listOrgQuery?: ListOrgQueryDto): Promise<OrgUnitDto[]> {
    return this.orgUnitService.findAll(listOrgQuery);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an organization unit by ID' })
  @ApiResponse({
    status: 200,
    description: 'The organization unit.',
    type: OrgUnitDto,
  })
  @ApiResponse({ status: 404, description: 'Organization unit not found.' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<OrgUnitDto> {
    return this.orgUnitService.findOne(id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted organization unit' })
  @ApiResponse({
    status: 200,
    description: 'The organization unit has been successfully restored.',
    type: OrgUnitDto,
  })
  @ApiResponse({ status: 404, description: 'Organization unit not found.' })
  @ApiResponse({
    status: 409,
    description: 'Organization unit is already active.',
  })
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<OrgUnitDto> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('Only Admin allow to restore OrgUnit');
    }
    return this.orgUnitService.restore(id);
  }

  @Patch(':id')
  @RequireFeature('orgUnitWriteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @ApiOperation({ summary: 'Update an organization unit' })
  @ApiResponse({
    status: 200,
    description: 'The organization unit has been successfully updated.',
    type: OrgUnitDto,
  })
  @ApiResponse({ status: 404, description: 'Organization unit not found.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrgUnitDto: UpdateOrgUnitDto,
  ): Promise<OrgUnitDto> {
    return this.orgUnitService.update(id, updateOrgUnitDto);
  }

  @Delete(':id')
  @RequireFeature('orgUnitWriteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @ApiOperation({ summary: 'Soft delete an organization unit' })
  @ApiResponse({
    status: 200,
    description: 'The organization unit has been successfully deleted.',
    type: OrgUnitDto,
  })
  @ApiResponse({ status: 404, description: 'Organization unit not found.' })
  remove(@Param('id', ParseIntPipe) id: number): Promise<OrgUnitDto> {
    return this.orgUnitService.remove(id);
  }

  @ApiExcludeEndpoint()
  @Delete(':id/hard')
  @RequireFeature('hardDeleteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @ApiOperation({ summary: 'Hard delete an organization unit' })
  async hardRemove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ): Promise<OrgUnitDto> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('Only Admin allow to hard remove OrgUnit');
    }
    return this.orgUnitService.hardRemove(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get an organization unit by Code' })
  @ApiResponse({
    status: 200,
    description: 'The organization unit.',
    type: OrgUnitDto,
  })
  @ApiResponse({ status: 404, description: 'Organization unit not found.' })
  findOneByCode(@Param('code') code: string): Promise<OrgUnitDto> {
    return this.orgUnitService.findByCode(code);
  }

  @Patch('code/:code')
  @ApiOperation({ summary: 'Update an organization unit by Code' })
  @ApiResponse({
    status: 200,
    description: 'The organization unit has been successfully updated.',
    type: OrgUnitDto,
  })
  @ApiResponse({ status: 404, description: 'Organization unit not found.' })
  updateByCode(
    @Param('code') code: string,
    @Body() updateOrgUnitDto: UpdateOrgUnitDto,
  ): Promise<OrgUnitDto> {
    return this.orgUnitService.updateByCode(code, updateOrgUnitDto);
  }

  @Delete('code/:code')
  @ApiOperation({ summary: 'Soft delete an organization unit by Code' })
  @ApiResponse({
    status: 200,
    description: 'The organization unit has been successfully deleted.',
    type: OrgUnitDto,
  })
  @ApiResponse({ status: 404, description: 'Organization unit not found.' })
  removeByCode(@Param('code') code: string): Promise<OrgUnitDto> {
    return this.orgUnitService.removeByCode(code);
  }

  @ApiExcludeEndpoint()
  @Delete('code/:code/hard')
  @RequireFeature('hardDeleteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @ApiOperation({ summary: 'Hard delete an organization unit by Code' })
  async hardRemoveByCode(
    @Param('code') code: string,
    @CurrentUser() user: AuthUser,
  ): Promise<OrgUnitDto> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'Only Admin allow to hard remove OrgUnit by code',
      );
    }
    return this.orgUnitService.hardRemoveByCode(code);
  }

  @Get('code/:code/heads')
  @ApiOperation({ summary: 'Get head for an organization unit by Code' })
  @ApiResponse({
    status: 200,
    description: 'List of head.',
    type: [OrgMemberDto],
  })
  @ApiResponse({ status: 404, description: 'Organization unit not found.' })
  getOrgUnitHeadsByCode(@Param('code') code: string): Promise<OrgMemberDto[]> {
    return this.orgUnitService.getOrgUnitHeadsByCode(code);
  }

  @Get('code/:code/users')
  @ApiOperation({ summary: 'Get all users for an organization unit by Code' })
  @ApiResponse({
    status: 200,
    description: 'List of users in the organization unit.',
    type: [OrgMemberDto],
  })
  @ApiResponse({ status: 404, description: 'Organization unit not found.' })
  getOrgUnitUsersByCode(
    @Param('code') code: string,
    @Query() query: ListOrgMembersQueryDto,
  ): Promise<OrgMemberDto[]> {
    return this.orgUnitService.getOrgUnitMembersByCode(code, query);
  }

  //Org Unit - User Mappings
  @Get(':id/heads')
  @ApiOperation({ summary: 'Get head for an organization unit' })
  @ApiResponse({
    status: 200,
    description: 'List of head.',
    type: [OrgMemberDto],
  })
  @ApiResponse({ status: 404, description: 'Organization unit not found.' })
  getOrgUnitHeads(
    @Param('id', ParseIntPipe) orgUnitId: number,
  ): Promise<OrgMemberDto[]> {
    return this.orgUnitService.getOrgUnitHeads(orgUnitId);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Get all users for an organization unit' })
  @ApiResponse({
    status: 200,
    description: 'List of users in the organization unit.',
    type: [OrgMemberDto],
  })
  @ApiResponse({ status: 404, description: 'Organization unit not found.' })
  getOrgUnitUsers(
    @Param('id', ParseIntPipe) orgUnitId: number,
    @Query() query: ListOrgMembersQueryDto,
  ): Promise<OrgMemberDto[]> {
    return this.orgUnitService.getOrgUnitMembers(orgUnitId, query);
  }

  @Post('memberships')
  @RequireFeature('orgMembershipWriteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @ApiOperation({ summary: 'Create a new user-organization unit membership' })
  @ApiResponse({
    status: 201,
    description: 'The membership has been successfully created.',
    type: OrgMembershipDto,
  })
  createOrgMembership(
    @Body() createOrgMembershipDto: CreateOrgMembershipDto,
    @CurrentUser() user: AuthUser,
  ): Promise<OrgMembershipDto> {
    return this.orgUnitService.createOrgMembership(
      createOrgMembershipDto,
      user.id,
    );
  }

  @Get('memberships/user/:userId')
  @ApiOperation({ summary: 'Get all organization unit memberships for a user' })
  @ApiResponse({
    status: 200,
    description: 'List of organization unit memberships for the user.',
    type: [OrgMemberDto],
  })
  getOrgMembershipsByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: ListOrgMembersQueryDto,
  ): Promise<OrgMemberDto[]> {
    return this.orgUnitService.getOrgMembershipsByUser(userId, query);
  }

  @Patch('memberships/:id')
  @RequireFeature('orgMembershipWriteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @ApiOperation({ summary: 'Update a user-organization unit membership' })
  @ApiResponse({
    status: 200,
    description: 'The membership has been successfully updated.',
    type: OrgMembershipDto,
  })
  @ApiResponse({ status: 404, description: 'Membership not found.' })
  updateOrgMembership(
    @Param('id', ParseIntPipe) membershipId: number,
    @Body() updateOrgMembershipDto: UpdateOrgMembershipDto,
  ): Promise<OrgMembershipDto> {
    return this.orgUnitService.updateOrgMembership(
      membershipId,
      updateOrgMembershipDto,
    );
  }

  @Delete('memberships/:id')
  @RequireFeature('orgMembershipWriteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @ApiOperation({ summary: 'Soft delete a user-organization unit membership' })
  @ApiResponse({
    status: 200,
    description: 'The membership has been successfully deleted.',
    type: OrgMembershipDto,
  })
  @ApiResponse({ status: 404, description: 'Membership not found.' })
  deleteOrgMembership(
    @Param('id', ParseIntPipe) membershipId: number,
  ): Promise<OrgMembershipDto> {
    return this.orgUnitService.deleteOrgMembership(membershipId);
  }

  @ApiExcludeEndpoint()
  @Delete('memberships/:id/hard')
  @RequireFeature('hardDeleteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @ApiOperation({ summary: 'Hard delete a user-organization unit membership' })
  @ApiResponse({
    status: 200,
    description: 'The membership has been successfully deleted.',
    type: OrgMembershipDto,
  })
  @ApiResponse({ status: 404, description: 'Membership not found.' })
  async hardDeleteOrgMembership(
    @Param('id', ParseIntPipe) membershipId: number,
    @CurrentUser() user: AuthUser,
  ): Promise<OrgMembershipDto> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'Only Admin allow to hard remove OrgMembership',
      );
    }
    return this.orgUnitService.hardDeleteOrgMembership(membershipId);
  }
}
