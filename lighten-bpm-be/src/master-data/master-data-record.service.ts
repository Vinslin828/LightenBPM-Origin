import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MasterDataUtils } from './utils';
import {
  DatasetFieldDto,
  FieldType,
  SourceType,
} from './dto/create-dataset.dto';
import { ApiConfigDto } from './dto/api-config.dto';
import { DatasetFieldMappingsDto } from './dto/field-mapping.dto';
import {
  SYSTEM_DATASET_ORG_UNIT_TRANSLATIONS,
  SYSTEM_DATASETS,
  isEditableSystemDataset,
} from './constants';
import { MasterDataExternalApiService } from './master-data-external-api.service';

interface InternalDatasetDefinition {
  code: string;
  table_name: string;
  fields: DatasetFieldDto[];
  source_type?: string;
  api_config?: ApiConfigDto | null;
  field_mappings?: DatasetFieldMappingsDto | null;
}

@Injectable()
export class MasterDataRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly externalApiService: MasterDataExternalApiService,
  ) {}

  private async getDefinition(
    code: string,
  ): Promise<InternalDatasetDefinition> {
    if (SYSTEM_DATASETS[code]) {
      return SYSTEM_DATASETS[code] as unknown as InternalDatasetDefinition;
    }
    const definition = await this.prisma.datasetDefinition.findUnique({
      where: { code },
    });
    if (!definition) {
      throw new NotFoundException(`Dataset "${code}" not found.`);
    }
    return {
      code: definition.code,
      table_name: definition.table_name,
      fields: definition.fields as unknown as DatasetFieldDto[],
      source_type: definition.source_type,
      api_config: definition.api_config as unknown as ApiConfigDto | null,
      field_mappings:
        definition.field_mappings as unknown as DatasetFieldMappingsDto | null,
    };
  }

  async getDefinitionByName(name: string): Promise<InternalDatasetDefinition> {
    // Check system datasets by name
    for (const key of Object.keys(SYSTEM_DATASETS)) {
      if (SYSTEM_DATASETS[key].name === name) {
        return SYSTEM_DATASETS[key] as unknown as InternalDatasetDefinition;
      }
    }
    const definition = await this.prisma.datasetDefinition.findFirst({
      where: { name },
    });
    if (!definition) {
      throw new NotFoundException(`Dataset with name "${name}" not found.`);
    }
    return {
      code: definition.code,
      table_name: definition.table_name,
      fields: definition.fields as unknown as DatasetFieldDto[],
      source_type: definition.source_type,
      api_config: definition.api_config as unknown as ApiConfigDto | null,
      field_mappings:
        definition.field_mappings as unknown as DatasetFieldMappingsDto | null,
    };
  }

  async createRecord(
    code: string,
    data: Record<string, unknown> | Record<string, unknown>[],
  ) {
    if (SYSTEM_DATASETS[code] && !isEditableSystemDataset(code)) {
      throw new ForbiddenException(`System dataset "${code}" is read-only.`);
    }
    const definition = await this.getDefinition(code);
    if (definition.source_type === SourceType.EXTERNAL_API) {
      throw new ForbiddenException(
        `External API dataset "${code}" is read-only.`,
      );
    }
    const fields = definition.fields;
    const allowedFields = fields.map((f) => f.name);
    const fieldTypeMap = new Map(fields.map((f) => [f.name, f.type]));

    const defaultsMap: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.default_value !== undefined) {
        defaultsMap[field.name] = field.default_value;
      }
    }

    const rawRecords = Array.isArray(data) ? data : [data];

    if (rawRecords.length === 0) {
      throw new BadRequestException('No data provided for record creation.');
    }

    // Apply field defaults then validate; incoming values override defaults
    const records = rawRecords.map((r) =>
      this.prepareRecordForInsert(code, { ...defaultsMap, ...r }),
    );

    // Validate all records first
    records.forEach((record) => {
      this.validateRecord(record, allowedFields, code);
    });

    const tableName = MasterDataUtils.getFullTableName(definition.table_name);

    // If only one record, use the standard simple INSERT
    if (records.length === 1) {
      const record = records[0];
      const dataKeys = Object.keys(record);
      const insertKeys =
        code === SYSTEM_DATASET_ORG_UNIT_TRANSLATIONS
          ? [...dataKeys, 'updated_at']
          : dataKeys;
      const columns = insertKeys.map((key) =>
        MasterDataUtils.quoteIdentifier(key),
      );
      const placeholders = insertKeys.map((_, i) => `$${i + 1}`);
      const values = insertKeys.map((key) =>
        key === 'updated_at'
          ? new Date()
          : MasterDataUtils.parseFieldValue(
              record[key],
              fieldTypeMap.get(key) as FieldType,
            ),
      );

      const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *;`;
      const result = await this.prisma.$queryRawUnsafe<
        Record<string, unknown>[]
      >(sql, ...values);
      return Array.isArray(data) ? result : result[0];
    }

    // Multi-record insert (Bulk)
    // We assume all records have the same keys for simplicity in this DML generation
    // If not, we take the union of all keys or reject (here we reject if keys differ from first record for consistency)
    const firstRecordKeys = Object.keys(records[0]);
    const insertKeys =
      code === SYSTEM_DATASET_ORG_UNIT_TRANSLATIONS
        ? [...firstRecordKeys, 'updated_at']
        : firstRecordKeys;
    const columns = insertKeys.map((key) =>
      MasterDataUtils.quoteIdentifier(key),
    );

    const values: any[] = [];
    const valuePlaceholders: string[] = [];

    records.forEach((record) => {
      const currentKeys = Object.keys(record);
      if (
        currentKeys.length !== firstRecordKeys.length ||
        !currentKeys.every((k) => firstRecordKeys.includes(k))
      ) {
        throw new BadRequestException(
          'All records in a bulk insert must have the same set of fields.',
        );
      }

      const rowPlaceholders = insertKeys.map((key) => {
        values.push(
          key === 'updated_at'
            ? new Date()
            : MasterDataUtils.parseFieldValue(
                record[key],
                fieldTypeMap.get(key) as FieldType,
              ),
        );
        return `$${values.length}`;
      });
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    });

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${valuePlaceholders.join(', ')} RETURNING *;`;

    const result = await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      sql,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      ...values,
    );

    return result;
  }

  private validateRecord(
    record: Record<string, unknown>,
    allowedFields: string[],
    code: string,
  ) {
    const dataKeys = Object.keys(record);
    if (dataKeys.length === 0) {
      throw new BadRequestException('Record cannot be empty.');
    }
    dataKeys.forEach((key) => {
      if (!allowedFields.includes(key)) {
        throw new BadRequestException(
          `Field "${key}" is not defined in dataset "${code}".`,
        );
      }
    });
  }

  private prepareRecordForInsert(
    code: string,
    record: Record<string, unknown>,
  ): Record<string, unknown> {
    if (code !== SYSTEM_DATASET_ORG_UNIT_TRANSLATIONS) {
      return record;
    }
    const sanitized = { ...record };
    delete sanitized.id;
    delete sanitized.created_at;
    delete sanitized.updated_at;
    return sanitized;
  }

  private sanitizeUpdateData(
    code: string,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    if (code !== SYSTEM_DATASET_ORG_UNIT_TRANSLATIONS) {
      return data;
    }
    const sanitized = { ...data };
    delete sanitized.id;
    delete sanitized.created_at;
    delete sanitized.updated_at;
    return sanitized;
  }

  async findRecords(
    code: string,
    filter: Record<string, unknown> = {},
    select?: string[],
    page = 1,
    limit = 10,
    sortField?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    const definition = await this.getDefinition(code);

    // External API dataset: fetch from API and apply in-memory query
    if (definition.source_type === SourceType.EXTERNAL_API) {
      if (!definition.api_config || !definition.field_mappings) {
        throw new BadRequestException(
          `External API dataset "${code}" is missing API configuration.`,
        );
      }
      const allRecords = await this.externalApiService.fetchAndMapRecords({
        api_config: definition.api_config,
        field_mappings: definition.field_mappings,
        fields: definition.fields,
      });
      return this.externalApiService.applyInMemoryQuery(
        allRecords,
        filter,
        select,
        page,
        limit,
        sortField,
        sortOrder,
      );
    }

    const fields = definition.fields;
    const allowedFields = fields.map((f) => f.name);
    const fieldTypeMap = new Map(fields.map((f) => [f.name, f.type]));

    // Validate select and build explicit column list.
    // Always use explicit columns (never SELECT *) so that the prepared statement
    // text changes when the schema changes, preventing PostgreSQL error 0A000
    // ("cached plan must not change result type") after ALTER TABLE operations.
    let selectClause: string;
    if (select && select.length > 0) {
      select.forEach((s) => {
        if (!allowedFields.includes(s)) {
          throw new BadRequestException(
            `Field "${s}" is not defined in dataset "${code}".`,
          );
        }
      });
      selectClause = select
        .map((s) => MasterDataUtils.quoteIdentifier(s))
        .join(', ');
    } else {
      selectClause = [
        '"id"',
        ...fields.map((f) => MasterDataUtils.quoteIdentifier(f.name)),
      ].join(', ');
    }

    // Validate filter and build WHERE clause
    const whereClauses: string[] = [];
    const values: any[] = [];
    Object.keys(filter).forEach((key) => {
      if (key.startsWith('_')) return; // Ignore special params like _select
      if (!allowedFields.includes(key)) {
        throw new BadRequestException(
          `Field "${key}" is not defined in dataset "${code}".`,
        );
      }
      whereClauses.push(
        `${MasterDataUtils.quoteIdentifier(key)} = $${values.length + 1}`,
      );
      values.push(
        MasterDataUtils.parseFieldValue(
          filter[key],
          fieldTypeMap.get(key) as FieldType,
        ),
      );
    });

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count query
    const countSql = `SELECT COUNT(*) FROM ${MasterDataUtils.getFullTableName(
      definition.table_name,
    )} ${whereSql};`;
    const countResult = await this.prisma.$queryRawUnsafe<{ count: bigint }[]>(
      countSql,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      ...values,
    );
    const total = Number(countResult[0].count);

    // Items query
    const offset = (page - 1) * limit;
    let orderByClause = 'ORDER BY id DESC';
    if (sortField) {
      if (!allowedFields.includes(sortField)) {
        throw new BadRequestException(
          `Field "${sortField}" is not defined in dataset "${code}".`,
        );
      }
      orderByClause = `ORDER BY ${MasterDataUtils.quoteIdentifier(sortField)} ${sortOrder.toUpperCase()}`;
    }
    const itemsSql = `SELECT ${selectClause} FROM ${MasterDataUtils.getFullTableName(
      definition.table_name,
    )} ${whereSql} ${orderByClause} LIMIT ${limit} OFFSET ${offset};`;

    const rawItems = await this.prisma.$queryRawUnsafe<
      Record<string, unknown>[]
    >(
      itemsSql,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      ...values,
    );
    const items = rawItems.map((row) =>
      MasterDataUtils.coerceRowValues(row, fieldTypeMap),
    );

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateRecords(
    code: string,
    filter: Record<string, unknown>,
    data: Record<string, unknown>,
  ) {
    if (SYSTEM_DATASETS[code] && !isEditableSystemDataset(code)) {
      throw new ForbiddenException(`System dataset "${code}" is read-only.`);
    }
    const definition = await this.getDefinition(code);
    if (definition.source_type === SourceType.EXTERNAL_API) {
      throw new ForbiddenException(
        `External API dataset "${code}" is read-only.`,
      );
    }
    data = this.sanitizeUpdateData(code, data);
    const fields = definition.fields;
    const allowedFields = fields.map((f) => f.name);
    const fieldTypeMap = new Map(fields.map((f) => [f.name, f.type]));

    // Validate data keys
    const dataKeys = Object.keys(data);
    if (dataKeys.length === 0) {
      throw new BadRequestException('No data provided for update.');
    }
    dataKeys.forEach((key) => {
      if (!allowedFields.includes(key) || key === 'id') {
        throw new BadRequestException(`Field "${key}" is invalid for update.`);
      }
    });

    const setClauses: string[] = [];
    const values: any[] = [];

    dataKeys.forEach((key) => {
      setClauses.push(
        `${MasterDataUtils.quoteIdentifier(key)} = $${values.length + 1}`,
      );
      values.push(
        MasterDataUtils.parseFieldValue(
          data[key],
          fieldTypeMap.get(key) as FieldType,
        ),
      );
    });

    if (code === SYSTEM_DATASET_ORG_UNIT_TRANSLATIONS) {
      setClauses.push(
        `${MasterDataUtils.quoteIdentifier('updated_at')} = CURRENT_TIMESTAMP`,
      );
    }

    const whereClauses: string[] = [];
    Object.keys(filter).forEach((key) => {
      if (key.startsWith('_')) return;
      if (!allowedFields.includes(key)) {
        throw new BadRequestException(
          `Field "${key}" is not defined in dataset "${code}".`,
        );
      }
      whereClauses.push(
        `${MasterDataUtils.quoteIdentifier(key)} = $${values.length + 1}`,
      );
      values.push(
        MasterDataUtils.parseFieldValue(
          filter[key],
          fieldTypeMap.get(key) as FieldType,
        ),
      );
    });

    if (whereClauses.length === 0) {
      throw new BadRequestException(
        'Update requires at least one filter criterion.',
      );
    }

    const sql = `UPDATE ${MasterDataUtils.getFullTableName(
      definition.table_name,
    )} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')} RETURNING *;`;

    return await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      sql,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      ...values,
    );
  }

  async exportAllRecords(
    code: string,
  ): Promise<{ fields: DatasetFieldDto[]; rows: Record<string, unknown>[] }> {
    const definition = await this.getDefinition(code);
    if (definition.source_type === SourceType.EXTERNAL_API) {
      throw new ForbiddenException(
        `External API dataset "${code}" cannot be exported as CSV.`,
      );
    }
    const fields = definition.fields;
    const fieldTypeMap = new Map(fields.map((f) => [f.name, f.type]));
    const selectClause = [
      '"id"',
      ...fields.map((f) => MasterDataUtils.quoteIdentifier(f.name)),
    ].join(', ');
    const tableName = MasterDataUtils.getFullTableName(definition.table_name);
    const sql = `SELECT ${selectClause} FROM ${tableName} ORDER BY id ASC;`;
    const rawRows =
      await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(sql);
    const rows = rawRows.map((row) =>
      MasterDataUtils.coerceRowValues(row, fieldTypeMap),
    );
    return { fields, rows };
  }

  async importCsvRecords(
    code: string,
    fileBuffer: Buffer,
  ): Promise<{ inserted: number }> {
    if (SYSTEM_DATASETS[code] && !isEditableSystemDataset(code)) {
      throw new ForbiddenException(`System dataset "${code}" is read-only.`);
    }
    const definition = await this.getDefinition(code);
    if (definition.source_type === SourceType.EXTERNAL_API) {
      throw new ForbiddenException(
        `External API dataset "${code}" is read-only.`,
      );
    }

    const { headers, rows } = MasterDataUtils.parseCsv(fileBuffer);
    if (rows.length === 0) return { inserted: 0 };

    const fields = definition.fields;
    const allowedFields = fields.map((f) => f.name);
    const fieldTypeMap = new Map(fields.map((f) => [f.name, f.type]));

    const insertHeaders = headers.filter(
      (h) => !['id', 'created_at', 'updated_at'].includes(h),
    );
    for (const h of insertHeaders) {
      if (!allowedFields.includes(h)) {
        throw new BadRequestException(
          `CSV column "${h}" is not defined in dataset "${code}".`,
        );
      }
    }
    if (insertHeaders.length === 0) {
      throw new BadRequestException('CSV contains no valid data columns.');
    }

    const tableName = MasterDataUtils.getFullTableName(definition.table_name);
    const csvInsertHeaders =
      code === SYSTEM_DATASET_ORG_UNIT_TRANSLATIONS
        ? [...insertHeaders, 'updated_at']
        : insertHeaders;
    const columns = csvInsertHeaders.map((h) =>
      MasterDataUtils.quoteIdentifier(h),
    );
    const values: (number | boolean | Date | string | null)[] = [];
    const valuePlaceholders: string[] = [];

    for (const row of rows) {
      const rowPlaceholders = csvInsertHeaders.map((h) => {
        values.push(
          h === 'updated_at'
            ? new Date()
            : MasterDataUtils.parseFieldValue(
                row[h],
                fieldTypeMap.get(h) as FieldType,
              ),
        );
        return `$${values.length}`;
      });
      valuePlaceholders.push(`(${rowPlaceholders.join(', ')})`);
    }

    const sql = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES ${valuePlaceholders.join(', ')};`;

    try {
      await this.prisma.$transaction(async (tx) => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        await tx.$queryRawUnsafe(sql, ...(values as any[]));
      });
    } catch (err: unknown) {
      if (
        err instanceof BadRequestException ||
        err instanceof ForbiddenException ||
        err instanceof NotFoundException
      ) {
        throw err;
      }
      const message =
        err instanceof Error
          ? err.message
          : 'Database error during CSV import.';
      throw new BadRequestException(message);
    }

    return { inserted: rows.length };
  }

  async deleteRecords(code: string, filter: Record<string, unknown>) {
    if (SYSTEM_DATASETS[code] && !isEditableSystemDataset(code)) {
      throw new ForbiddenException(`System dataset "${code}" is read-only.`);
    }
    const definition = await this.getDefinition(code);
    if (definition.source_type === SourceType.EXTERNAL_API) {
      throw new ForbiddenException(
        `External API dataset "${code}" is read-only.`,
      );
    }
    const fields = definition.fields;
    const allowedFields = fields.map((f) => f.name);
    const fieldTypeMap = new Map(fields.map((f) => [f.name, f.type]));

    const whereClauses: string[] = [];
    const values: any[] = [];
    Object.keys(filter).forEach((key) => {
      if (key.startsWith('_')) return;
      if (!allowedFields.includes(key)) {
        throw new BadRequestException(
          `Field "${key}" is not defined in dataset "${code}".`,
        );
      }
      whereClauses.push(
        `${MasterDataUtils.quoteIdentifier(key)} = $${values.length + 1}`,
      );
      values.push(
        MasterDataUtils.parseFieldValue(
          filter[key],
          fieldTypeMap.get(key) as FieldType,
        ),
      );
    });

    if (whereClauses.length === 0) {
      throw new BadRequestException(
        'Delete requires at least one filter criterion.',
      );
    }

    const sql = `DELETE FROM ${MasterDataUtils.getFullTableName(
      definition.table_name,
    )} WHERE ${whereClauses.join(' AND ')} RETURNING *;`;

    return await this.prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      sql,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      ...values,
    );
  }
}
