import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  HttpCode,
  Query,
  UseGuards,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FormWorkflowBindingService } from './form-workflow-binding.service';
import { FormWorkflowBindingDto } from './dto/form-workflow-binding.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CreateFormWorkflowBindingDto } from './dto/create-form-workflow-binding.dto';
import { CreateFormWorkflowBindingResponseDto } from './dto/create-form-workflow-binding-response';
import { CurrentUser } from '../auth/current-user.decorator';
import { isAdminUser } from '../auth/types/auth-user';
import type { AuthUser } from '../auth/types/auth-user';

@ApiTags('Flow Engine | Application Life Cycle')
@UseGuards(AuthGuard)
@Controller('bindings')
export class FormWorkflowBindingController {
  constructor(private readonly bindingService: FormWorkflowBindingService) {}

  @Post()
  @ApiOperation({ summary: 'Bind a form to a workflow' })
  @ApiResponse({
    status: 201,
    description: 'The binding has been successfully created.',
    type: () => CreateFormWorkflowBindingResponseDto,
  })
  create(
    @Body() createDto: CreateFormWorkflowBindingDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateFormWorkflowBindingResponseDto> {
    return this.bindingService.create(createDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get form-workflow bindings' })
  @ApiQuery({
    name: 'form_id',
    required: false,
    type: String,
    description: 'Filter by form public ID',
  })
  @ApiQuery({
    name: 'workflow_id',
    required: false,
    type: String,
    description: 'Filter by workflow public ID',
  })
  @ApiResponse({
    status: 200,
    description: 'The form-workflow bindings have been successfully retrieved.',
    type: [FormWorkflowBindingDto],
  })
  @ApiResponse({
    status: 404,
    description: 'No bindings found for the given criteria.',
  })
  find(
    @Query('form_id') formId?: string,
    @Query('workflow_id') workflowId?: string,
  ) {
    return this.bindingService.find(formId, workflowId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'get binding information by ID' })
  @ApiResponse({
    status: 200,
    description: 'The form-workflow bindings have been successfully retrieved.',
    type: FormWorkflowBindingDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No bindings found for the given criteria.',
  })
  get(@Param('id', ParseIntPipe) id: number): Promise<FormWorkflowBindingDto> {
    return this.bindingService.get(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a form-workflow binding by ID' })
  @ApiResponse({ status: 204, description: 'Binding deleted successfully.' })
  delete(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    if (!isAdminUser(user))
      throw new ForbiddenException(
        `user ${user.sub} not allow to delete binding`,
      );
    return this.bindingService.delete(id);
  }
}
