import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ValidationRegistryService } from './validation-registry.service';
import { ValidationComponentMappingService } from './validation-component-mapping.service';
import { CreateValidationRegistryDto } from './dto/request/create-validation-registry.dto';
import { PatchValidationRegistryDto } from './dto/request/patch-validation-registry.dto';
import { GetValidationRegistryDto } from './dto/request/get-validation-registry.dto';
import { ValidationRegistryResponseDto } from './dto/response/validation-registry-response.dto';
import { PutComponentsDto } from './dto/request/put-components.dto';
import { ComponentsListResponseDto } from './dto/response/components-list-response.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user';
import { PaginatedResponseDto } from '../common/dto/pagination.dto';
import {
  BadRequestResponseDto,
  NotFoundResponseDto,
  ConflictResponseDto,
  InternalServerErrorResponseDto,
} from '../common/dto/error-response.dto';

@ApiTags('Validation Registry')
@UseGuards(AuthGuard)
@Controller('validation-registry')
export class ValidationRegistryController {
  constructor(
    private readonly validationRegistryService: ValidationRegistryService,
    private readonly componentMappingService: ValidationComponentMappingService,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new validation rule',
    description:
      'Optionally bind component types in the same request using the `components` field.',
  })
  @ApiResponse({
    status: 201,
    description: 'The validation rule has been successfully created.',
    type: ValidationRegistryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or business rule violation',
    type: BadRequestResponseDto,
  })
  @ApiResponse({
    status: 409,
    description:
      'Validation rule with the same name already exists on another validation rule.',
    type: ConflictResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
    type: InternalServerErrorResponseDto,
  })
  create(
    @Body() dto: CreateValidationRegistryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ValidationRegistryResponseDto> {
    return this.validationRegistryService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all validation rules with pagination' })
  @ApiResponse({
    status: 200,
    description: 'Return paginated validation rules.',
    schema: {
      example: {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            name: 'emailValidator',
            description: 'Validates email format',
            validationType: 'CODE',
            validationCode:
              'function validate(value) { return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value); }',
            errorMessage: 'Invalid email format',
            isActive: true,
            createdBy: 1,
            updatedBy: 1,
            createdAt: 1704096000000,
            updatedAt: 1704096000000,
            components: ['TextField', 'EmailField'],
          },
        ],
        total: 10,
        page: 1,
        limit: 10,
        totalPages: 1,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid query parameters.',
    type: BadRequestResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
    type: InternalServerErrorResponseDto,
  })
  findAll(
    @Query() query: GetValidationRegistryDto,
  ): Promise<PaginatedResponseDto<ValidationRegistryResponseDto>> {
    return this.validationRegistryService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a validation rule by ID' })
  @ApiResponse({
    status: 200,
    description: 'Return a single validation rule.',
    type: ValidationRegistryResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Validation rule not found.',
    type: NotFoundResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
    type: InternalServerErrorResponseDto,
  })
  findOne(@Param('id') id: string): Promise<ValidationRegistryResponseDto> {
    return this.validationRegistryService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a validation rule',
  })
  @ApiBody({
    type: PatchValidationRegistryDto,
    description:
      '**At least one field must be provided for update.**\n\n' +
      'Available fields: `name`, `description`, `validationType`, `validationCode`, `errorMessage`, `isActive`, `components`.\n\n' +
      'All fields are optional, but you must provide at least one field to update.\n\n' +
      '**Component bindings behavior:**\n' +
      '- `components` not provided (undefined): existing bindings remain unchanged\n' +
      '- `components: []`: clear all component bindings\n' +
      '- `components: ["A", "B"]`: replace with new bindings',
  })
  @ApiResponse({
    status: 200,
    description: 'The validation rule has been successfully updated.',
    type: ValidationRegistryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input data or business rule violation',
    type: BadRequestResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Validation rule not found.',
    type: NotFoundResponseDto,
  })
  @ApiResponse({
    status: 409,
    description:
      'Validation rule with the same name already exists on another validation rule.',
    type: ConflictResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
    type: InternalServerErrorResponseDto,
  })
  update(
    @Param('id') id: string,
    @Body() dto: PatchValidationRegistryDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ValidationRegistryResponseDto> {
    return this.validationRegistryService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a validation rule' })
  @ApiResponse({
    status: 204,
    description: 'The validation rule has been successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'Validation rule not found.',
    type: NotFoundResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
    type: InternalServerErrorResponseDto,
  })
  async remove(@Param('id') id: string): Promise<void> {
    await this.validationRegistryService.remove(id);
  }

  // ============================================================================
  // Component Mapping Endpoints
  // ============================================================================

  @Put(':id/components')
  @ApiOperation({
    summary: 'Set component bindings for a validation rule',
    description:
      'Replace all existing component bindings with the provided list. ' +
      'This operation is idempotent.',
  })
  @ApiResponse({
    status: 200,
    description: 'Component bindings have been successfully updated.',
    type: ComponentsListResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data (validation failed).',
    type: BadRequestResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Validation rule not found.',
    type: NotFoundResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
    type: InternalServerErrorResponseDto,
  })
  setComponents(
    @Param('id') id: string,
    @Body() dto: PutComponentsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ComponentsListResponseDto> {
    return this.componentMappingService.setComponents(id, dto, user.id);
  }

  @Get(':id/components')
  @ApiOperation({
    summary: 'Get component bindings for a validation rule',
  })
  @ApiResponse({
    status: 200,
    description:
      'Return the list of component mappings bound to this validation rule.',
    type: ComponentsListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Validation rule not found.',
    type: NotFoundResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
    type: InternalServerErrorResponseDto,
  })
  getComponents(@Param('id') id: string): Promise<ComponentsListResponseDto> {
    return this.componentMappingService.getComponents(id);
  }

  @Delete(':id/components/:component')
  @HttpCode(204)
  @ApiOperation({
    summary: 'Remove a specific component binding',
  })
  @ApiResponse({
    status: 204,
    description: 'The component binding has been successfully removed.',
  })
  @ApiResponse({
    status: 404,
    description: 'Validation rule or component binding not found.',
    type: NotFoundResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
    type: InternalServerErrorResponseDto,
  })
  async removeComponent(
    @Param('id') id: string,
    @Param('component') component: string,
  ): Promise<void> {
    await this.componentMappingService.removeComponent(id, component);
  }
}
