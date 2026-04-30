/**
 * GetMasterData Executor
 *
 * Executes the getMasterData() function
 * Returns records from a master data dataset with optional filter/sort
 *
 * @example
 * // Get all records (by dataset name)
 * getMasterData("Vendor List")
 *
 * // With server-side filter (keys match actual column names)
 * getMasterData("Vendor List", { filter: { status: "active" } })
 *
 * // With server-side sort
 * getMasterData("Vendor List", { sort: { field: "score", order: "desc" } })
 *
 * // With pagination
 * getMasterData("Vendor List", { page: 2, limit: 10 })
 *
 * // With limit
 * getMasterData("Vendor List", { limit: 10 })
 *
 * // With select (specific fields only, using actual column names)
 * getMasterData("Vendor List", { select: ["vendor_name", "score"] })
 *
 * // Combined
 * getMasterData("Vendor List", { filter: { status: "active" }, sort: { field: "score", order: "desc" }, limit: 100 })
 *
 * // Client-side filtering/sorting with native JS array methods
 * getMasterData("Vendor List").filter(v => v.score > 90)
 * getMasterData("Vendor List").sort((a, b) => b.score - a.score)
 * getMasterData("Vendor List").filter(v => v.status === "active").sort((a, b) => a.vendor_name.localeCompare(b.vendor_name))
 */

import { Injectable } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { FunctionExecutor } from '../types/function-executor.interface';
import { ExecutionContext } from '../types/execution-context';
import { FlowExecutionError, ErrorCode } from '../../types';
import { MasterDataRecordService } from '../../../master-data/master-data-record.service';

// Maximum number of records to fetch
const MAX_RECORDS = 10000;

/**
 * Options for getMasterData function
 */
export interface GetMasterDataOptions {
  /** Filter conditions - keys match actual column names (e.g., { currency_code: "USD" }) */
  filter?: Record<string, unknown>;
  /** Sort configuration */
  sort?: {
    /** Field name matching actual column name */
    field: string;
    /** Sort order (default: "asc") */
    order?: 'asc' | 'desc';
  };
  /** Select specific fields (using actual column names) */
  select?: string[];
  /** Page number (default: 1) */
  page?: number;
  /** Limit number of records (default: MAX_RECORDS) */
  limit?: number;
}

/**
 * Convert Prisma Decimal objects to plain JavaScript numbers recursively
 */
function convertDecimalsToNumbers(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value instanceof Decimal) {
      result[key] = value.toNumber();
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      result[key] = convertDecimalsToNumbers(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = (value as unknown[]).map((item): unknown =>
        item !== null && typeof item === 'object'
          ? convertDecimalsToNumbers(item as Record<string, unknown>)
          : item,
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

@Injectable()
export class GetMasterDataExecutor implements FunctionExecutor {
  constructor(
    private readonly masterDataRecordService: MasterDataRecordService,
  ) {}

  /**
   * Execute getMasterData(datasetName, options?)
   *
   * @param args - [datasetName, options?] - Dataset name and optional options
   * @param context - Execution context (not used but required by interface)
   * @returns Array of records from the dataset, with actual column names as keys
   */
  async execute(
    args: unknown[],
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: ExecutionContext,
  ): Promise<Record<string, unknown>[]> {
    // Validate arguments
    if (args.length < 1 || args.length > 2) {
      throw new FlowExecutionError(
        `getMasterData() expects 1-2 arguments (dataset name, options?), got ${args.length}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    const datasetName = args[0];

    if (!datasetName || typeof datasetName !== 'string') {
      throw new FlowExecutionError(
        `getMasterData() requires a non-empty string as dataset name`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }

    // Parse options
    const options = (args[1] as GetMasterDataOptions) || {};

    const filter: Record<string, unknown> = options.filter || {};
    const select = options.select;
    const sortField = options.sort?.field;
    const sortOrder = options.sort?.order || 'asc';

    const page = options.page && options.page > 0 ? options.page : 1;
    const limit = options.limit
      ? Math.min(options.limit, MAX_RECORDS)
      : MAX_RECORDS;

    try {
      // Resolve dataset name to code
      const definition =
        await this.masterDataRecordService.getDefinitionByName(datasetName);

      const result = await this.masterDataRecordService.findRecords(
        definition.code,
        filter,
        select,
        page,
        limit,
        sortField,
        sortOrder,
      );

      // Convert Decimal objects to plain numbers
      const records = result.items.map((record) =>
        convertDecimalsToNumbers(record),
      );

      return records;
    } catch (error) {
      if (error instanceof FlowExecutionError) {
        throw error;
      }

      // Handle NotFoundException from MasterDataRecordService
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      throw new FlowExecutionError(
        `Failed to fetch master data "${datasetName}": ${errorMessage}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
      );
    }
  }
}
