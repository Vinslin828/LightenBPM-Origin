import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  Delete,
  HttpCode,
  UseGuards,
  ForbiddenException,
  Logger,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiBody,
  ApiExcludeEndpoint,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import {
  PaginatedResponseDto,
  DEFAULT_PAGE,
} from '../common/dto/pagination.dto';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserDto } from './dto/user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  UpdateUserDefaultOrgDto,
  UserDefaultOrgDto,
} from './dto/user-default-org.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { isAdminUser } from '../auth/types/auth-user';
import type { AuthUser } from '../auth/types/auth-user';

import {
  DEFAULT_USER_LIMIT,
  ListUserQueryDto,
} from './dto/list-user-query.dto';
import { FeatureFlagGuard } from '../common/feature-flag/feature-flag.guard';
import { RequireFeature } from '../common/feature-flag/feature-flag.decorator';

@ApiTags('User Management')
@Controller('users')
@UseGuards(AuthGuard)
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({
    summary: 'Retrieve a list of users',
    operationId: 'getUsers',
  })
  @ApiPaginatedResponse(UserDto)
  async getUsers(
    @Query() query?: ListUserQueryDto,
  ): Promise<PaginatedResponseDto<UserDto>> {
    const { items, total } = await this.userService.findAll(query);
    const page = query?.page ?? DEFAULT_PAGE;
    const limit = query?.limit ?? DEFAULT_USER_LIMIT;
    return {
      items: items.map((user) => UserDto.fromPrisma(user)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    operationId: 'getCurrentUser',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile',
    type: UserDto,
  })
  async getCurrentUser(@CurrentUser() user: AuthUser): Promise<UserDto> {
    const userEntity = await this.userService.findOne(user.id);
    if (!userEntity) {
      // Should theoretically not happen for an authenticated user, but good practice
      throw new Error('Current user not found');
    }
    const userDto = UserDto.fromPrisma(userEntity);
    userDto.isAdmin = isAdminUser(user);
    return userDto;
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile (name, lang, etc.)',
    operationId: 'updateCurrentUser',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'Updated profile', type: UserDto })
  async updateCurrentUser(
    @CurrentUser() user: AuthUser,
    @Body() updateUserDto: Pick<UpdateUserDto, 'name' | 'lang'>,
  ): Promise<UserDto> {
    const updated = await this.userService.update(user.id, updateUserDto, user.id);
    const userDto = UserDto.fromPrisma(updated);
    userDto.isAdmin = isAdminUser(user);
    return userDto;
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a user by ID',
    operationId: 'getUserById',
  })
  @ApiResponse({ status: 200, description: 'User found', type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserDto | null> {
    const user = await this.userService.findOne(id);
    return user ? UserDto.fromPrisma(user) : null;
  }

  @Post()
  @RequireFeature('userWriteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @ApiOperation({
    summary: 'Create a new user',
    operationId: 'createUser',
  })
  @ApiBody({
    type: CreateUserDto,
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<UserDto> {
    this.logger.log(
      `createUser(${createUserDto.email}) by ${currentUser.id}/${currentUser.name}`,
    );
    const user = await this.userService.create(createUserDto, currentUser.id);
    return UserDto.fromPrisma(user);
  }

  @Patch(':id/restore')
  @RequireFeature('userWriteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @ApiOperation({
    summary: 'Restore a soft-deleted user',
    operationId: 'restoreUser',
  })
  @ApiResponse({
    status: 200,
    description: 'User restored successfully',
    type: UserDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'User is already active' })
  async restoreUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<UserDto> {
    if (!isAdminUser(currentUser)) {
      throw new ForbiddenException('Only Admin is allowed to restore users');
    }
    const user = await this.userService.restore(id);
    return UserDto.fromPrisma(user);
  }

  @Patch(':id')
  @RequireFeature('userWriteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @ApiOperation({
    summary: 'Update a user',
    operationId: 'updateUser',
  })
  @ApiBody({
    type: UpdateUserDto,
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    updateUserDto: Pick<
      UpdateUserDto,
      'name' | 'email' | 'jobGrade' | 'defaultOrgId'
    >,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<UserDto> {
    if (!isAdminUser(currentUser) && currentUser.id != id) {
      throw new ForbiddenException(
        'Only Admin is allowed to update profile of others',
      );
    }
    const user = await this.userService.update(
      id,
      updateUserDto,
      currentUser.id,
    );
    return UserDto.fromPrisma(user);
  }

  @ApiExcludeEndpoint()
  @Delete(':id/hard')
  @RequireFeature('hardDeleteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Hard delete a user (Permanently)',
    operationId: 'hardDeleteUser',
  })
  @ApiResponse({ status: 204, description: 'User permanently deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async hardDeleteUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<void> {
    if (!isAdminUser(currentUser)) {
      throw new ForbiddenException('Only allow admin to hard delete user');
    }
    await this.userService.hardRemove(id);
  }

  @Delete(':id')
  @RequireFeature('userWriteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a user',
    operationId: 'deleteUser',
  })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<void> {
    if (!isAdminUser(currentUser)) {
      throw new ForbiddenException('Only allow admin to delete user');
    }
    await this.userService.remove(id);
  }

  @Get('code/:code')
  @ApiOperation({
    summary: 'Get a user by Code',
    operationId: 'getUserByCode',
  })
  @ApiResponse({ status: 200, description: 'User found', type: UserDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserByCode(@Param('code') code: string): Promise<UserDto | null> {
    const user = await this.userService.findByCode(code);
    return user ? UserDto.fromPrisma(user) : null;
  }

  @Patch('code/:code')
  @RequireFeature('userWriteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @ApiOperation({
    summary: 'Update a user by Code',
    operationId: 'updateUserByCode',
  })
  @ApiBody({
    type: UpdateUserDto,
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserDto,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUserByCode(
    @Param('code') code: string,
    @Body()
    updateUserDto: Pick<
      UpdateUserDto,
      'name' | 'email' | 'jobGrade' | 'defaultOrgCode'
    >,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<UserDto> {
    // Note: Checking permission for "self update" via code is tricky without resolving ID first.
    // For now, restricting to Admin.
    if (!isAdminUser(currentUser)) {
      throw new ForbiddenException(
        'Only Admin is allowed to update profile by code',
      );
    }
    const user = await this.userService.updateByCode(
      code,
      updateUserDto,
      currentUser.id,
    );
    return UserDto.fromPrisma(user);
  }

  @Delete('code/:code')
  @RequireFeature('userWriteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a user by Code',
    operationId: 'deleteUserByCode',
  })
  @ApiResponse({ status: 204, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUserByCode(
    @Param('code') code: string,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<void> {
    if (!isAdminUser(currentUser)) {
      throw new ForbiddenException('Only allow admin to delete user');
    }
    await this.userService.removeByCode(code);
  }

  @Get(':id/default-org')
  @ApiOperation({
    summary: 'Get user default organization preference',
    operationId: 'getDefaultOrgPreference',
  })
  @ApiResponse({ status: 200, type: UserDefaultOrgDto })
  async getDefaultOrgPreference(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<UserDefaultOrgDto | null> {
    return this.userService.getDefaultOrgPreference(id);
  }

  @Patch(':id/default-org')
  @RequireFeature('orgMembershipWriteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @ApiOperation({
    summary: 'Update user default organization preference',
    operationId: 'updateDefaultOrgPreference',
  })
  @ApiBody({ type: UpdateUserDefaultOrgDto })
  @ApiResponse({
    status: 200,
    type: UserDto,
    description:
      'Default org preference updated. Returns the refreshed user with resolved defaultOrgId.',
  })
  async updateDefaultOrgPreference(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDefaultOrgDto,
    @CurrentUser() currentUser: AuthUser,
  ): Promise<UserDto> {
    if (!isAdminUser(currentUser) && currentUser.id !== id) {
      throw new ForbiddenException(
        'You can only update your own default organization preference',
      );
    }
    const user = await this.userService.updateDefaultOrgPreference(
      id,
      dto.orgUnitId,
    );
    return UserDto.fromPrisma(user);
  }
}
