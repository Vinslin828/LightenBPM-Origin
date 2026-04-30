import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateDatasetDto,
  FieldType,
  DatasetFieldDto,
  SourceType,
} from './dto/create-dataset.dto';
import { ApiConfigDto } from './dto/api-config.dto';
import { DatasetFieldMappingsDto } from './dto/field-mapping.dto';
import { UpdateExternalConfigDto } from './dto/update-external-config.dto';
import { UpdateDatasetDto } from './dto/update-dataset.dto';
import { UpdateDatasetSchemaDto } from './dto/update-dataset-schema.dto';
import { RebuildDatasetSchemaDto } from './dto/rebuild-dataset-schema.dto';
import { MasterDataUtils } from './utils';
import { SYSTEM_DATASETS } from './constants';

export interface UnifiedDatasetDefinition {
  id: number;
  code: string;
  table_name: string;
  name: string;
  fields: DatasetFieldDto[];
  source_type: string;
  api_config?: ApiConfigDto | null;
  field_mappings?: DatasetFieldMappingsDto | null;
  created_by: string;
  updated_by: string;
  created_at: Date;
  updated_at: Date;
}

@Injectable()
export class MasterDataSchemaService implements OnModuleInit {
  private readonly logger = new Logger(MasterDataSchemaService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const schemaName = MasterDataUtils.getMasterDataSchemaName();
    this.logger.log(`Checking if ${schemaName} schema exists...`);

    // Check if schema was already created by admin to avoid permission errors
    const result = await this.prisma.$queryRawUnsafe<{ schema_name: string }[]>(
      `SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1;`,
      schemaName,
    );

    if (result.length > 0) {
      this.logger.log(
        `${schemaName} schema already exists, skipping creation.`,
      );
      return;
    }

    this.logger.log(`Initializing ${schemaName} schema...`);
    await this.prisma.$executeRawUnsafe(
      `CREATE SCHEMA IF NOT EXISTS "${schemaName}";`,
    );
  }

  async createDataset(
    dto: CreateDatasetDto,
    userCode: string,
  ): Promise<UnifiedDatasetDefinition> {
    this.logger.log(`Creating dataset ${dto.code}`);
    // 0. Check if it's a system dataset
    if (SYSTEM_DATASETS[dto.code]) {
      throw new ConflictException(
        `Code "${dto.code}" is reserved for system datasets.`,
      );
    }
    // 1. Check if code already exists
    const existing = await this.prisma.datasetDefinition.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(
        `Dataset with code "${dto.code}" already exists.`,
      );
    }

    const isExternalApi = dto.source_type === SourceType.EXTERNAL_API;
    const filteredFields = dto.fields.filter(
      (f) => f.name.toLowerCase().trim() !== 'id',
    );

    if (isExternalApi) {
      // External API dataset: no physical table, just save metadata
      const tableName = `ext_${dto.code.toLowerCase()}`;
      this.logger.log(`Creating external API dataset ${dto.code} (no DDL)`);

      const definition = await this.prisma.datasetDefinition.create({
        data: {
          code: dto.code,
          table_name: tableName,
          name: dto.name,
          fields: filteredFields as unknown as Prisma.InputJsonValue,
          source_type: SourceType.EXTERNAL_API,
          api_config: dto.api_config as unknown as Prisma.InputJsonValue,
          field_mappings:
            dto.field_mappings as unknown as Prisma.InputJsonValue,
          created_by: userCode,
          updated_by: userCode,
        },
      });

      return {
        ...definition,
        fields: definition.fields as unknown as DatasetFieldDto[],
        api_config: definition.api_config as unknown as ApiConfigDto,
        field_mappings:
          definition.field_mappings as unknown as DatasetFieldMappingsDto,
      };
    }

    // Database dataset: create physical table
    const tableName = `md_${dto.code.toLowerCase()}`;
    MasterDataUtils.validateIdentifier(tableName);

    // 2. Construct CREATE TABLE SQL
    const columnsSql = filteredFields.map((field) => {
      const name = MasterDataUtils.quoteIdentifier(field.name);
      const typeSql = MasterDataUtils.fieldTypeToSql(field.type);
      return [
        name,
        typeSql,
        field.required ? 'NOT NULL' : '',
        field.unique ? 'UNIQUE' : '',
      ]
        .filter(Boolean)
        .join(' ');
    });

    // Add id as primary key
    columnsSql.unshift(
      `${MasterDataUtils.quoteIdentifier('id')} SERIAL PRIMARY KEY`,
    );

    const fullTableName = MasterDataUtils.getFullTableName(tableName);
    const createTableSql = `CREATE TABLE ${fullTableName} (${columnsSql.join(
      ', ',
    )});`;

    this.logger.log(`Executing DDL: ${createTableSql}`);

    // 3. Execute DDL and Save Metadata in transaction
    return await this.prisma.$transaction(async (tx) => {
      // Save metadata
      const definition = await tx.datasetDefinition.create({
        data: {
          code: dto.code,
          table_name: tableName,
          name: dto.name,
          fields: filteredFields as unknown as Prisma.InputJsonValue,
          source_type: SourceType.DATABASE,
          created_by: userCode,
          updated_by: userCode,
        },
      });

      // Execute DDL
      await tx.$executeRawUnsafe(createTableSql);

      return {
        ...definition,
        fields: definition.fields as unknown as DatasetFieldDto[],
        api_config: definition.api_config as unknown as ApiConfigDto | null,
        field_mappings:
          definition.field_mappings as unknown as DatasetFieldMappingsDto | null,
      };
    });
  }

  async deleteDataset(code: string) {
    if (SYSTEM_DATASETS[code]) {
      throw new ConflictException(
        `System dataset "${code}" cannot be deleted.`,
      );
    }
    const definition = await this.prisma.datasetDefinition.findUnique({
      where: { code },
    });

    if (!definition) {
      throw new NotFoundException(`Dataset "${code}" not found.`);
    }

    if ((definition.source_type as SourceType) === SourceType.EXTERNAL_API) {
      // External API dataset: no physical table to drop
      await this.prisma.datasetDefinition.delete({ where: { code } });
      return;
    }

    const dropTableSql = `DROP TABLE ${MasterDataUtils.getFullTableName(definition.table_name)};`;

    return await this.prisma.$transaction(async (tx) => {
      await tx.datasetDefinition.delete({ where: { code } });
      await tx.$executeRawUnsafe(dropTableSql);
    });
  }

  async getDataset(code: string): Promise<UnifiedDatasetDefinition> {
    if (SYSTEM_DATASETS[code]) {
      const system = SYSTEM_DATASETS[code];
      return {
        id: 0,
        ...system,
        source_type: SourceType.DATABASE,
        created_by: 'SYSTEM',
        updated_by: 'SYSTEM',
        created_at: new Date('2026-03-03T00:00:00Z'),
        updated_at: new Date('2026-03-03T00:00:00Z'),
      };
    }
    const definition = await this.prisma.datasetDefinition.findUnique({
      where: { code },
    });

    if (!definition) {
      throw new NotFoundException(`Dataset "${code}" not found.`);
    }

    return {
      ...definition,
      fields: definition.fields as unknown as DatasetFieldDto[],
      api_config: definition.api_config as unknown as ApiConfigDto | null,
      field_mappings:
        definition.field_mappings as unknown as DatasetFieldMappingsDto | null,
    };
  }

  async getDatasetCodeByName(name: string): Promise<{ code: string }> {
    const systemMatch = Object.values(SYSTEM_DATASETS).find(
      (sys) => sys.name === name,
    );
    if (systemMatch) {
      return { code: systemMatch.code };
    }

    const definition = await this.prisma.datasetDefinition.findFirst({
      where: { name },
      select: { code: true },
    });

    if (!definition) {
      throw new NotFoundException(`Dataset with name "${name}" not found.`);
    }

    return definition;
  }

  async listDatasets(
    page = 1,
    limit = 10,
  ): Promise<{
    items: UnifiedDatasetDefinition[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const [dbItems, total] = await Promise.all([
      this.prisma.datasetDefinition.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.datasetDefinition.count(),
    ]);

    const systemItems = Object.values(SYSTEM_DATASETS).map((system) => ({
      id: 0,
      ...system,
      source_type: SourceType.DATABASE as string,
      created_by: 'SYSTEM',
      updated_by: 'SYSTEM',
      created_at: new Date('2026-03-03T00:00:00Z'),
      updated_at: new Date('2026-03-03T00:00:00Z'),
    }));
    const mapDbItem = (
      d: (typeof dbItems)[number],
    ): UnifiedDatasetDefinition => ({
      ...d,
      fields: d.fields as unknown as DatasetFieldDto[],
      api_config: d.api_config as unknown as ApiConfigDto | null,
      field_mappings:
        d.field_mappings as unknown as DatasetFieldMappingsDto | null,
    });
    // Merge system items at the beginning if on first page
    const items =
      page === 1
        ? [...systemItems, ...dbItems.map(mapDbItem)]
        : dbItems.map(mapDbItem);

    return {
      items,
      total: total + systemItems.length,
      page,
      limit,
      totalPages: Math.ceil((total + systemItems.length) / limit),
    };
  }

  async updateExternalConfig(
    code: string,
    dto: UpdateExternalConfigDto,
    userCode: string,
  ): Promise<UnifiedDatasetDefinition> {
    const definition = await this.prisma.datasetDefinition.findUnique({
      where: { code },
    });

    if (!definition) {
      throw new NotFoundException(`Dataset "${code}" not found.`);
    }

    if ((definition.source_type as SourceType) !== SourceType.EXTERNAL_API) {
      throw new BadRequestException(
        `Dataset "${code}" is not an external API dataset.`,
      );
    }

    const updateData: Record<string, unknown> = {
      updated_by: userCode,
    };

    if (dto.api_config) {
      updateData.api_config =
        dto.api_config as unknown as Prisma.InputJsonValue;
    }
    if (dto.field_mappings) {
      updateData.field_mappings =
        dto.field_mappings as unknown as Prisma.InputJsonValue;

      // Sync `fields` from the incoming field_mappings so the column list stays
      // in step with the mapping config. Existing fields preserve their type/required;
      // new mapping entries default to TEXT/not-required; removed entries are dropped.
      // Note: datasets with stale fields are reconciled automatically on the next call here.
      const currentFields = definition.fields as unknown as DatasetFieldDto[];
      const existingFieldMap = new Map(currentFields.map((f) => [f.name, f]));
      const syncedFields: DatasetFieldDto[] = dto.field_mappings.mappings.map(
        (m): DatasetFieldDto =>
          existingFieldMap.get(m.field_name) ?? {
            name: m.field_name,
            type: FieldType.TEXT,
            required: false,
          },
      );
      updateData.fields = syncedFields as unknown as Prisma.InputJsonValue;
    }

    const updated = await this.prisma.datasetDefinition.update({
      where: { code },
      data: updateData,
    });

    return {
      ...updated,
      fields: updated.fields as unknown as DatasetFieldDto[],
      api_config: updated.api_config as unknown as ApiConfigDto | null,
      field_mappings:
        updated.field_mappings as unknown as DatasetFieldMappingsDto | null,
    };
  }

  async updateDataset(
    code: string,
    dto: UpdateDatasetDto,
    userCode: string,
  ): Promise<UnifiedDatasetDefinition> {
    if (SYSTEM_DATASETS[code]) {
      throw new ConflictException(
        `System dataset "${code}" cannot be modified.`,
      );
    }

    const definition = await this.prisma.datasetDefinition.findUnique({
      where: { code },
    });

    if (!definition) {
      throw new NotFoundException(`Dataset "${code}" not found.`);
    }

    if (!dto.name) {
      throw new BadRequestException('At least one field must be provided.');
    }

    if (dto.name) {
      const nameConflict = await this.prisma.datasetDefinition.findFirst({
        where: { name: dto.name, NOT: { code } },
        select: { code: true },
      });
      if (nameConflict) {
        throw new ConflictException(
          `A dataset with name "${dto.name}" already exists.`,
        );
      }
    }

    const updated = await this.prisma.datasetDefinition.update({
      where: { code },
      data: { name: dto.name, updated_by: userCode },
    });

    return {
      ...updated,
      fields: updated.fields as unknown as DatasetFieldDto[],
      api_config: updated.api_config as unknown as ApiConfigDto | null,
      field_mappings:
        updated.field_mappings as unknown as DatasetFieldMappingsDto | null,
    };
  }

  async updateDatasetSchema(
    code: string,
    dto: UpdateDatasetSchemaDto,
    userCode: string,
  ): Promise<UnifiedDatasetDefinition> {
    if (SYSTEM_DATASETS[code]) {
      throw new ConflictException(
        `System dataset "${code}" cannot be modified.`,
      );
    }

    const definition = await this.prisma.datasetDefinition.findUnique({
      where: { code },
    });

    if (!definition) {
      throw new NotFoundException(`Dataset "${code}" not found.`);
    }

    if ((definition.source_type as SourceType) === SourceType.EXTERNAL_API) {
      throw new BadRequestException(
        `Schema update is not supported for external API datasets. Use PATCH /${code}/external-config to update field mappings.`,
      );
    }

    const addFields = dto.add_fields ?? [];
    const removeFields = dto.remove_fields ?? [];

    if (addFields.length === 0 && removeFields.length === 0) {
      throw new BadRequestException(
        'At least one of add_fields or remove_fields must be provided.',
      );
    }

    const existingFields = definition.fields as unknown as DatasetFieldDto[];

    // Validate remove_fields
    for (const fieldName of removeFields) {
      if (fieldName === 'id') {
        throw new BadRequestException(`Cannot remove the "id" field.`);
      }
      const exists = existingFields.some((f) => f.name === fieldName);
      if (!exists) {
        throw new BadRequestException(
          `Field "${fieldName}" does not exist in dataset "${code}".`,
        );
      }
    }

    // Validate add_fields
    const existingNames = new Set(existingFields.map((f) => f.name));
    const addingNames = new Set<string>();
    for (const field of addFields) {
      if (field.name === 'id') {
        throw new BadRequestException(`Cannot add a field named "id".`);
      }
      if (existingNames.has(field.name)) {
        throw new ConflictException(
          `Field "${field.name}" already exists in dataset "${code}".`,
        );
      }
      if (addingNames.has(field.name)) {
        throw new ConflictException(
          `Duplicate field "${field.name}" in add_fields.`,
        );
      }
      addingNames.add(field.name);
    }

    const fullTableName = MasterDataUtils.getFullTableName(
      definition.table_name,
    );

    // Check if table has existing rows (needed for NOT NULL default validation)
    let hasRows = false;
    if (addFields.some((f) => f.required)) {
      const rowCheckResult = await this.prisma.$queryRawUnsafe<
        { has_rows: boolean }[]
      >(`SELECT EXISTS(SELECT 1 FROM ${fullTableName}) AS has_rows;`);
      hasRows = rowCheckResult[0]?.has_rows ?? false;
    }

    // Validate that required fields have default_value when table has rows
    for (const field of addFields) {
      if (field.required && hasRows && field.default_value === undefined) {
        throw new BadRequestException(
          `A default_value is required when adding a NOT NULL column "${field.name}" to a table with existing data.`,
        );
      }
      if (field.required && field.unique && hasRows) {
        throw new BadRequestException(
          `Cannot add a required UNIQUE column "${field.name}" to a table with existing data — backfilling would cause a UNIQUE constraint violation.`,
        );
      }
    }

    // Build new fields JSON: existing - removed + added
    const removedSet = new Set(removeFields);
    const newFields: DatasetFieldDto[] = [
      ...existingFields.filter((f) => !removedSet.has(f.name)),
      ...addFields.map(
        ({ name, type, required, default_value, unique }): DatasetFieldDto => ({
          name,
          type,
          required,
          ...(default_value !== undefined && { default_value }),
          ...(unique !== undefined && { unique }),
        }),
      ),
    ];

    // Build DDL statements
    const ddlStatements: string[] = [];

    // Removals first
    for (const fieldName of removeFields) {
      ddlStatements.push(
        `ALTER TABLE ${fullTableName} DROP COLUMN ${MasterDataUtils.quoteIdentifier(fieldName)};`,
      );
    }

    // Additions
    for (const field of addFields) {
      const colName = MasterDataUtils.quoteIdentifier(field.name);
      const typeSql = MasterDataUtils.fieldTypeToSql(field.type);
      const uniqueSql = field.unique ? ' UNIQUE' : '';

      if (field.required && hasRows) {
        const defaultSql = MasterDataUtils.defaultValueToSql(
          field.default_value as string | number | boolean,
          field.type,
        );
        ddlStatements.push(
          `ALTER TABLE ${fullTableName} ADD COLUMN ${colName} ${typeSql} NOT NULL DEFAULT ${defaultSql}${uniqueSql};`,
        );
        ddlStatements.push(
          `ALTER TABLE ${fullTableName} ALTER COLUMN ${colName} DROP DEFAULT;`,
        );
      } else if (field.required) {
        ddlStatements.push(
          `ALTER TABLE ${fullTableName} ADD COLUMN ${colName} ${typeSql} NOT NULL${uniqueSql};`,
        );
      } else {
        ddlStatements.push(
          `ALTER TABLE ${fullTableName} ADD COLUMN ${colName} ${typeSql}${uniqueSql};`,
        );
      }
    }

    this.logger.log(
      `Updating schema for dataset ${code}: ${ddlStatements.length} DDL statements`,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      for (const sql of ddlStatements) {
        await tx.$executeRawUnsafe(sql);
      }

      return tx.datasetDefinition.update({
        where: { code },
        data: {
          fields: newFields as unknown as Prisma.InputJsonValue,
          updated_by: userCode,
        },
      });
    });

    return {
      ...updated,
      fields: updated.fields as unknown as DatasetFieldDto[],
      api_config: updated.api_config as unknown as ApiConfigDto | null,
      field_mappings:
        updated.field_mappings as unknown as DatasetFieldMappingsDto | null,
    };
  }

  async rebuildDatasetSchema(
    code: string,
    dto: RebuildDatasetSchemaDto,
    userCode: string,
  ): Promise<UnifiedDatasetDefinition> {
    if (SYSTEM_DATASETS[code]) {
      throw new ConflictException(
        `System dataset "${code}" cannot be modified.`,
      );
    }

    if (dto.confirm_data_loss !== true) {
      throw new BadRequestException(
        'confirm_data_loss must be true to proceed with schema rebuild.',
      );
    }

    const definition = await this.prisma.datasetDefinition.findUnique({
      where: { code },
    });

    if (!definition) {
      throw new NotFoundException(`Dataset "${code}" not found.`);
    }

    if ((definition.source_type as SourceType) === SourceType.EXTERNAL_API) {
      throw new BadRequestException(
        `Schema rebuild is not supported for external API datasets. Use PATCH /${code}/external-config to update field mappings.`,
      );
    }

    const newFields = dto.fields.filter(
      (f) => f.name.toLowerCase().trim() !== 'id',
    );

    const existingFields = definition.fields as unknown as DatasetFieldDto[];
    if (MasterDataUtils.isSameSchema(existingFields, newFields)) {
      this.logger.log(
        `Schema for dataset ${code} is unchanged — skipping rebuild`,
      );
      return {
        ...definition,
        fields: existingFields,
        api_config: definition.api_config as unknown as ApiConfigDto | null,
        field_mappings:
          definition.field_mappings as unknown as DatasetFieldMappingsDto | null,
      };
    }

    const fullTableName = MasterDataUtils.getFullTableName(
      definition.table_name,
    );

    const columnsSql = newFields.map((field) => {
      const colName = MasterDataUtils.quoteIdentifier(field.name);
      const typeSql = MasterDataUtils.fieldTypeToSql(field.type);
      return [
        colName,
        typeSql,
        field.required ? 'NOT NULL' : '',
        field.unique ? 'UNIQUE' : '',
      ]
        .filter(Boolean)
        .join(' ');
    });
    columnsSql.unshift(
      `${MasterDataUtils.quoteIdentifier('id')} SERIAL PRIMARY KEY`,
    );

    const dropSql = `DROP TABLE IF EXISTS ${fullTableName};`;
    const createSql = `CREATE TABLE ${fullTableName} (${columnsSql.join(', ')});`;

    this.logger.log(`Rebuilding schema for dataset ${code}: DROP + CREATE`);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(dropSql);
      await tx.$executeRawUnsafe(createSql);

      return tx.datasetDefinition.update({
        where: { code },
        data: {
          fields: newFields as unknown as Prisma.InputJsonValue,
          updated_by: userCode,
        },
      });
    });

    return {
      ...updated,
      fields: updated.fields as unknown as DatasetFieldDto[],
      api_config: updated.api_config as unknown as ApiConfigDto | null,
      field_mappings:
        updated.field_mappings as unknown as DatasetFieldMappingsDto | null,
    };
  }

  async exportDataset(code: string) {
    const definition = await this.getDataset(code);
    return { definition };
  }

  async importDataset(
    payload: {
      definition: CreateDatasetDto & {
        created_by?: string;
        updated_by?: string;
        created_at?: string;
      };
    },
    userCode: string,
  ) {
    this.logger.log(`Importing dataset ${payload.definition.code}`);

    if (payload.definition.source_type === SourceType.EXTERNAL_API) {
      throw new BadRequestException(
        'External API datasets cannot be imported.',
      );
    }

    const { definition: defDto } = payload;
    const existing = await this.prisma.datasetDefinition.findUnique({
      where: { code: defDto.code },
    });

    let definition: UnifiedDatasetDefinition;
    if (!existing) {
      this.logger.log(`Dataset definition not found, creating...`);
      definition = await this.createDatasetWithAudit(defDto, userCode);
    } else {
      this.logger.log(`Dataset definition found, skipping create.`);
      definition = {
        ...existing,
        fields: existing.fields as unknown as DatasetFieldDto[],
        api_config: existing.api_config as unknown as ApiConfigDto | null,
        field_mappings:
          existing.field_mappings as unknown as DatasetFieldMappingsDto | null,
      };
    }

    return { success: true, definition };
  }

  private async createDatasetWithAudit(
    dto: CreateDatasetDto & {
      created_by?: string;
      updated_by?: string;
      created_at?: string;
    },
    defaultUserCode: string,
  ): Promise<UnifiedDatasetDefinition> {
    const result = await this.createDataset(dto, defaultUserCode);

    if (dto.created_by || dto.updated_by || dto.created_at) {
      const updated = await this.prisma.datasetDefinition.update({
        where: { code: dto.code },
        data: {
          ...(dto.created_by ? { created_by: dto.created_by } : {}),
          ...(dto.updated_by ? { updated_by: dto.updated_by } : {}),
          ...(dto.created_at ? { created_at: new Date(dto.created_at) } : {}),
        },
      });
      return {
        ...updated,
        fields: updated.fields as unknown as DatasetFieldDto[],
        api_config: updated.api_config as unknown as ApiConfigDto | null,
        field_mappings:
          updated.field_mappings as unknown as DatasetFieldMappingsDto | null,
      };
    }

    return result;
  }
}
