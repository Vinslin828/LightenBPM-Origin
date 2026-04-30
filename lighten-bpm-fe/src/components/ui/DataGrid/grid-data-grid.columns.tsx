import React from "react";
import dayjs from "dayjs";
import {
  GridCellParams,
  GridColDef,
  GridFilterOperator,
  getGridDateOperators,
  getGridNumericOperators,
  getGridSingleSelectOperators,
  getGridStringOperators,
  GridPreProcessEditCellProps,
  GridRenderCellParams,
  GridRenderEditCellParams,
  GridRowModel,
} from "@mui/x-data-grid";

import { DatePicker, DateTimePicker, TimePicker } from "@ui/datetime-selector";
import { Input } from "@ui/input";
import { Select } from "@ui/select";

import {
  getDropdownOptions,
  getHeaderField,
  getRequiredError,
  isEmptyValue,
} from "./grid-data-grid.helpers";
import { GridHeaderItem } from "./grid-data-grid.types";

const toComparableDate = (
  value: unknown,
  subtype?: GridHeaderItem["subtype"],
): Date | null => {
  if (value === undefined || value === null || value === "") return null;

  const timestamp =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number(value);

  if (Number.isNaN(timestamp)) return null;

  if (subtype === "time") {
    const normalized = dayjs(timestamp);
    return dayjs("2000-01-01")
      .hour(normalized.hour())
      .minute(normalized.minute())
      .second(normalized.second())
      .millisecond(normalized.millisecond())
      .toDate();
  }

  if (subtype === "date") {
    return dayjs(timestamp).startOf("day").toDate();
  }

  return dayjs(timestamp).toDate();
};

const getGridDateOperatorsBySubtype = (
  subtype?: GridHeaderItem["subtype"],
): GridFilterOperator[] =>
  getGridDateOperators(subtype !== "date").map((operator) => {
    const baseGetApply = operator.getApplyFilterFn;
    if (!baseGetApply) return operator;

    return {
      ...operator,
      getApplyFilterFn: (...args) => {
        const baseFn = baseGetApply(...args);
        if (!baseFn) return null;

        return (value, row, column, apiRef) => {
          const normalized = toComparableDate(value, subtype);
          if (normalized === null) {
            if (operator.value === "isEmpty") return true;
            if (operator.value === "isNotEmpty") return false;
            return false;
          }
          return baseFn(normalized, row, column, apiRef);
        };
      },
    };
  });

export const createGridColumns = (
  headers: GridHeaderItem[],
  readonly = false,
): GridColDef[] =>
  headers.map((header) => {
    const fieldKey = getHeaderField(header);
    const dropdownOptions = getDropdownOptions(header);
    const isTimeOnlyColumn =
      header.type === "date" && header.subtype === "time";

    const getRawValue = (row: GridRowModel) =>
      (row as Record<string, unknown>)[fieldKey];

    const toNumberOrNull = (value: unknown) => {
      if (value === undefined || value === null || value === "") return null;
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const columnType: GridColDef["type"] =
      header.type === "number"
        ? "number"
        : header.type === "dropdown"
          ? "singleSelect"
          : "string";

    const filterOperators =
      header.type === "number"
        ? getGridNumericOperators()
        : header.type === "date"
          ? getGridDateOperatorsBySubtype(header.subtype)
          : header.type === "dropdown"
            ? getGridSingleSelectOperators()
            : getGridStringOperators();

    return {
      field: fieldKey,
      headerName: header.label,
      type: columnType,
      width: 180,
      editable: !readonly,
      resizable: true,
      hideable: false,
      minWidth: 140,
      filterable: !isTimeOnlyColumn,
      align: "left",
      headerAlign: "left",
      filterOperators: isTimeOnlyColumn ? undefined : filterOperators,
      valueOptions: header.type === "dropdown" ? dropdownOptions : undefined,
      valueGetter: (_value, row) => {
        const rawValue = getRawValue(row as GridRowModel);
        if (header.type === "number") {
          return toNumberOrNull(rawValue);
        }
        if (header.type === "date") {
          return rawValue;
        }
        if (header.type === "dropdown") {
          return rawValue === undefined || rawValue === null
            ? ""
            : String(rawValue);
        }
        return rawValue === undefined || rawValue === null
          ? ""
          : String(rawValue);
      },
      valueParser: (value) => {
        if (header.type === "number") {
          return toNumberOrNull(value);
        }
        if (header.type === "date") {
          if (value === null || value === undefined || value === "") {
            return undefined;
          }
          if (typeof value === "number") return value;
          const parsed = dayjs(value as string).valueOf();
          return Number.isNaN(parsed) ? undefined : parsed;
        }
        if (header.type === "dropdown") {
          return value === undefined || value === null ? "" : String(value);
        }
        return value === undefined || value === null ? "" : String(value);
      },
      cellClassName: (params: GridCellParams) => {
        const rawValue = getRawValue(params.row as GridRowModel);
        const errorMessage = getRequiredError(header, rawValue);
        return errorMessage ? "grid-cell-error" : "";
      },
      preProcessEditCellProps: (params: GridPreProcessEditCellProps) => {
        const errorMessage = getRequiredError(header, params.props.value);
        const error = Boolean(errorMessage);
        return { ...params.props, error };
      },
      renderCell: (params: GridRenderCellParams) => {
        const value = getRawValue(params.row as GridRowModel);
        if (
          (header.type === "input" ||
            header.type === "number" ||
            header.type === "date" ||
            header.type === "dropdown") &&
          isEmptyValue(value) &&
          header.placeholder
        ) {
          return (
            <span className="text-secondary-text">{header.placeholder}</span>
          );
        }

        if (header.type === "date" && typeof value === "number") {
          const subtype = header.subtype ?? "date";
          const format =
            subtype === "time"
              ? "HH:mm"
              : subtype === "datetime"
                ? "YYYY-MM-DD HH:mm"
                : "YYYY-MM-DD";
          return (
            <span className="font-regular text-sm">
              {dayjs(value).format(format)}
            </span>
          );
        }

        if (header.type === "dropdown" && typeof value === "string") {
          const option = dropdownOptions.find((item) => item.value === value);
          return (
            <span className="font-regular text-sm">
              {option?.label ?? value}
            </span>
          );
        }

        return (
          <span className="font-regular text-sm">
            {value as React.ReactNode}
          </span>
        );
      },
      renderEditCell: (params: GridRenderEditCellParams) => {
        const value =
          params.value === undefined || params.value === null
            ? ""
            : String(params.value);

        if (header.type === "date") {
          const subtype = header.subtype ?? "date";
          const timestamp =
            typeof params.value === "number"
              ? params.value
              : typeof params.value === "string" && params.value.trim()
                ? Number(params.value)
                : undefined;
          const safeTimestamp =
            typeof timestamp === "number" && !Number.isNaN(timestamp)
              ? timestamp
              : undefined;

          const handleDateChange = (nextValue?: number) => {
            params.api.setEditCellValue({
              id: params.id,
              field: params.field,
              value: nextValue,
            });
          };

          const commonProps = {
            name: `grid-${String(params.id)}-${params.field}`,
            value: safeTimestamp,
            onChange: handleDateChange,
            placeholder: header.placeholder,
            required: header.required,
            usePortal: true,
          };

          if (subtype === "time") {
            return (
              <TimePicker
                {...commonProps}
                className="text-sm border-none"
                clearIcon
              />
            );
          }
          if (subtype === "datetime") {
            return (
              <DateTimePicker
                {...commonProps}
                className="text-sm border-none"
              />
            );
          }
          return (
            <DatePicker {...commonProps} className="text-sm border-none" />
          );
        }

        if (header.type === "dropdown") {
          const dropdownValue =
            params.value === undefined || params.value === null
              ? undefined
              : String(params.value);

          return (
            <Select
              mode="single"
              value={dropdownValue}
              options={dropdownOptions}
              placeholder={header.placeholder ?? "Select option"}
              className="text-sm border-none"
              onChange={(nextValue) => {
                const normalized = nextValue ? String(nextValue) : "";
                params.api.setEditCellValue({
                  id: params.id,
                  field: params.field,
                  value: normalized,
                });
              }}
            />
          );
        }

        if (header.type === "number") {
          return (
            <Input
              type="number"
              autoFocus={params.hasFocus}
              value={value}
              placeholder={header.placeholder ?? ""}
              className="p-4 border-none text-sm font-regular"
              hasClearIcon={false}
              onChange={(event) => {
                const rawValue = event.target.value;

                if (rawValue === "") {
                  params.api.setEditCellValue({
                    id: params.id,
                    field: params.field,
                    value: undefined,
                  });
                  return;
                }

                const parsed = Number(rawValue);
                if (Number.isNaN(parsed)) {
                  return;
                }

                params.api.setEditCellValue({
                  id: params.id,
                  field: params.field,
                  value: parsed,
                });
              }}
            />
          );
        }

        if (header.type !== "input") {
          return (
            <Input
              autoFocus={params.hasFocus}
              hasClearIcon={false}
              value={value}
              placeholder={header.placeholder ?? ""}
              className="p-4 text-sm font-regular"
              onChange={(event) => {
                const nextValue = event.target.value;
                params.api.setEditCellValue({
                  id: params.id,
                  field: params.field,
                  value: nextValue,
                });
              }}
            />
          );
        }

        return (
          <Input
            autoFocus={params.hasFocus}
            hasClearIcon={false}
            value={value}
            placeholder={header.placeholder ?? ""}
            className="p-4 text-sm font-regular border-none"
            onChange={(event) => {
              const nextValue = event.target.value;
              params.api.setEditCellValue({
                id: params.id,
                field: params.field,
                value: nextValue,
              });
            }}
          />
        );
      },
    };
  });
