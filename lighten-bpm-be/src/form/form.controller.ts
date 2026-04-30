import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  NotFoundException,
  UseGuards,
  Patch,
  Query,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { FormDto } from './dto/form.dto';
import { CreateFormDto } from './dto/create-form.dto';
import { CreateFormResponseDto } from './dto/create-form-response.dto';
import { FormService } from './form.service';
import { ListFormRespDto } from './dto/list-form-resp.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateFormDto } from './dto/update-form.dto';
import { UpdateFormRevisionDto } from './dto/update-form-version.dto';
import { FormRevisionDto } from './dto/form-revision.dto';
import { CreateFormRevisionDto } from './dto/create-form-revision.dto';
import {
  BadRequestResponseDto,
  InternalServerErrorResponseDto,
} from '../common/dto/error-response.dto';
import { isAdminUser } from '../auth/types/auth-user';
import type { AuthUser } from '../auth/types/auth-user';
import { FormRevisionWithTagsDto } from './dto/form-revision-with-tags.dto';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGINATION_LIMIT,
  PaginatedResponseDto,
} from '../common/dto/pagination.dto';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { ListFormsQueryDto } from './dto/list-forms-query.dto';
import { ResolvedFormDto } from './dto/resolved-form.dto';

import {
  AggregatedFormPermissionDto,
  CreateFormPermissionDto,
  FormPermissionDto,
} from './dto/form-permission.dto';
import { DeletePermissionsQueryDto } from '../common/dto/permission-query.dto';
import { MigrationService } from '../migration/migration.service';
import { FeatureFlagGuard } from '../common/feature-flag/feature-flag.guard';
import { RequireFeature } from '../common/feature-flag/feature-flag.decorator';

@ApiTags('Form Management')
@Controller('form')
@UseGuards(AuthGuard)
export class FormController {
  private readonly logger = new Logger(FormController.name);

  constructor(
    private readonly formService: FormService,
    private readonly migrationService: MigrationService,
  ) {}

  @Get('/:id/export')
  @ApiOperation({
    summary: 'Export a form and its latest revision',
    operationId: 'exportForm',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async exportForm(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('User has no permission to export form!');
    }
    return this.migrationService.exportForm(id, user.id);
  }

  @Get('/:form_id/permissions')
  @ApiOperation({
    summary: 'List permissions for a form (Aggregated)',
    operationId: 'listFormPermissions',
  })
  @ApiParam({ name: 'form_id', type: 'string' })
  @ApiResponse({ status: 200, type: [AggregatedFormPermissionDto] })
  async listFormPermissions(
    @Param('form_id') form_id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AggregatedFormPermissionDto[]> {
    return this.formService.listFormPermissions(form_id, user);
  }

  @Post('/:form_id/permissions')
  @ApiOperation({
    summary: 'Add permissions to a form',
    description: 'Add one or more permissions to a form.',
    operationId: 'addFormPermissions',
  })
  @ApiParam({ name: 'form_id', type: 'string' })
  @ApiBody({ type: [CreateFormPermissionDto] })
  @ApiResponse({ status: 201, type: [FormPermissionDto] })
  async addFormPermissions(
    @Param('form_id') form_id: string,
    @Body() data: CreateFormPermissionDto[],
    @CurrentUser() user: AuthUser,
  ): Promise<FormPermissionDto[]> {
    return this.formService.addFormPermissions(
      form_id,
      data,
      user,
    ) as unknown as Promise<FormPermissionDto[]>;
  }

  @Put('/:form_id/permissions')
  @ApiOperation({
    summary: 'Batch set (overwrite) permissions for a form',
    description: 'Replace all existing permissions for a form with a new set.',
    operationId: 'setFormPermissions',
  })
  @ApiParam({ name: 'form_id', type: 'string' })
  @ApiBody({ type: [CreateFormPermissionDto] })
  @ApiResponse({ status: 200, type: [FormPermissionDto] })
  async setFormPermissions(
    @Param('form_id') form_id: string,
    @Body() data: CreateFormPermissionDto[],
    @CurrentUser() user: AuthUser,
  ): Promise<FormPermissionDto[]> {
    return this.formService.setFormPermissions(
      form_id,
      data,
      user,
    ) as unknown as Promise<FormPermissionDto[]>;
  }

  @Delete('/:form_id/permissions')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete form permissions by query',
    description:
      'Delete form permissions matching the specified criteria (grantee_type, grantee_value, action). If no query is provided, clears all permissions.',
    operationId: 'deleteFormPermissions',
  })
  @ApiParam({ name: 'form_id', type: 'string' })
  async deleteFormPermissions(
    @Param('form_id') form_id: string,
    @Query() query: DeletePermissionsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.formService.deleteFormPermissionsByQuery(form_id, query, user);
  }

  @Delete('/permissions/:id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a form permission by ID',
    operationId: 'deleteFormPermissionById',
  })
  @ApiParam({ name: 'id', type: 'number' })
  async deleteFormPermission(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.formService.deleteFormPermission(parseInt(id), user);
  }

  @Get('/list')
  @ApiOperation({
    summary: 'List all forms',
    description: 'Retrieve a list of all forms based on user visibility.',
    operationId: 'listForms',
  })
  @ApiPaginatedResponse(ListFormRespDto)
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async listForms(
    @CurrentUser() user: AuthUser,
    @Query() query: ListFormsQueryDto,
  ): Promise<PaginatedResponseDto<ListFormRespDto>> {
    this.logger.debug(`listForms called by user ${user.id}`);
    const { items, total } = await this.formService.listForms(user, query);

    const page = query.page || DEFAULT_PAGE;
    const limit = query.limit || DEFAULT_PAGINATION_LIMIT;

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Get('/:form_id/revisions')
  @ApiOperation({
    summary: 'List all revisions of a form',
    description: 'Retrieve all revisions of a specific form by its public_id.',
    operationId: 'listFormRevisions',
  })
  @ApiParam({
    name: 'form_id',
    type: 'string',
    description: 'The public id of the form to retrieve revisions for',
  })
  @ApiResponse({
    status: 200,
    description: 'A list of form revisions',
    type: [FormRevisionDto],
  })
  @ApiResponse({ status: 404, description: 'Form not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async listFormRevisions(
    @Param('form_id') form_id: string,
  ): Promise<FormRevisionDto[]> {
    return this.formService.listFormRevisions(form_id);
  }

  @Get('/revisions/:id')
  @ApiOperation({
    summary: 'Retrieve a form revision by revision id',
    description: 'Get a specific form revision by its revision id.',
    operationId: 'getFormRevision',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'The public id of the form revision to retrieve',
  })
  @ApiResponse({
    status: 200,
    description: 'Form Revision Data',
    type: FormRevisionWithTagsDto,
  })
  @ApiResponse({ status: 404, description: 'Form revision not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async getFormRevision(
    @Param('id') id: string,
  ): Promise<FormRevisionWithTagsDto> {
    const rev = await this.formService.getFormRevision(id);
    if (!rev) {
      throw new NotFoundException(`Form revision with id ${id} not found`);
    }
    return rev;
  }

  @ApiExcludeEndpoint()
  @Delete('/revisions/:id')
  @RequireFeature('hardDeleteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a form revision',
    description: 'Delete a form revision by its revision_id.',
    operationId: 'deleteFormRevision',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    description: 'The public id of the form revision to delete',
  })
  @ApiResponse({
    status: 204,
    description: 'Form revision deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Form Revision not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiResponse({ status: 403, description: 'Only admin can access' })
  async deleteFormRevision(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    // Note: deleteFormRevision currently doesn't have a specific permission check in service yet
    // because it's a direct revision delete. Let's keep it admin for now or add check later.
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'User has no permission to delete form revision!',
      );
    }
    await this.formService.deleteFormRevision(id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new form',
    description: 'Create a new form with the provided data.',
    operationId: 'createForm',
  })
  @ApiBody({ type: CreateFormDto })
  @ApiResponse({
    status: 201,
    description: 'Form created successfully',
    type: CreateFormResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    type: BadRequestResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    type: InternalServerErrorResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createForm(
    @Body() createFormDto: CreateFormDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateFormResponseDto> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('Only admin can create form');
    }
    return await this.formService.createForm(createFormDto, user);
  }

  @Get(':form_id')
  @ApiOperation({
    summary: 'Retrieve from with its form_id',
    description: 'Get form include latest revison by its form_id.',
    operationId: 'getForm',
  })
  @ApiParam({
    name: 'form_id',
    type: 'string',
    description: 'The public id of the form to retrieve',
  })
  @ApiResponse({ status: 200, description: 'Form Version Data', type: FormDto })
  @ApiResponse({ status: 404, description: 'Form version not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async getForm(@Param('form_id') form_id: string): Promise<FormDto> {
    const form = await this.formService.getForm(form_id);
    if (!form) {
      throw new NotFoundException(`Form with form_id ${form_id} not found`);
    }
    return form;
  }

  @Get(':form_id/resolved')
  @ApiOperation({
    summary: 'Get form with resolved references for new application',
    description:
      'Returns form_schema with isReference attributes resolved, ' +
      'start node component rules applied (hide, editable, disable, required), ' +
      'and workflow applicantSource setting. Used when starting a new application.',
    operationId: 'getResolvedForm',
  })
  @ApiParam({
    name: 'form_id',
    type: 'string',
    description: 'The public id of the form to retrieve',
  })
  @ApiResponse({
    status: 200,
    description: 'Form with resolved references',
    type: ResolvedFormDto,
  })
  @ApiResponse({ status: 404, description: 'Form not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  async getResolvedForm(
    @Param('form_id') formId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ResolvedFormDto> {
    return this.formService.getResolvedForm(formId, user.id);
  }

  @Post('/:form_id/revisions')
  @ApiOperation({
    summary: 'Create a new form revision',
    description:
      'Create a new revision for an existing form. This will retire the previous latest version.',
    operationId: 'createFormRevision',
  })
  @ApiParam({
    name: 'form_id',
    type: 'string',
    description: 'The public id of the form to create a new revision for',
  })
  @ApiBody({ type: CreateFormRevisionDto })
  @ApiResponse({
    status: 201,
    description: 'The new form revision was created successfully',
    type: FormRevisionDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or business rule violation',
    type: BadRequestResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Form not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiResponse({ status: 403, description: 'Only admin can access' })
  async createFormRevision(
    @Param('form_id') form_id: string,
    @Body() revision: CreateFormRevisionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FormRevisionDto> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('Only admin can create form revision');
    }
    return this.formService.createFormRevision(form_id, revision, user);
  }

  @Patch('/revisions/:revision_id')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Update a form revision',
    description: 'Update attributes of a specific form revision.',
    operationId: 'updateFormRevision',
  })
  @ApiParam({
    name: 'revision_id',
    type: 'string',
    description: 'The public id of the form revision to update',
  })
  @ApiBody({ type: UpdateFormRevisionDto })
  @ApiResponse({
    status: 200,
    description: 'Form revision updated successfully',
    type: FormRevisionDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or business rule violation',
    type: BadRequestResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Form revision not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateFormRevision(
    @Param('revision_id') revision_id: string,
    @Body() updateFormRevisionDto: UpdateFormRevisionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<FormRevisionDto> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('Only admin can update form revision');
    }
    return this.formService.updateFormRevision(
      revision_id,
      updateFormRevisionDto,
      user,
    );
  }

  @Put(':form_id')
  @ApiOperation({
    summary: "Update a form's properties",
    description:
      'Update properties of the parent form, such as its associated tags or active status. This does not create a new version.',
    operationId: 'updateForm',
  })
  @ApiParam({
    name: 'form_id',
    type: 'string',
    description: 'The public id of the form to update',
  })
  @ApiBody({ type: UpdateFormDto })
  @ApiResponse({
    status: 200,
    description: 'Form properties updated successfully',
    // TODO: Define a proper return type for the parent form
  })
  @ApiResponse({ status: 404, description: 'Form or Category not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateForm(
    @Param('form_id') form_id: string,
    @Body() updateFormDto: UpdateFormDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('Only admin can update form');
    }
    return this.formService.updateForm(form_id, updateFormDto, user);
  }

  @Delete(':form_id')
  @UseGuards(AuthGuard)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Soft delete a form',
    description: 'Soft delete a form by its form_id (sets is_active to false).',
    operationId: 'softDeleteForm',
  })
  @ApiParam({
    name: 'form_id',
    type: 'string',
    description: 'The public id of the form to soft delete',
  })
  @ApiResponse({
    status: 204,
    description: 'Form soft deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Form not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiResponse({ status: 403, description: 'Only admin can access' })
  async softDeleteForm(
    @Param('form_id') form_id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('Only admin can soft delete form');
    }
    await this.formService.softDeleteForm(form_id, user);
  }

  @ApiExcludeEndpoint()
  @Delete(':form_id/hard')
  @RequireFeature('hardDeleteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a form',
    description: 'Delete a form by its form_id.',
    operationId: 'deleteForm',
  })
  @ApiParam({
    name: 'form_id',
    type: 'string',
    description: 'The public id of the form to delete',
  })
  @ApiResponse({
    status: 204,
    description: 'Form deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Form not found' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteForm(
    @Param('form_id') form_id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('Only admin can delete form');
    }
    await this.formService.deleteForm(form_id, user);
  }
}
