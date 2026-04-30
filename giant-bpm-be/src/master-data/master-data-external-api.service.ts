import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ScriptExecutionService } from '../script-execution/script-execution.service';
import { ApiConfigDto } from './dto/api-config.dto';
import { DatasetFieldMappingsDto } from './dto/field-mapping.dto';
import { DatasetFieldDto, FieldType } from './dto/create-dataset.dto';

export interface ExternalApiDatasetDefinition {
  api_config: ApiConfigDto;
  field_mappings: DatasetFieldMappingsDto;
  fields: DatasetFieldDto[];
}

@Injectable()
export class MasterDataExternalApiService {
  private readonly logger = new Logger(MasterDataExternalApiService.name);

  constructor(
    private readonly scriptExecutionService: ScriptExecutionService,
  ) {}

  async testExternalApi(config: ApiConfigDto): Promise<unknown> {
    const script = this.buildFetchScript(config);
    this.logger.log(`Testing external API: ${config.method} ${config.url}`);
    return this.scriptExecutionService.executeFetch(script);
  }

  async fetchAndMapRecords(
    definition: ExternalApiDatasetDefinition,
  ): Promise<Record<string, unknown>[]> {
    const rawResponse = await this.testExternalApi(definition.api_config);
    const { records_path, mappings } = definition.field_mappings;

    // Extract the records array from the response
    const rawRecords = records_path
      ? this.resolveJsonPath(rawResponse, records_path)
      : rawResponse;

    if (!Array.isArray(rawRecords)) {
      throw new BadRequestException(
        `Expected an array at records_path "${records_path}", got ${typeof rawRecords}`,
      );
    }

    // Apply field mappings to each record
    const fieldTypeMap = new Map(
      definition.fields.map((f) => [f.name, f.type]),
    );

    return rawRecords.map((rawRecord: unknown) => {
      const mapped: Record<string, unknown> = {};
      for (const mapping of mappings) {
        const rawValue = this.resolveJsonPath(rawRecord, mapping.json_path);
        mapped[mapping.field_name] = this.coerceValue(
          rawValue,
          fieldTypeMap.get(mapping.field_name),
        );
      }
      return mapped;
    });
  }

  applyInMemoryQuery(
    records: Record<string, unknown>[],
    filter: Record<string, unknown>,
    select: string[] | undefined,
    page: number,
    limit: number,
    sortField?: string,
    sortOrder: 'asc' | 'desc' = 'desc',
  ): {
    items: Record<string, unknown>[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  } {
    // Filter
    let filtered = records;
    const filterKeys = Object.keys(filter).filter((k) => !k.startsWith('_'));
    if (filterKeys.length > 0) {
      filtered = records.filter((record) =>
        filterKeys.every((key) => String(record[key]) === String(filter[key])),
      );
    }

    // Sort
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return sortOrder === 'asc' ? -1 : 1;
        if (bVal == null) return sortOrder === 'asc' ? 1 : -1;
        if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);

    // Paginate
    const offset = (page - 1) * limit;
    let items = filtered.slice(offset, offset + limit);

    // Select
    if (select && select.length > 0) {
      items = items.map((record) => {
        const picked: Record<string, unknown> = {};
        for (const key of select) {
          picked[key] = record[key];
        }
        return picked;
      });
    }

    return { items, total, page, limit, totalPages };
  }

  resolveJsonPath(obj: unknown, path: string): unknown {
    if (!path) return obj;
    return path.split('.').reduce((current: unknown, key: string) => {
      if (current == null) return undefined;
      if (typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[key];
    }, obj);
  }

  private coerceValue(
    value: unknown,
    fieldType: FieldType | undefined,
  ): unknown {
    if (value == null) return null;
    if (!fieldType) return value;

    switch (fieldType) {
      case FieldType.NUMBER:
        return Number(value);
      case FieldType.BOOLEAN:
        return Boolean(value);
      case FieldType.DATE:
        return new Date(value as string).toISOString();
      case FieldType.TEXT:
      default:
        return typeof value === 'object'
          ? JSON.stringify(value)
          : String(value as string | number | boolean);
    }
  }

  private buildFetchScript(config: ApiConfigDto): string {
    const optionsParts: string[] = [];
    optionsParts.push(`method: '${config.method}'`);

    if (config.headers && Object.keys(config.headers).length > 0) {
      optionsParts.push(`headers: ${JSON.stringify(config.headers)}`);
    }

    if (config.body) {
      optionsParts.push(`body: ${JSON.stringify(config.body)}`);
    }

    const optionsStr = `{ ${optionsParts.join(', ')} }`;

    return `
      const res = fetch(${JSON.stringify(config.url)}, ${optionsStr});
      if (!res.ok) {
        throw new Error('External API request failed: ' + res.status + ' ' + res.statusText);
      }
      return res.json();
    `;
  }
}
