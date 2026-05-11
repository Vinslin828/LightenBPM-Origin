import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  Put,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  StreamableFile,
  Logger,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiExtraModels,
  ApiBody,
  ApiExcludeEndpoint,
  ApiConsumes,
} from '@nestjs/swagger';
import {
  MasterDataSchemaService,
  UnifiedDatasetDefinition,
} from './master-data-schema.service';
import { MasterDataRecordService } from './master-data-record.service';
import { MasterDataExternalApiService } from './master-data-external-api.service';
import { MasterDataMembershipService } from './master-data-membership.service';
import { SYSTEM_DATASET_ORG_MEMBERSHIPS } from './constants';
import { CreateDatasetDto } from './dto/create-dataset.dto';
import { ImportDefinitionDto } from './dto/import-dataset.dto';
import { TestExternalApiDto } from './dto/test-external-api.dto';
import { UpdateExternalConfigDto } from './dto/update-external-config.dto';
import { UpdateDatasetDto } from './dto/update-dataset.dto';
import { UpdateDatasetSchemaDto } from './dto/update-dataset-schema.dto';
import { RebuildDatasetSchemaDto } from './dto/rebuild-dataset-schema.dto';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { isAdminUser } from '../auth/types/auth-user';
import type { AuthUser } from '../auth/types/auth-user';
import { DatasetDefinitionResponseDto } from './dto/response/dataset-definition-response.dto';
import { DatasetListResponseDto } from './dto/response/dataset-list-response.dto';
import { DatasetRecordListResponseDto } from './dto/response/dataset-record-list-response.dto';
import { DatasetExportResponseDto } from './dto/response/dataset-export-response.dto';
import { DatasetImportResponseDto } from './dto/response/dataset-import-response.dto';
import { omit } from '../common/utils/object-utils';
import { MasterDataUtils } from './utils';

@ApiTags('Master Data Management')
@Controller('master-data')
@UseGuards(AuthGuard)
@ApiExtraModels(DatasetDefinitionResponseDto)
export class MasterDataController {
  private readonly logger = new Logger(MasterDataController.name);

  constructor(
    private readonly schemaService: MasterDataSchemaService,
    private readonly recordService: MasterDataRecordService,
    private readonly externalApiService: MasterDataExternalApiService,
    private readonly membershipService: MasterDataMembershipService,
  ) {}

  private mapDefinition(
    definition: UnifiedDatasetDefinition,
  ): DatasetDefinitionResponseDto {
    return omit(definition, ['table_name']) as DatasetDefinitionResponseDto;
  }

  // External API Operations (must be before parameterized :code routes)
  @Post('external-api/test')
  @ApiOperation({
    summary: 'Test an external API configuration',
    description:
      'Fires a test request to the external API and returns the raw JSON response for field mapping.',
  })
  @ApiResponse({
    status: 200,
    description: 'Raw JSON response from the external API',
  })
  @ApiBody({ type: TestExternalApiDto })
  async testExternalApi(
    @Body() dto: TestExternalApiDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'Only admin users can perform this operation',
      );
    }
    return this.externalApiService.testExternalApi(dto.api_config);
  }

  // Schema Operations
  @Post()
  @ApiOperation({ summary: 'Create a new dataset' })
  @ApiResponse({ status: 201, type: DatasetDefinitionResponseDto })
  async createDataset(
    @Body() dto: CreateDatasetDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'Only admin users can perform this operation',
      );
    }
    const definition = await this.schemaService.createDataset(dto, user.code);
    return this.mapDefinition(definition);
  }

  @Get()
  @ApiOperation({ summary: 'List all datasets' })
  @ApiQuery({ name: '_page', required: false, type: Number })
  @ApiQuery({ name: '_limit', required: false, type: Number })
  @ApiResponse({ status: 200, type: DatasetListResponseDto })
  async listDatasets(@Query() query: Record<string, string>) {
    const page = query._page ? parseInt(query._page, 10) : 1;
    const limit = query._limit ? parseInt(query._limit, 10) : 10;
    const result = await this.schemaService.listDatasets(page, limit);
    return {
      ...result,
      items: result.items.map((item) => this.mapDefinition(item)),
    };
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get dataset definition' })
  @ApiResponse({ status: 200, type: DatasetDefinitionResponseDto })
  async getDataset(@Param('code') code: string) {
    const definition = await this.schemaService.getDataset(code);
    return this.mapDefinition(definition);
  }

  @Get('get-code/:name')
  @ApiOperation({ summary: 'Get dataset code by name' })
  @ApiResponse({
    status: 200,
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'USERS' },
      },
    },
  })
  async getDatasetCodeByName(@Param('name') name: string) {
    return this.schemaService.getDatasetCodeByName(name);
  }

  @Delete(':code')
  @ApiOperation({ summary: 'Delete a dataset' })
  @ApiResponse({ status: 200 })
  async deleteDataset(
    @Param('code') code: string,
    @CurrentUser() user: AuthUser,
  ) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'Only admin users can perform this operation',
      );
    }
    return this.schemaService.deleteDataset(code);
  }

  @Patch(':code/schema')
  @ApiExcludeEndpoint()
  @ApiOperation({
    summary: 'Update dataset schema',
    description:
      'Add or remove columns from a DATABASE dataset. Atomic — add and remove in one call. Not supported for EXTERNAL_API datasets.',
  })
  @ApiResponse({ status: 200, type: DatasetDefinitionResponseDto })
  @ApiBody({ type: UpdateDatasetSchemaDto })
  async updateDatasetSchema(
    @Param('code') code: string,
    @Body() dto: UpdateDatasetSchemaDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'Only admin users can perform this operation',
      );
    }
    const definition = await this.schemaService.updateDatasetSchema(
      code,
      dto,
      user.code,
    );
    return this.mapDefinition(definition);
  }

  @Put(':code/schema')
  @ApiOperation({
    summary: 'Rebuild dataset schema (destructive — all data deleted)',
    description:
      'Drops and recreates the underlying table with the new schema. All existing data is permanently deleted. confirm_data_loss must be true.',
  })
  @ApiResponse({ status: 200, type: DatasetDefinitionResponseDto })
  @ApiBody({ type: RebuildDatasetSchemaDto })
  async rebuildDatasetSchema(
    @Param('code') code: string,
    @Body() dto: RebuildDatasetSchemaDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'Only admin users can perform this operation',
      );
    }
    const definition = await this.schemaService.rebuildDatasetSchema(
      code,
      dto,
      user.code,
    );
    return this.mapDefinition(definition);
  }

  @Patch(':code')
  @ApiOperation({ summary: 'Update dataset metadata (e.g. display name)' })
  @ApiResponse({ status: 200, type: DatasetDefinitionResponseDto })
  @ApiBody({ type: UpdateDatasetDto })
  async updateDataset(
    @Param('code') code: string,
    @Body() dto: UpdateDatasetDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'Only admin users can perform this operation',
      );
    }
    const definition = await this.schemaService.updateDataset(
      code,
      dto,
      user.code,
    );
    return this.mapDefinition(definition);
  }

  @Patch(':code/external-config')
  @ApiOperation({
    summary: 'Update external API configuration',
    description:
      'Update the API config and/or field mappings for an external API dataset.',
  })
  @ApiResponse({ status: 200, type: DatasetDefinitionResponseDto })
  @ApiBody({ type: UpdateExternalConfigDto })
  async updateExternalConfig(
    @Param('code') code: string,
    @Body() dto: UpdateExternalConfigDto,
    @CurrentUser() user: AuthUser,
  ) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'Only admin users can perform this operation',
      );
    }
    const definition = await this.schemaService.updateExternalConfig(
      code,
      dto,
      user.code,
    );
    return this.mapDefinition(definition);
  }

  @Get(':code/export')
  @ApiOperation({ summary: 'Export dataset definition (schema only)' })
  @ApiResponse({ status: 200, type: DatasetExportResponseDto })
  async exportDataset(@Param('code') code: string) {
    const result = await this.schemaService.exportDataset(code);
    return { definition: this.mapDefinition(result.definition) };
  }

  @Post('import')
  @ApiOperation({ summary: 'Import dataset definition (schema only)' })
  @ApiResponse({ status: 201, type: DatasetImportResponseDto })
  @ApiBody({ type: ImportDefinitionDto })
  async importDataset(
    @Body() body: ImportDefinitionDto,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'Only admin users can perform this operation',
      );
    }
    const dto = body;

    if (dto.records !== undefined) {
      res.setHeader('Deprecation', 'true');
      this.logger.warn(
        `importDataset: payload included deprecated "records" field for dataset "${dto.definition.code}" (${dto.records.length} rows dropped)`,
      );
    }
    const result = await this.schemaService.importDataset(dto, user.code);
    return { ...result, definition: this.mapDefinition(result.definition) };
  }

  // CSV Export / Import
  @Get(':code/records/export-csv')
  @ApiOperation({ summary: 'Export all dataset records as a CSV file' })
  @ApiResponse({
    status: 200,
    description: 'CSV file attachment',
    content: { 'text/csv': {} },
  })
  async exportRecordsCsv(@Param('code') code: string): Promise<StreamableFile> {
    const { fields, rows } =
      code === SYSTEM_DATASET_ORG_MEMBERSHIPS
        ? await this.membershipService.exportAllRecords()
        : await this.recordService.exportAllRecords(code);
    const csv = MasterDataUtils.recordsToCsv(fields, rows);
    return new StreamableFile(Buffer.from(csv, 'utf-8'), {
      type: 'text/csv',
      disposition: `attachment; filename="${code}.csv"`,
    });
  }

  @Post(':code/records/import-csv')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Import records from a CSV file (atomic — no pre-validation)',
    description:
      'Uploads a CSV file and inserts all rows in a single transaction. Any database constraint violation rolls back the entire import.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'CSV file' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Number of inserted records',
    schema: {
      type: 'object',
      properties: { inserted: { type: 'number', example: 42 } },
    },
  })
  async importRecordsCsv(
    @Param('code') code: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthUser,
  ) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'Only admin users can perform this operation',
      );
    }
    if (!file) {
      throw new BadRequestException('No file uploaded.');
    }
    if (code === SYSTEM_DATASET_ORG_MEMBERSHIPS) {
      return this.membershipService.importCsvRecords(file.buffer, user.id);
    }
    return this.recordService.importCsvRecords(code, file.buffer);
  }

  // Record Operations
  @Post(':code/records')
  @ApiOperation({
    summary: 'Insert a record or multiple records (Bulk Insert)',
  })
  @ApiResponse({
    status: 201,
    type: 'object',
    isArray: true,
    description: 'Returns the created record(s)',
  })
  @ApiBody({
    schema: {
      oneOf: [{ type: 'object' }, { type: 'array', items: { type: 'object' } }],
      example: { vendor_name: 'Vendor A', score: 95 },
    },
    description: 'A single record or an array of records',
  })
  async createRecord(
    @Param('code') code: string,
    @Body() data: Record<string, unknown> | Record<string, unknown>[],
    @CurrentUser() user: AuthUser,
  ) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'Only admin users can perform this operation',
      );
    }
    if (code === SYSTEM_DATASET_ORG_MEMBERSHIPS) {
      const record = Array.isArray(data) ? data[0] : data;
      return this.membershipService.createRecord(record, user.id);
    }
    return this.recordService.createRecord(code, data);
  }

  @Get(':code/records')
  @ApiOperation({
    summary: 'Query records',
    description:
      'Query records with optional filters. Any field defined in the dataset can be used as a query parameter for filtering (e.g., ?vendor_name=VendorA).',
  })
  @ApiQuery({
    name: '_select',
    required: false,
    type: String,
    description: 'Comma-separated list of fields',
  })
  @ApiQuery({ name: '_page', required: false, type: Number })
  @ApiQuery({ name: '_limit', required: false, type: Number })
  @ApiQuery({
    name: '_sortBy',
    required: false,
    type: String,
    description: 'Field name to sort by',
  })
  @ApiQuery({
    name: '_sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order (default: desc)',
  })
  @ApiResponse({ status: 200, type: DatasetRecordListResponseDto })
  async findRecords(
    @Param('code') code: string,
    @Query() query: Record<string, string>,
  ) {
    const { _select, _page, _limit, _sortBy, _sortOrder, ...filter } = query;
    const page = _page ? parseInt(_page, 10) : 1;
    const limit = _limit ? parseInt(_limit, 10) : 10;
    const sortOrder = _sortOrder === 'asc' ? 'asc' : 'desc';
    if (code === SYSTEM_DATASET_ORG_MEMBERSHIPS) {
      return this.membershipService.findRecords(filter, page, limit, _sortBy, sortOrder);
    }
    const select = _select ? _select.split(',') : undefined;
    return this.recordService.findRecords(
      code,
      filter,
      select,
      page,
      limit,
      _sortBy,
      sortOrder,
    );
  }

  @Patch(':code/records')
  @ApiOperation({
    summary: 'Bulk update records',
    description:
      'Update records that match the filter criteria. Filter parameters should be passed in the query string.',
  })
  @ApiQuery({
    name: 'filter',
    style: 'deepObject',
    explode: true,
    type: 'object',
    description:
      'Filter criteria (e.g., ?vendor_name=VendorA). Any dataset field can be used.',
    required: true,
  })
  @ApiBody({
    schema: {
      type: 'object',
      example: { score: 100 },
    },
    description: 'Fields to update',
  })
  @ApiResponse({
    status: 200,
    type: 'object',
    isArray: true,
    description: 'Returns the updated records',
  })
  async updateRecords(
    @Param('code') code: string,
    @Query() filter: Record<string, unknown>,
    @Body() data: Record<string, unknown>,
    @CurrentUser() user: AuthUser,
  ) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'Only admin users can perform this operation',
      );
    }
    if (code === SYSTEM_DATASET_ORG_MEMBERSHIPS) {
      const id = filter.id ? Number(filter.id) : null;
      if (!id) {
        throw new BadRequestException(
          'Membership update requires an id filter (?id=123).',
        );
      }
      return this.membershipService.updateRecord(id, data, user.id);
    }
    return this.recordService.updateRecords(code, filter, data);
  }

  @Delete(':code/records')
  @ApiOperation({
    summary: 'Bulk delete records',
    description:
      'Delete records that match the filter criteria. Filter parameters should be passed in the query string.',
  })
  @ApiQuery({
    name: 'filter',
    style: 'deepObject',
    explode: true,
    type: 'object',
    description:
      'Filter criteria (e.g., ?vendor_name=VendorA). Any dataset field can be used.',
    required: true,
  })
  @ApiResponse({
    status: 200,
    type: 'object',
    isArray: true,
    description: 'Returns the deleted records',
  })
  async deleteRecords(
    @Param('code') code: string,
    @Query() filter: Record<string, unknown>,
    @CurrentUser() user: AuthUser,
  ) {
    if (!isAdminUser(user)) {
      throw new ForbiddenException(
        'Only admin users can perform this operation',
      );
    }
    if (code === SYSTEM_DATASET_ORG_MEMBERSHIPS) {
      const id = filter.id ? Number(filter.id) : null;
      if (!id) {
        throw new BadRequestException(
          'Membership delete requires an id filter (?id=123).',
        );
      }
      return this.membershipService.deleteRecord(id);
    }
    return this.recordService.deleteRecords(code, filter);
  }
}
