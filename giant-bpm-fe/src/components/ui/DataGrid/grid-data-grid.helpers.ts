import { GridRowModel, GridRowsProp } from "@mui/x-data-grid";
import { randomId } from "@mui/x-data-grid-generator";

import {
  getFirstGridRequiredErrorMessage,
  getGridRequiredError,
  isGridEmptyValue,
  parseGridRows,
} from "@/components/form/entities/grid/grid-value-validation";

import {
  DropdownStaticDatasource,
  GridHeaderItem,
} from "./grid-data-grid.types";

export const getHeaderField = (header: GridHeaderItem) =>
  header.keyValue;

export const parseRowsFromValue = (value: unknown): GridRowsProp => {
  const parsedRows = parseGridRows(value);
  return parsedRows as GridRowsProp;
};

export const canAddRow = (rowsCount: number, maxRows?: number) =>
  maxRows === undefined || rowsCount < maxRows;

export const isEmptyValue = isGridEmptyValue;

export const getDropdownStaticDatasource = (
  datasource: unknown,
): DropdownStaticDatasource | undefined => {
  if (
    !datasource ||
    typeof datasource !== "object" ||
    !("type" in datasource) ||
    (datasource as { type?: string }).type !== "static"
  ) {
    return undefined;
  }

  const staticDatasource = datasource as DropdownStaticDatasource;
  if (!Array.isArray(staticDatasource.options)) {
    return undefined;
  }

  return staticDatasource;
};

export const getDropdownOptions = (header: GridHeaderItem) => {
  const staticDatasource = getDropdownStaticDatasource(header.datasource);
  if (!staticDatasource) {
    return [];
  }

  return staticDatasource.options;
};

export const getDefaultCellValue = (header: GridHeaderItem) => {
  if (header.type === "input") {
    if (typeof header.defaultValue === "string") {
      return header.defaultValue;
    }
    if (typeof header.defaultValue === "number") {
      return String(header.defaultValue);
    }
    return "";
  }

  if (header.type === "number") {
    if (typeof header.defaultValue === "number") {
      return header.defaultValue;
    }
    if (typeof header.defaultValue === "string" && header.defaultValue.trim()) {
      const parsed = Number(header.defaultValue);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  if (header.type === "date") {
    if (typeof header.defaultValue === "number") {
      return header.defaultValue;
    }
    if (typeof header.defaultValue === "string" && header.defaultValue.trim()) {
      const parsed = Number(header.defaultValue);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  }

  if (header.type === "dropdown") {
    const staticDatasource = getDropdownStaticDatasource(header.datasource);
    if (
      staticDatasource?.defaultValue &&
      !staticDatasource.defaultValue.isReference &&
      typeof staticDatasource.defaultValue.value === "string"
    ) {
      return staticDatasource.defaultValue.value;
    }
    return "";
  }

  return "";
};

export const getRequiredError = (header: GridHeaderItem, value: unknown) =>
  getGridRequiredError(header, value);

export const getFirstGridErrorMessage = (
  rows: GridRowsProp,
  headers: GridHeaderItem[],
) =>
  getFirstGridRequiredErrorMessage(
    rows as Record<string, unknown>[],
    headers,
  );

export const buildEmptyRow = (headers: GridHeaderItem[]) => {
  const row: Record<string, unknown> = {
    id: randomId(),
    isNew: true,
  };

  headers.forEach((header) => {
    row[getHeaderField(header)] = getDefaultCellValue(header);
  });

  return row as GridRowModel;
};
