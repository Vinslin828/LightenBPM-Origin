export type GridValidationHeaderItem = {
  label: string;
  key: string;
  keyValue: string;
  type: "input" | "number" | "date" | "dropdown";
  required?: boolean;
};

const getHeaderField = (header: GridValidationHeaderItem) =>
  header.keyValue;

const getGridCellValue = (
  row: Record<string, unknown>,
  header: GridValidationHeaderItem,
) => {
  const primaryField = getHeaderField(header);
  if (primaryField in row) {
    return row[primaryField];
  }

  if (header.key?.trim() && header.key in row) {
    return row[header.key];
  }

  return undefined;
};

export const parseGridRows = (value: unknown): Record<string, unknown>[] => {
  if (typeof value !== "string" || !value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
  } catch {
    return [];
  }
};

export const isGridEmptyValue = (value: unknown) =>
  value === undefined || value === null || value === "";

export const getGridRequiredError = (
  header: GridValidationHeaderItem,
  value: unknown,
) => {
  if (!header.required) {
    return undefined;
  }

  if (header.type === "input" || header.type === "dropdown") {
    if (typeof value === "string") {
      return value.trim().length === 0
        ? `${header.label} is required`
        : undefined;
    }
    return isGridEmptyValue(value) ? `${header.label} is required` : undefined;
  }

  if (header.type === "date") {
    if (value === undefined || value === null || value === "") {
      return `${header.label} is required`;
    }

    if (typeof value === "number") {
      return Number.isNaN(value) ? `${header.label} is required` : undefined;
    }

    if (typeof value === "string") {
      if (!value.trim()) {
        return `${header.label} is required`;
      }
      return Number.isNaN(Number(value))
        ? `${header.label} is required`
        : undefined;
    }

    return undefined;
  }

  if (value === undefined || value === null || value === "") {
    return `${header.label} is required`;
  }

  if (typeof value === "string") {
    if (!value.trim()) {
      return `${header.label} is required`;
    }
    return Number.isNaN(Number(value))
      ? `${header.label} is required`
      : undefined;
  }

  return undefined;
};

export const getFirstGridRequiredErrorMessage = (
  rows: Record<string, unknown>[],
  headers: GridValidationHeaderItem[],
) => {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    for (const header of headers) {
      const error = getGridRequiredError(header, getGridCellValue(row, header));
      if (error) {
        return `Row ${rowIndex + 1}: ${error}`;
      }
    }
  }

  return undefined;
};
