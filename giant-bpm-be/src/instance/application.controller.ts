import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  UseGuards,
  Query,
  Logger,
  NotFoundException,
  BadRequestException,
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
import { ApplicationDto, ApplicationInstanceDto } from './dto/application.dto';
import { CreateApplicationInstanceDto } from './dto/create-application-instance.dto';

import { SaveApplicationInstanceDto } from './dto/save-application-instance.dto';
import { ListApplicationsQueryDto } from './dto/list-applications-query.dto';
import { ApplicationService } from './application.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  ApprovalRequestDto,
  ApprovalResponseDto,
} from './dto/approval-types.dto';
import { ApplicationNodesDto } from './dto/application-nodes.dto';
import { WorkflowCommentDto } from './dto/workflow-comment.dto';
import { WorkflowHistoryResponseDto } from './dto/workflow-history-response.dto';
import { SelectableRejectTargetsResponseDto } from './dto/selectable-reject-targets-response.dto';
import { ListApplicationsResponseDto } from './dto/list-applications-response.dto';
import type { AuthUser } from '../auth/types/auth-user';
import { ApprovalTaskDto } from './dto/approval-task.dto';
import {
  DEFAULT_PAGE,
  DEFAULT_PAGINATION_LIMIT,
  PaginatedResponseDto,
} from '../common/dto/pagination.dto';
import { ApiPaginatedResponse } from '../common/decorators/api-paginated-response.decorator';
import { ListAvailableApplicationsQueryDto } from './dto/list-available-applications-query.dto';
import { ApprovalDetailResponseDto } from './dto/approval-detail-response.dto';
import {
  BadRequestResponseDto,
  ForbiddenResponseDto,
  NotFoundResponseDto,
  InternalServerErrorResponseDto,
} from '../common/dto/error-response.dto';
import { ApplicationRoutingResponseDto } from './dto/application-routing-response.dto';
import { WorkflowEngineService } from '../flow-engine/workflow-engine.service';
import { FormWorkflowBindingService } from '../form-workflow-binding/form-workflow-binding.service';
import { JsonObject } from '@prisma/client/runtime/library';
import { PriorityLevel, InstanceStatus } from '../common/types/common.types';
import { FormDataValidatorService } from '../flow-engine/validation/form-data/form-data-validator.service';
import { ValidationExecutorService } from '../flow-engine/expression-engine/services/validation-executor.service';
import { AttachmentService } from '../attachment/attachment.service';
import {
  FlowDefinition,
  FormSchema,
  FormValidation,
} from '../flow-engine/types';
import {
  resolveComponentRules,
  VIEWER_ROLE,
} from './utils/component-rule-filter';
import { TransactionService } from '../prisma/transaction.service';

import {
  CreateInstanceShareDto,
  InstanceShareDto,
  AggregatedInstanceShareDto,
} from './dto/instance-share.dto';
import { CheckDuplicateDto } from './dto/check-duplicate.dto';
import { FeatureFlagGuard } from '../common/feature-flag/feature-flag.guard';
import { RequireFeature } from '../common/feature-flag/feature-flag.decorator';
import { DuplicateCheckResponseDto } from './dto/duplicate-check-response.dto';
import { ValidateFieldsDto } from './dto/validate-fields.dto';
import { ValidateFieldsResponseDto } from './dto/validate-fields-response.dto';

@ApiTags('Flow Engine | Application Life Cycle')
@Controller('applications')
@UseGuards(AuthGuard)
// Controller for application management
export class ApplicationController {
  private readonly logger = new Logger(ApplicationController.name);

  constructor(
    private readonly applicationService: ApplicationService,
    private readonly workflowEngine: WorkflowEngineService,
    private readonly bindingService: FormWorkflowBindingService,
    private readonly formDataValidator: FormDataValidatorService,
    private readonly validationExecutor: ValidationExecutorService,
    private readonly transactionService: TransactionService,
    private readonly attachmentService: AttachmentService,
  ) {}

  @Post(':serial_number/shares')
  @ApiOperation({
    summary: 'Share an application instance with one or more users',
    operationId: 'createInstanceShares',
  })
  @ApiParam({ name: 'serial_number', type: 'string' })
  @ApiBody({ type: [CreateInstanceShareDto] })
  @ApiResponse({ status: 201, type: [InstanceShareDto] })
  async createInstanceShares(
    @Param('serial_number') serial_number: string,
    @Body() data: CreateInstanceShareDto[],
    @CurrentUser() user: AuthUser,
  ): Promise<InstanceShareDto[]> {
    return this.applicationService.createInstanceShares(
      serial_number,
      data,
      user,
    ) as unknown as Promise<InstanceShareDto[]>;
  }

  @Put(':serial_number/shares')
  @ApiOperation({
    summary: 'Batch set (overwrite) shares for an application instance',
    description: 'Replace all existing shares for an instance with a new set.',
    operationId: 'setInstanceShares',
  })
  @ApiParam({ name: 'serial_number', type: 'string' })
  @ApiBody({ type: [CreateInstanceShareDto] })
  @ApiResponse({ status: 200, type: [InstanceShareDto] })
  async setInstanceShares(
    @Param('serial_number') serial_number: string,
    @Body() data: CreateInstanceShareDto[],
    @CurrentUser() user: AuthUser,
  ): Promise<InstanceShareDto[]> {
    return this.applicationService.setInstanceShares(
      serial_number,
      data,
      user,
    ) as unknown as Promise<InstanceShareDto[]>;
  }

  @Get(':serial_number/shares')
  @ApiOperation({
    summary: 'List shares for an application instance (Aggregated)',
    operationId: 'listInstanceShares',
  })
  @ApiParam({ name: 'serial_number', type: 'string' })
  @ApiResponse({ status: 200, type: [AggregatedInstanceShareDto] })
  async listInstanceShares(
    @Param('serial_number') serial_number: string,
    @CurrentUser() user: AuthUser,
  ): Promise<AggregatedInstanceShareDto[]> {
    return this.applicationService.listInstanceShares(serial_number, user);
  }

  @Delete(':serial_number/shares')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete instance shares by query',
    description:
      'Delete instance shares matching the specified criteria. If no query is provided, clears all shares.',
    operationId: 'deleteInstanceShares',
  })
  @ApiParam({ name: 'serial_number', type: 'string' })
  async deleteInstanceShares(
    @Param('serial_number') serial_number: string,
    @Query('user_id') user_id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const query = user_id ? { user_id: parseInt(user_id) } : {};
    await this.applicationService.deleteInstanceSharesByQuery(
      serial_number,
      query,
      user,
    );
  }

  @Delete('shares/:id')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Delete an instance share by ID',
    operationId: 'deleteInstanceShareById',
  })
  @ApiParam({ name: 'id', type: 'number' })
  async deleteInstanceShare(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.applicationService.deleteInstanceShare(parseInt(id), user);
  }

  @Get('available')
  @ApiOperation({
    summary: 'List all available applications that can be started',
    operationId: 'listAvailableApplications',
  })
  @ApiPaginatedResponse(ApplicationDto)
  async listAvailableApplications(
    @CurrentUser() user: AuthUser,
    @Query() query: ListAvailableApplicationsQueryDto,
  ): Promise<PaginatedResponseDto<ApplicationDto>> {
    const { items, total } =
      await this.applicationService.listAvailableApplications(user, query);

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

  @Get()
  @ApiOperation({
    summary: 'List application instances based on filter and status',
    operationId: 'listApplications',
  })
  @ApiPaginatedResponse(ListApplicationsResponseDto)
  async listApplications(
    @CurrentUser() user: AuthUser,
    @Query() query: ListApplicationsQueryDto,
  ): Promise<PaginatedResponseDto<ListApplicationsResponseDto>> {
    this.logger.debug(
      `ListApplications called by user ${user?.id}, query: ${JSON.stringify(query)}`,
    );
    const { items, total } = await this.applicationService.listApplications(
      user,
      query,
    );

    const responseItems = items.map((appInstance) => {
      const approvals: ApprovalTaskDto[] = appInstance.workflow_nodes.flatMap(
        (node) => node.approvals,
      );
      return ListApplicationsResponseDto.fromApplicationInstanceDto(
        appInstance,
        approvals[0], // pass the latest approval task of current user
      );
    });

    const page = query.page || DEFAULT_PAGE;
    const limit = query.limit || DEFAULT_PAGINATION_LIMIT;

    return {
      items: responseItems,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Post()
  @ApiOperation({
    summary:
      'Create a new application draft instance (FormInstance and WorkflowInstance)',
    operationId: 'createApplication',
  })
  @ApiBody({ type: CreateApplicationInstanceDto })
  @ApiResponse({ status: 201, type: ApplicationInstanceDto })
  async createApplication(
    @Body() createApplicationDto: CreateApplicationInstanceDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ApplicationInstanceDto> {
    const binding = await this.bindingService.getBinding(
      createApplicationDto.binding_id,
    );
    const app = await this.applicationService.findLatestApplicationRevision(
      binding.workflowId,
      binding.formId,
    );

    if (
      !this.applicationService.canUseWorkflow(
        user,
        app.workflow.workflow.permissions,
        app.workflow.workflow.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to use this workflow',
      );
    }

    const applicantId = createApplicationDto.applicant_id ?? user.id;

    // Execute expression components
    const formData = await this.applicationService.executeExpressionComponents(
      app.form.form_schema as unknown as FormSchema,
      (createApplicationDto.form_data || {}) as Record<string, unknown>,
      {
        formData: (createApplicationDto.form_data || {}) as Record<
          string,
          unknown
        >,
        applicantId,
      },
    );

    const result = await this.transactionService.runTransaction(async (tx) => {
      const result = await this.workflowEngine.createInstance(
        app.form,
        formData as JsonObject,
        app.workflow,
        applicantId,
        user.id,
        createApplicationDto.priority ?? PriorityLevel.NORMAL,
        tx,
      );

      if (createApplicationDto.draft_id) {
        await this.attachmentService.bindDraftAttachments(
          createApplicationDto.draft_id,
          result.workflowInstance.serial_number,
          user.id,
          tx,
        );
      }

      return result;
    });

    return this.applicationService.getApplicationInstance(
      result.workflowInstance.serial_number,
      user,
    );
  }

  @Post('submission')
  @ApiOperation({
    summary: 'Create and submit a new application in one step',
    operationId: 'createAndSubmitApplication',
  })
  @ApiBody({ type: CreateApplicationInstanceDto })
  @ApiResponse({ status: 201, type: ApplicationInstanceDto })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or business rule violation',
    type: BadRequestResponseDto,
  })
  async createAndSubmitApplication(
    @Body() createApplicationDto: CreateApplicationInstanceDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ApplicationInstanceDto> {
    const binding = await this.bindingService.getBinding(
      createApplicationDto.binding_id,
    );
    const app = await this.applicationService.findLatestApplicationRevision(
      binding.workflowId,
      binding.formId,
    );

    if (
      !this.applicationService.canUseWorkflow(
        user,
        app.workflow.workflow.permissions,
        app.workflow.workflow.created_by,
      )
    ) {
      throw new ForbiddenException(
        'You do not have permission to use this workflow',
      );
    }

    const flowDefinition = app.workflow
      .flow_definition as unknown as FlowDefinition;
    const requiredFieldNames = new Set(
      resolveComponentRules(flowDefinition, VIEWER_ROLE.APPLICANT_DRAFT)
        .requiredNames,
    );
    const validationResult = this.formDataValidator.validateAndCoerceFormData(
      flowDefinition,
      app.form.form_schema as unknown as FormSchema,
      createApplicationDto.form_data as Record<string, any>,
      requiredFieldNames,
    );

    if (!validationResult.isValid) {
      throw new BadRequestException({
        message: 'Form data validation failed',
        errors: validationResult.errors,
      });
    }

    const applicantId = createApplicationDto.applicant_id ?? user.id;

    // Execute expression-based validators
    const expressionValidationResult = await this.validationExecutor.execute(
      app.form.form_schema as unknown as FormSchema,
      app.form.fe_validation as unknown as FormValidation,
      {
        formData: validationResult.coercedData as Record<string, unknown>,
        applicantId,
      },
    );

    if (!expressionValidationResult.isValid) {
      throw new BadRequestException({
        message: expressionValidationResult.message || 'Validation failed',
        errors: expressionValidationResult.errors,
      });
    }

    // Execute expression components
    const formDataWithExpressions =
      await this.applicationService.executeExpressionComponents(
        app.form.form_schema as unknown as FormSchema,
        validationResult.coercedData as Record<string, unknown>,
        {
          formData: validationResult.coercedData as Record<string, unknown>,
          applicantId,
        },
      );

    const result = await this.transactionService.runTransaction(async (tx) => {
      const result = await this.workflowEngine.createInstance(
        app.form,
        formDataWithExpressions as JsonObject,
        app.workflow,
        applicantId,
        user.id,
        PriorityLevel.NORMAL,
        tx,
      );

      await this.workflowEngine.submit(result.workflowInstance.id, user.id, tx);

      if (createApplicationDto.draft_id) {
        await this.attachmentService.bindDraftAttachments(
          createApplicationDto.draft_id,
          result.workflowInstance.serial_number,
          user.id,
          tx,
        );
      }

      return result;
    });

    return this.applicationService.getApplicationInstance(
      result.workflowInstance.serial_number,
      user,
    );
  }

  @Post(':serial_number/submission')
  @ApiOperation({
    summary:
      'Submit an application instance (FormInstance and WorkflowInstance)',
    operationId: 'submitApplicationInstance',
  })
  @ApiParam({ name: 'serial_number', type: 'string' })
  @ApiBody({ type: SaveApplicationInstanceDto })
  @ApiResponse({ status: 201, type: ApplicationInstanceDto })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or business rule violation',
    type: BadRequestResponseDto,
  })
  async submitApplicationInstance(
    @Param('serial_number') serial_number: string,
    @Body() saveApplicationDto: SaveApplicationInstanceDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ApplicationInstanceDto> {
    const formInstance =
      await this.applicationService.findFormInstance(serial_number);

    if (!formInstance) {
      throw new NotFoundException(
        `Application instance with serial number: ${serial_number} not found`,
      );
    }

    let coercedFormData: Record<string, any> | undefined;
    if (saveApplicationDto.form_data) {
      const flowDefinition = formInstance.workflow_instance.revision
        .flow_definition as unknown as FlowDefinition;
      const requiredFieldNames = new Set(
        resolveComponentRules(flowDefinition, VIEWER_ROLE.APPLICANT_DRAFT)
          .requiredNames,
      );
      const validationResult = this.formDataValidator.validateAndCoerceFormData(
        flowDefinition,
        formInstance.form_revision.form_schema as unknown as FormSchema,
        saveApplicationDto.form_data as Record<string, any>,
        requiredFieldNames,
      );

      if (!validationResult.isValid) {
        throw new BadRequestException({
          message: 'Form data validation failed',
          errors: validationResult.errors,
        });
      }

      // Execute expression-based validators
      const expressionValidationResult = await this.validationExecutor.execute(
        formInstance.form_revision.form_schema as unknown as FormSchema,
        formInstance.form_revision.fe_validation as unknown as FormValidation,
        {
          formData: validationResult.coercedData as Record<string, unknown>,
          applicantId: formInstance.workflow_instance.applicant_id,
          workflowInstanceId: formInstance.workflow_instance.id,
        },
      );

      if (!expressionValidationResult.isValid) {
        throw new BadRequestException({
          message: expressionValidationResult.message || 'Validation failed',
          errors: expressionValidationResult.errors,
        });
      }

      // Execute expression components
      coercedFormData =
        await this.applicationService.executeExpressionComponents(
          formInstance.form_revision.form_schema as unknown as FormSchema,
          validationResult.coercedData as Record<string, unknown>,
          {
            formData: validationResult.coercedData as Record<string, unknown>,
            applicantId: formInstance.workflow_instance.applicant_id,
            workflowInstanceId: formInstance.workflow_instance.id,
          },
        );
    }

    await this.transactionService.runTransaction(async (tx) => {
      if (coercedFormData) {
        await this.applicationService.updateFormData(
          formInstance.id,
          coercedFormData as JsonObject,
          user.id,
          tx,
        );
      }

      await this.workflowEngine.submit(
        formInstance.workflow_instance.id,
        user.id,
        tx,
      );
    });

    return this.applicationService.getApplicationInstance(serial_number, user);
  }

  @Put(':serial_number')
  @ApiOperation({
    summary: 'Update an application',
    operationId: 'saveApplicationInstance',
  })
  @ApiParam({ name: 'serial_number', type: 'string' })
  @ApiBody({ type: SaveApplicationInstanceDto })
  @ApiResponse({ status: 200, type: ApplicationInstanceDto })
  async saveApplicationInstance(
    @Param('serial_number') serial_number: string,
    @Body() saveApplicationDto: SaveApplicationInstanceDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ApplicationInstanceDto> {
    const formInstance =
      await this.applicationService.findFormInstance(serial_number);
    if (!formInstance) {
      throw new NotFoundException(
        `Application instance with serial number: ${serial_number} not found`,
      );
    }

    if (
      formInstance.workflow_instance.status != InstanceStatus.DRAFT &&
      formInstance.workflow_instance.status != InstanceStatus.RUNNING
    ) {
      throw new BadRequestException(
        `Not allow to update the form data of ${formInstance.workflow_instance.status} application`,
      );
    }
    if (
      formInstance.workflow_instance.applicant_id != user.id &&
      formInstance.workflow_instance.submitter_id != user.id
    ) {
      throw new NotFoundException(
        `Application instance with serial number: ${serial_number} not found`,
      );
    }

    // Execute expression components
    const formData = await this.applicationService.executeExpressionComponents(
      formInstance.form_revision.form_schema as unknown as FormSchema,
      (saveApplicationDto.form_data || {}) as Record<string, unknown>,
      {
        formData: (saveApplicationDto.form_data || {}) as Record<
          string,
          unknown
        >,
        applicantId: user.id,
        workflowInstanceId: formInstance.workflow_instance.id,
      },
    );

    await this.applicationService.updateFormData(
      formInstance.id,
      formData as JsonObject,
      user.id,
    );

    if (formInstance.workflow_instance.status == InstanceStatus.RUNNING) {
      this.workflowEngine.restartWorkflow(formInstance.workflow_instance.id);
    }

    return this.applicationService.getApplicationInstance(serial_number, user);
  }

  @Put(':serial_number/approval')
  @ApiParam({ name: 'serial_number', type: 'string' })
  @ApiBody({ type: ApprovalRequestDto })
  @ApiOperation({
    summary: 'Update Approval (Approve/Reject)',
    description:
      'Process an approval task with approve or reject action. ' +
      'Reject behavior is determined by node configuration. ' +
      'See reject_behavior field schema for detailed usage rules.',
    operationId: 'updateApproval',
  })
  @ApiResponse({
    status: 200,
    description: 'Approval processed successfully',
    type: ApprovalResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid input data or business rule violation. ' +
      'Examples: missing reject_target_node_key when using SEND_TO_SPECIFIC_NODE, ' +
      'target node not found in flow definition, target node not yet executed or completed, ' +
      'invalid reject behavior',
    type: BadRequestResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - User does not have permission to perform this action',
    type: ForbiddenResponseDto,
  })
  @ApiResponse({
    status: 404,
    description:
      'Not Found - Application instance, approval task, or workflow revision not found',
    type: NotFoundResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    type: InternalServerErrorResponseDto,
  })
  updateApproval(
    @Param('serial_number') serial_number: string,
    @Body() approvalRequest: ApprovalRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ApprovalResponseDto> {
    return this.workflowEngine.updateApproval(
      serial_number,
      approvalRequest,
      user.id,
    );
  }

  @Get(':serial_number')
  @ApiOperation({
    summary:
      'Retrieve an application instance (from FormInstances and WorkflowInstance)',
    operationId: 'getApplicationInstance',
  })
  @ApiParam({ name: 'serial_number', type: 'string' })
  @ApiResponse({ status: 200, type: ApplicationInstanceDto })
  getApplicationInstance(
    @Param('serial_number') serial_number: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ApplicationInstanceDto> {
    return this.applicationService.getApplicationInstanceWithRules(
      serial_number,
      user,
    );
  }

  @Get(':serial_number/routing')
  @ApiOperation({
    summary:
      'Retrieve routing graph include overall status of an application instance',
    operationId: 'getApplicationRouting',
  })
  @ApiParam({ name: 'serial_number', type: 'string' })
  @ApiResponse({ status: 200, type: ApplicationRoutingResponseDto })
  getApplicationRouting(
    @Param('serial_number') serialNumber: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ApplicationRoutingResponseDto> {
    this.logger.log(`getApplicationRouting for ${user.id}`);
    return this.applicationService.getApplicationRouting(serialNumber, user);
  }

  @Get('approval/:approval_task_id')
  @ApiOperation({
    summary:
      'Retreive an application approval (form, node with specific approval and accordingly comment)',
    operationId: 'getApprovalDetail',
  })
  @ApiParam({ name: 'approval_task_id', type: 'string' })
  @ApiResponse({ status: 200, type: ApprovalDetailResponseDto })
  @ApiResponse({
    status: 404,
    description: 'Approval Detail Not Found',
    type: NotFoundException,
  })
  getApprovalDetail(
    @Param('approval_task_id') approval_task_id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ApprovalDetailResponseDto> {
    return this.applicationService.getApprovalDetailWithRules(
      approval_task_id,
      user,
    );
  }

  @Get(':serial_number/nodes')
  @ApiOperation({
    summary:
      'Retrieve the nodes of instances by serial numberr (replaced workflow means workflow which was replaced due to the user actions such as update)',
    operationId: 'getApplicationNodes',
  })
  @ApiParam({ name: 'serial_number', type: 'string' })
  @ApiResponse({ status: 200, type: [ApplicationNodesDto] })
  getApplicationNodes(
    @Param('serial_number') serial_number: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ApplicationNodesDto[]> {
    return this.applicationService.getApplicationNodes(serial_number, user);
  }

  @Get(':serial_number/comments')
  @ApiOperation({
    summary: 'Retrieve the comments of application instance by serial number',
    operationId: 'getApplicationComments',
  })
  @ApiParam({ name: 'serial_number', type: 'string' })
  @ApiResponse({ status: 200, type: [WorkflowCommentDto] })
  getApplicationComments(
    @Param('serial_number') serial_number: string,
    @CurrentUser() user: AuthUser,
  ): Promise<WorkflowCommentDto[]> {
    return this.applicationService.getApplicationComments(serial_number, user);
  }

  @Get(':serial_number/history')
  @ApiParam({ name: 'serial_number', type: 'string' })
  @ApiResponse({ status: 200, type: WorkflowHistoryResponseDto })
  @ApiOperation({
    summary: 'Retrieve the history records of an application instance',
    operationId: 'getApplicationHistory',
  })
  getApplicationHistory(
    @Param('serial_number') serial_number: string,
    @CurrentUser() user: AuthUser,
  ): Promise<WorkflowHistoryResponseDto> {
    return this.applicationService.getApplicationWorkflowHistory(
      serial_number,
      user,
    );
  }

  @Get(':serial_number/selectable-reject-targets/:node_key')
  @ApiOperation({
    summary: 'Get selectable reject targets for a specific node (runtime)',
    description:
      'Returns nodes that have actually been traversed in this application instance and can be selected as reject targets. ' +
      'Used for USER_SELECT reject behavior at runtime. Excludes START node and the current node.',
    operationId: 'getSelectableRejectTargets',
  })
  @ApiParam({
    name: 'serial_number',
    type: 'string',
    description: 'Application serial number',
    example: 'APP-1734299400000',
  })
  @ApiParam({
    name: 'node_key',
    type: 'string',
    description: 'The key of the current node',
    example: 'approve_manager',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved selectable reject targets',
    type: SelectableRejectTargetsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Application instance not found',
    type: NotFoundResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden',
    type: ForbiddenResponseDto,
  })
  getSelectableRejectTargets(
    @Param('serial_number') serial_number: string,
    @Param('node_key') node_key: string,
    @CurrentUser() user: AuthUser,
  ): Promise<SelectableRejectTargetsResponseDto> {
    return this.applicationService.getSelectableRejectTargets(
      serial_number,
      node_key,
      user,
    );
  }

  @Delete(':serial_number')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Withdraw an application instance',
    description:
      'Withdraw an application instance. DRAFT instances are force deleted (hard delete), RUNNING instances are cancelled (soft delete) with all pending/waiting approval tasks cancelled.',
    operationId: 'withdrawApplicationInstance',
  })
  @ApiParam({
    name: 'serial_number',
    type: 'string',
    description: 'Application serial number',
    example: 'APP-1734299400000',
  })
  @ApiResponse({
    status: 204,
    description: 'Application instance successfully withdrawn',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Application instance not found',
    type: NotFoundResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden - Either not the applicant or application status does not allow withdrawal (only DRAFT and RUNNING instances can be withdrawn)',
    type: ForbiddenResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    type: InternalServerErrorResponseDto,
  })
  withdrawApplicationInstance(
    @Param('serial_number') serial_number: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.workflowEngine.withdrawApplicationInstance(serial_number, user);
  }

  @ApiExcludeEndpoint()
  @Delete(':serial_number/force')
  @RequireFeature('hardDeleteEnabled')
  @UseGuards(AuthGuard, FeatureFlagGuard)
  @HttpCode(204)
  @ApiOperation({
    summary: '[Admin] Force delete an application instance',
    description:
      'Permanently delete an application instance (hard delete). Deletes WorkflowNode (cascades to ApprovalTask and WorkflowComment), FormInstance, WorkflowInstance, and ApplicationInstance. WorkflowHistory is preserved for audit trail purposes.',
    operationId: 'forceDeleteApplicationInstance',
  })
  @ApiParam({
    name: 'serial_number',
    type: 'string',
    description: 'Application serial number',
    example: 'APP-1734299400000',
  })
  @ApiResponse({
    status: 204,
    description: 'Application instance successfully force deleted',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Application instance not found',
    type: NotFoundResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - User is not authorized',
    type: ForbiddenResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    type: InternalServerErrorResponseDto,
  })
  forceDeleteApplicationInstance(
    @Param('serial_number') serial_number: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    return this.workflowEngine.forceDeleteApplicationInstance(
      serial_number,
      user,
    );
  }

  @Post('validate-fields')
  @ApiOperation({
    summary: 'Validate specific form fields in real-time',
    description:
      'Executes inline and/or registry-based validators for a single field. ' +
      'Used for real-time field validation before form submission.',
    operationId: 'validateFields',
  })
  @ApiBody({ type: ValidateFieldsDto })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
    type: ValidateFieldsResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or business rule violation',
    type: BadRequestResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    type: InternalServerErrorResponseDto,
  })
  @HttpCode(200)
  async validateFields(
    @Body() dto: ValidateFieldsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ValidateFieldsResponseDto> {
    return this.applicationService.validateFields(dto, user.id);
  }

  @Post('check-duplicate')
  @ApiOperation({
    summary: 'Check for duplicate form submissions by field value',
    description:
      'Checks if a specific field value already exists across submitted instances of the same form. ' +
      'Only searches RUNNING and COMPLETED instances.',
    operationId: 'checkDuplicate',
  })
  @ApiBody({ type: CheckDuplicateDto })
  @ApiResponse({
    status: 200,
    description: 'Duplicate check result with matching instances',
    type: DuplicateCheckResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data',
    type: BadRequestResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Form not found',
    type: NotFoundResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error',
    type: InternalServerErrorResponseDto,
  })
  @HttpCode(200)
  checkDuplicate(
    @Body() dto: CheckDuplicateDto,
  ): Promise<DuplicateCheckResponseDto> {
    return this.applicationService.checkDuplicate(dto);
  }
}
