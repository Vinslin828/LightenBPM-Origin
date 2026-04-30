import { BadRequestException } from '@nestjs/common';
import { DatasetFieldDto, FieldType } from './dto/create-dataset.dto';

export class MasterDataUtils {
  private static readonly IDENTIFIER_REGEX = /^[a-z][a-z0-9_]*$/;

  /**
   * Validates a SQL identifier (table or column name).
   * Must match ^[a-z][a-z0-9_]*$ and not be a reserved keyword (simplified for MVP).
   */
  static validateIdentifier(name: string): void {
    if (!this.IDENTIFIER_REGEX.test(name)) {
      throw new BadRequestException(
        `Invalid identifier: "${name}". Must start with a lowercase letter and contain only lowercase letters, numbers, or underscores.`,
      );
    }
  }

  /**
   * Sanitizes and quotes a SQL identifier.
   */
  static quoteIdentifier(name: string): string {
    this.validateIdentifier(name);
    return `"${name}"`;
  }

  /**
   * Returns the dynamic master_data schema name based on the environment.
   */
  static getMasterDataSchemaName(): string {
    const dbSchema = process.env.DB_SCHEMA;
    if (dbSchema && dbSchema !== 'public') {
      return `${dbSchema}_master_data`;
    }
    return 'master_data';
  }

  /**
   * Returns the full table name with schema prefix if it starts with md_.
   */
  static getFullTableName(tableName: string): string {
    this.validateIdentifier(tableName);
    if (tableName.startsWith('md_')) {
      return `"${this.getMasterDataSchemaName()}"."${tableName}"`;
    }
    return `"${tableName}"`;
  }

  /**
   * Maps a FieldType to its PostgreSQL column type SQL fragment.
   */
  static fieldTypeToSql(type: FieldType): string {
    switch (type) {
      case FieldType.TEXT:
        return 'VARCHAR(2000)';
      case FieldType.NUMBER:
        return 'DECIMAL(20, 5)';
      case FieldType.BOOLEAN:
        return 'BOOLEAN';
      case FieldType.DATE:
        return 'TIMESTAMP WITH TIME ZONE';
    }
  }

  /**
   * Converts a default value to a SQL DEFAULT literal for the given FieldType.
   */
  static defaultValueToSql(
    value: string | number | boolean,
    type: FieldType,
  ): string {
    switch (type) {
      case FieldType.TEXT:
        return `'${String(value).replace(/'/g, "''")}'`;
      case FieldType.NUMBER: {
        const num = Number(value);
        if (!Number.isFinite(num)) {
          throw new BadRequestException(
            `Invalid numeric default_value: "${value}".`,
          );
        }
        return String(num);
      }
      case FieldType.BOOLEAN:
        return value ? 'TRUE' : 'FALSE';
      case FieldType.DATE:
        return `'${String(value).replace(/'/g, "''")}'::timestamptz`;
    }
  }

  /**
   * Coerces raw PostgreSQL row values to their declared JavaScript types.
   * The `pg` driver returns DECIMAL columns as strings; this method normalises
   * all field values to the types defined in the dataset schema.
   *
   * @param row          Raw row from $queryRawUnsafe
   * @param fieldTypeMap Map of field name → FieldType (does NOT include "id")
   */
  static coerceRowValues(
    row: Record<string, unknown>,
    fieldTypeMap: Map<string, FieldType>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (value === null || value === undefined) {
        result[key] = null;
        continue;
      }
      const fieldType = fieldTypeMap.get(key);
      if (!fieldType) {
        // "id" and any unknown field: keep as-is (pg returns INT as number)
        result[key] = value;
        continue;
      }
      switch (fieldType) {
        case FieldType.NUMBER:
          result[key] = Number(value);
          break;
        case FieldType.BOOLEAN:
          result[key] = Boolean(value);
          break;
        case FieldType.DATE:
          result[key] =
            value instanceof Date
              ? value.toISOString()
              : new Date(value as string).toISOString();
          break;
        case FieldType.TEXT:
        default:
          result[key] = value as string;
      }
    }
    return result;
  }

  /**
   * Serializes dataset rows to RFC 4180 CSV.
   * Header row contains the field names (excludes the auto-generated "id").
   * Null/undefined values become empty strings.
   */
  static recordsToCsv(
    fields: DatasetFieldDto[],
    rows: Record<string, unknown>[],
  ): string {
    const escape = (v: unknown) => MasterDataUtils.escapeCsvValue(v);
    const headers = fields.map((f) => f.name);
    const lines: string[] = [headers.map(escape).join(',')];
    for (const row of rows) {
      lines.push(headers.map((h) => escape(row[h])).join(','));
    }
    return lines.join('\r\n');
  }

  private static escapeCsvValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str =
      typeof value === 'string'
        ? value
        : typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value);
    if (
      str.includes(',') ||
      str.includes('"') ||
      str.includes('\n') ||
      str.includes('\r')
    ) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Parses a RFC 4180 CSV buffer.
   * Returns the header row separately so callers can validate it against the schema.
   */
  static parseCsv(buffer: Buffer): {
    headers: string[];
    rows: Record<string, string>[];
  } {
    const text = buffer
      .toString('utf-8')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
    const allRows = MasterDataUtils.parseCsvRows(text);
    if (allRows.length === 0) return { headers: [], rows: [] };
    const headers = allRows[0];
    const rows = allRows.slice(1).map((values) => {
      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[h] = values[i] ?? '';
      });
      return record;
    });
    return { headers, rows };
  }

  private static parseCsvRows(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        field += ch;
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ',') {
        row.push(field);
        field = '';
        i++;
        continue;
      }
      if (ch === '\n') {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
        i++;
        continue;
      }
      field += ch;
      i++;
    }
    row.push(field);
    if (row.some((f) => f.length > 0)) rows.push(row);
    return rows;
  }

  /**
   * Returns true when two field arrays represent the same schema.
   * Compares positionally: name, type, required, unique, default_value.
   */
  static isSameSchema(a: DatasetFieldDto[], b: DatasetFieldDto[]): boolean {
    if (a.length !== b.length) return false;
    return a.every(
      (af, i) =>
        af.name === b[i].name &&
        af.type === b[i].type &&
        af.required === b[i].required &&
        (af.unique ?? false) === (b[i].unique ?? false) &&
        (af.default_value ?? null) === (b[i].default_value ?? null),
    );
  }

  /**
   * Parses a value based on its Master Data FieldType.
   */
  static parseFieldValue(
    value: unknown,
    type: FieldType,
  ): number | boolean | Date | string | null {
    if (value === null || value === undefined || value === '') return null;
    if (type === FieldType.NUMBER) {
      const parsed = Number(value);
      return isNaN(parsed) ? null : parsed;
    }
    if (type === FieldType.BOOLEAN) {
      if (typeof value === 'string') return value.toLowerCase() === 'true';
      return Boolean(value);
    }
    if (type === FieldType.DATE) return new Date(value as string);
    return value as string;
  }
}
