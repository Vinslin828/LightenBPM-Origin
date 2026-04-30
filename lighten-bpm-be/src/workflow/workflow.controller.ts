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
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
  ApiBody,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { WorkflowService } from './workflow.service';
import { WorkflowDto } from './dto/workflow.dto';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { CreateWorkflowResponseDto } from './dto/create-workflow-response.dto';
import { CreateWorkflowRevisionDto } from './dto/create-workflow-revision.dto';
import { ListWorkflowRespDto } from './dto/list-workflow-resp.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateWorkflowVersionDto } from './dto/update-workflow-version.dto';
import { WorkflowRevisionDto } from './dto/workflow-revision.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { FlowAnalysisRequestDto } from './dto/flow-analysis-request.dto';
import { GuaranteedNodesResponseDto } from './dto/guaranteed-nodes-response.dto';
import { PossibleNodesResponseDto } from './dto/possible-nodes-response.dto';
import {
  BadRequestResponseDto,
  NotFoundResponseDto,
  InternalServerErrorResponseDto,
} from '../common/dto/error-response.dto';
import { isAdminUser } from '../auth/types/auth-user';
import type { AuthUser } from '../auth/types/auth-user';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGINATION_LIMIT,
  PaginatedResponseDto,
} from '../common/dto/pagination.dto';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { ListWorkflowsQueryDto } from './dto/list-workflows-query.dto';

import {
  CreateWorkflowPermissionDto,
  WorkflowPermissionDto,
  AggregatedWorkflowPermissionDto,
} from './dto/workflow-permission.dto';
import { DeletePermissionsQueryDto } from '../common/dto/permission-query.dto';
import { MigrationService } from '../migration/migration.service';
import { FeatureFlagGuard } from '../common/feature-flag/feature-flag.guard';
import { RequireFeature } from '../common/feature-flag/feature-flag.decorator';

@ApiTags('Workflow Management')
@Controller('workflow')
@UseGuards(AuthGuard)
export class WorkflowController {
  constructor(
    private readonly workflowService: WorkflowService,
    private readonly migrationService: MigrationService,
  ) {}

  @Get('/:id/export')
  @ApiOperation({
    summary: 'Export a workflow and its latest revision',
    operationId: 'exportWorkflow',
  })
  @ApiParam({ name: 'id', type: 'string' })
  async exportWorkflow(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'User has no permission to export workflow!',
      );
    }
    return this.migrationService.exportWorkflow(id, user.id);
  }

  @Get('/:workflow_id/permissions')
  @ApiOperation({
    summary: 'List permissions for a workflow (Aggregated)',
    operationId: 'listWorkflowPermissions',
  })
  @ApiParam({ name: 'workflow_id', type: 'string' })
  @ApiResponse({ status: 200, type: [AggregatedWorkflowPermissionDto] })
  async listWorkflowPermissions(
    @Param('workflow_id') workflow_id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AggregatedWorkflowPermissionDto[]> {
    return this.workflowService.listWorkflowPermissions(workflow_id, user);
  }

  @Post('/:workflow_id/permissions')
  @ApiOperation({
    summary: 'Add permissions to a workflow',
    operationId: 'addWorkflowPermissions',
  })
  @ApiParam({ name: 'workflow_id', type: 'string' })
  @ApiBody({ type: [CreateWorkflowPermissionDto] })
  @ApiResponse({ status: 201, type: [WorkflowPermissionDto] })
  async addWorkflowPermissions(
    @Param('workflow_id') workflow_id: string,
    @Body() data: CreateWorkflowPermissionDto[],
    @CurrentUser() user: AuthUser,
  ): Promise<WorkflowPermissionDto[]> {
    return this.workflowService.addWorkflowPermissions(
      workflow_id,
      data,
      user,
    ) as unknown as Promise<WorkflowPermissionDto[]>;
  }

  @Put('/:workflow_id/permissions')
  @ApiOperation({
    summary: 'Batch set (overwrite) permissions for a workflow',
    description:
      'Replace all existing permissions for a workflow with a new set.',
    operationId: 'setWorkflowPermissions',
  })
  @ApiParam({ name: 'workflow_id', type: 'string' })
  @ApiBody({ type: [CreateWorkflowPermissionDto] })
  @ApiResponse({ status: 200, type: [WorkflowPermissionDto] })
  async setWorkflowPermissions(
    @Param('workflow_id') workflow_id: string,
    @Body() data: CreateWorkflowPermissionDto[],
    @CurrentUser() user: AuthUser,
  ): Promise<WorkflowPermissionDto[]> {
    return this.workflowService.setWorkflowPermissions(
      workflow_id,
      data,
      user,
    ) as unknown as Promise<WorkflowPermissionDto[]>;
  }

  @Delete('/:workflow_id/permissions')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete workflow permissions by query',
    description:
      'Delete workflow permissions matching the specified criteria (grantee_type, grantee_value, action). If no query is provided, clears all permissions.',
    operationId: 'deleteWorkflowPermissions',
  })
  @ApiParam({ name: 'workflow_id', type: 'string' })
  async deleteWorkflowPermissions(
    @Param('workflow_id') workflow_id: string,
    @Query() query: DeletePermissionsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.workflowService.deleteWorkflowPermissionsByQuery(
      workflow_id,
      query,
      user,
    );
  }

  @Delete('/permissions/:id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a workflow permission by ID',
    operationId: 'deleteWorkflowPermissionById',
  })
  @ApiParam({ name: 'id', type: 'number' })
  async deleteWorkflowPermission(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.workflowService.deleteWorkflowPermission(parseInt(id), user);
  }

  @Get('list')
  @ApiOperation({
    summary: 'List all workflows based on user visibility',
    operationId: 'listWorkflows',
  })
  @ApiPaginatedResponse(ListWorkflowRespDto)
  async listWorkflows(
    @Query() query: ListWorkflowsQueryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<PaginatedResponseDto<ListWorkflowRespDto>> {
    const { items, total } = await this.workflowService.listWorkflows(
      user,
      query,
    );

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

  @Get('/:workflow_id/revisions')
  @ApiOperation({
    summary: 'List all revisions of a workflow',
    operationId: 'listWorkflowRevisions',
  })
  @ApiParam({ name: 'workflow_id', type: 'string' })
  @ApiResponse({ status: 200, type: [WorkflowRevisionDto] })
  @ApiResponse({ status: 403, description: 'Only admin can access' })
  async listWorkflowRevisions(
    @Param('workflow_id') workflow_id: string,
  ): Promise<WorkflowRevisionDto[]> {
    return this.workflowService.listWorkflowRevisions(workflow_id);
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new workflow',
    operationId: 'createWorkflow',
  })
  @ApiBody({ type: CreateWorkflowDto })
  @ApiResponse({
    status: 201,
    description: 'Workflow created successfully',
    type: CreateWorkflowResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    type: BadRequestResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    type: InternalServerErrorResponseDto,
  })
  async createWorkflow(
    @Body() createWorkflowDto: CreateWorkflowDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateWorkflowResponseDto> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('Only admin can create workflow');
    }
    return this.workflowService.createWorkflow(createWorkflowDto, user);
  }

  @Post('/:workflow_id/revisions')
  @ApiOperation({
    summary: 'Create a new workflow revision',
    operationId: 'createWorkflowRevision',
  })
  @ApiParam({ name: 'workflow_id', type: 'string' })
  @ApiBody({ type: CreateWorkflowRevisionDto })
  @ApiResponse({
    status: 201,
    description: 'Workflow revision created successfully',
    type: WorkflowRevisionDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or business rule violation',
    type: BadRequestResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Workflow not found',
    type: NotFoundResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    type: InternalServerErrorResponseDto,
  })
  async createWorkflowRevision(
    @Param('workflow_id') workflow_id: string,
    @Body() createWorkflowRevisionDto: CreateWorkflowRevisionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<WorkflowRevisionDto> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('Only admin can create workflow revision');
    }
    return this.workflowService.createWorkflowRevision(
      workflow_id,
      createWorkflowRevisionDto,
      user,
    );
  }

  @Get(':workflow_id')
  @ApiOperation({
    summary: 'Retrieve latest active workflow revision with its workflow_id',
    operationId: 'getWorkflow',
  })
  @ApiParam({ name: 'workflow_id', type: 'string' })
  @ApiResponse({ status: 200, type: WorkflowDto })
  @ApiResponse({ status: 403, description: 'Only admin can access' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async getWorkflow(
    @Param('workflow_id') workflow_id: string,
  ): Promise<WorkflowDto> {
    const workflow = await this.workflowService.getWorkflow(workflow_id);
    if (!workflow) {
      throw new NotFoundException(
        `Workflow with workflow_id ${workflow_id} not found`,
      );
    }
    return workflow;
  }

  @Get('/revisions/:revision_id')
  @ApiOperation({
    summary: 'Retrieve a workflow revision by revision_id',
    operationId: 'getWorkflowRevision',
  })
  @ApiParam({ name: 'revision_id', type: 'string' })
  @ApiResponse({ status: 200, type: WorkflowRevisionDto })
  @ApiResponse({ status: 403, description: 'Only admin can access' })
  async getWorkflowRevision(
    @Param('revision_id') revision_id: string,
  ): Promise<WorkflowRevisionDto> {
    const workflow =
      await this.workflowService.getWorkflowRevision(revision_id);
    if (!workflow) {
      throw new NotFoundException(
        `Workflow revision with revision_id ${revision_id} not found`,
      );
    }
    return workflow;
  }

  @Put(':workflow_id')
  @ApiOperation({
    summary: "Update a workflow's parent properties",
    operationId: 'updateWorkflow',
  })
  @ApiParam({ name: 'workflow_id', type: 'string' })
  @ApiBody({ type: UpdateWorkflowDto })
  @ApiResponse({ status: 200, type: WorkflowDto })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async updateWorkflow(
    @Param('workflow_id') workflow_id: string,
    @Body() workflow: UpdateWorkflowDto,
    @CurrentUser() user: AuthUser,
  ): Promise<WorkflowDto> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('Only admin can update workflow');
    }
    await this.workflowService.updateWorkflow(workflow_id, workflow, user);

    // Fetch the updated workflow with relations to return a proper DTO
    const fullWorkflow = await this.workflowService.getWorkflow(workflow_id);
    if (!fullWorkflow) {
      throw new NotFoundException(
        `Workflow with id ${workflow_id} not found after update`,
      );
    }
    return fullWorkflow;
  }

  @Patch('/revisions/:revision_id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Update a workflow revision',
    description:
      'Update the status and/or flow_definition of a specific workflow revision. ' +
      'Only DRAFT revisions can be updated.',
    operationId: 'updateWorkflowRevision',
  })
  @ApiParam({
    name: 'revision_id',
    type: 'string',
    description: 'The public id of the workflow revision to update',
  })
  @ApiBody({
    type: UpdateWorkflowVersionDto,
    description:
      'At least one field (status or flow_definition) must be provided. ' +
      'You can update status only, flow_definition only, or both together.',
  })
  @ApiResponse({
    status: 204,
    description: 'Workflow revision updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or business rule violation',
    type: BadRequestResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Workflow revision not found',
    type: NotFoundResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    type: InternalServerErrorResponseDto,
  })
  async updateWorkflowRevision(
    @Param('revision_id') revision_id: string,
    @Body() updateWorkflowVersionDto: UpdateWorkflowVersionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('Only admin can update workflow revision');
    }
    return this.workflowService.updateWorkflowRevision(
      revision_id,
      updateWorkflowVersionDto,
      user,
    );
  }

  @Post('analysis/guaranteed-preceding-nodes')
  @ApiOperation({
    summary: 'Get guaranteed preceding nodes for a target node',
    description:
      'Returns nodes that are guaranteed to be traversed before reaching the target node. ' +
      'Used for SEND_TO_SPECIFIC_NODE reject behavior. Excludes START node from results.',
    operationId: 'getGuaranteedPrecedingNodes',
  })
  @ApiBody({ type: FlowAnalysisRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully analyzed flow definition',
    type: GuaranteedNodesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid flow definition or node key',
    type: BadRequestResponseDto,
  })
  getGuaranteedPrecedingNodes(
    @Body() request: FlowAnalysisRequestDto,
  ): GuaranteedNodesResponseDto {
    return this.workflowService.getGuaranteedPrecedingNodes(
      request.flowDefinition,
      request.nodeKey,
    );
  }

  @Post('analysis/possible-preceding-nodes')
  @ApiOperation({
    summary: 'Get all possible preceding nodes for a target node',
    description:
      'Returns all nodes that might be traversed before reaching the target node (union of all paths). ' +
      'Used for USER_SELECT reject behavior to show all possible reject targets. Excludes START node from results.',
    operationId: 'getPossiblePrecedingNodes',
  })
  @ApiBody({ type: FlowAnalysisRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Successfully analyzed flow definition',
    type: PossibleNodesResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid flow definition or node key',
    type: BadRequestResponseDto,
  })
  getPossiblePrecedingNodes(
    @Body() request: FlowAnalysisRequestDto,
  ): PossibleNodesResponseDto {
    return this.workflowService.getPossiblePrecedingNodes(
      request.flowDefinition,
      request.nodeKey,
    );
  }

  @Delete(':workflow_id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Soft delete a workflow',

    description:
      'Soft delete a workflow by its workflow_id (sets is_active to false).',

    operationId: 'softDeleteWorkflow',
  })
  @ApiParam({ name: 'workflow_id', type: 'string' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Only admin can access' })
  @ApiResponse({ status: 404, description: 'Workflow not found' })
  async softDeleteWorkflow(
    @Param('workflow_id') workflow_id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('Only admin can delete workflow');
    }
    await this.workflowService.softDeleteWorkflow(workflow_id, user);
  }

  @ApiExcludeEndpoint()
  @Delete(':workflow_id/hard')
  @RequireFeature('hardDeleteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a workflow',

    operationId: 'deleteWorkflow',
  })
  @ApiParam({ name: 'workflow_id', type: 'string' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteWorkflow(
    @Param('workflow_id') workflow_id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    if (!isAdminUser(user)) {
      throw new ForbiddenException('Only admin can delete workflow');
    }
    await this.workflowService.deleteWorkflow(workflow_id, user);
  }

  @ApiExcludeEndpoint()
  @Delete('/revisions/:revision_id')
  @RequireFeature('hardDeleteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete a workflow revision',
    operationId: 'deleteWorkflowRevision',
  })
  @ApiParam({ name: 'revision_id', type: 'string' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async deleteWorkflowRevision(
    @Param('revision_id') revision_id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    // Note: deleteWorkflowRevision currently doesn't have a specific permission check in service yet
    // Let's keep it admin for now or add check later.
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'User has no permission to delete workflow revision!',
      );
    }
    await this.workflowService.deleteWorkflowRevision(revision_id);
  }
}
