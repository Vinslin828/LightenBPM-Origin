import * as React from "react";
import {
  DataGrid as MUIDataGrid,
  GridColDef,
  GridColumnResizeParams,
  GridRowModel,
  GridRowModes,
  GridRowModesModel,
  GridRowsProp,
} from "@mui/x-data-grid";

import { AddButtonIcon, TrashIcon } from "@/components/icons";
import {
  buildEmptyRow,
  canAddRow,
  getHeaderField,
  getRequiredError,
  parseRowsFromValue,
} from "./grid-data-grid.helpers";
import { createGridColumns } from "./grid-data-grid.columns";
import { GridHeaderItem } from "./grid-data-grid.types";
import { gridSx } from "./grid-data-grid.sx";

export type { GridHeaderItem } from "./grid-data-grid.types";

type Props = {
  value: unknown;
  onChange?: (nextValue: string) => void;
  headers: GridHeaderItem[];
  maxRows?: number;
  readonly?: boolean;
  evaluateExpression?: (code: string, row: Record<string, unknown>) => unknown;
  resolvedDynamicOptions?: Record<string, import("@ui/select/single-select").SelectOption<string>[]>;
};

export function DataGrid({
  value,
  onChange,
  headers,
  maxRows,
  readonly = false,
  evaluateExpression,
  resolvedDynamicOptions,
}: Props) {
  const headerSignature = React.useMemo(
    () =>
      headers
        .map(
          (h) =>
            `${h.key}:${h.keyValue}:${h.type}:${h.label}:${h.expression ?? ""}`,
        )
        .join("|"),
    [headers],
  );
  const stableHeaders = React.useMemo(() => headers, [headerSignature]);
  const deletingRowIdsRef = React.useRef<Set<string>>(new Set());
  const [rows, setRows] = React.useState<GridRowsProp>(() =>
    parseRowsFromValue(value),
  );
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>(
    {},
  );
  const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>(
    {},
  );

  const isReadOnly = readonly || typeof onChange !== "function";
  const canAdd = !isReadOnly && canAddRow(rows.length, maxRows);

  const sanitizeRowModesModel = React.useCallback(
    (model: GridRowModesModel, sourceRows: GridRowsProp): GridRowModesModel => {
      const existingIds = new Set(sourceRows.map((row) => String(row.id)));
      const next = Object.entries(model).reduce<GridRowModesModel>(
        (acc, [id, value]) => {
          if (existingIds.has(id)) {
            acc[id] = value;
          }
          return acc;
        },
        {},
      );

      return next;
    },
    [],
  );

  const emitRows = React.useCallback(
    (nextRows: GridRowsProp) => {
      setRows(nextRows);

      if (typeof onChange === "function") {
        onChange(JSON.stringify(nextRows));
      }
    },
    [onChange],
  );

  const columns = React.useMemo(() => {
    const baseColumns = createGridColumns(stableHeaders, isReadOnly, evaluateExpression, resolvedDynamicOptions).map(
      (column) => {
        const resizedWidth = columnWidths[column.field];
        if (!resizedWidth) return column;
        return { ...column, width: resizedWidth };
      },
    );

    if (isReadOnly) {
      return baseColumns;
    }

    const actionsColumn: GridColDef = {
      field: "__actions__",
      headerName: "Action",
      flex: 1,
      minWidth: 120,
      sortable: false,
      filterable: false,
      hideable: false,
      disableColumnMenu: true,
      editable: false,
      resizable: false,
      align: "center",
      headerAlign: "center",
      renderCell: (params) => (
        <button
          type="button"
          onClick={() => {
            const rowId = String(params.id);
            deletingRowIdsRef.current.add(rowId);

            try {
              params.api.stopRowEditMode({
                id: params.id,
                ignoreModifications: true,
              });
            } catch {
              // no-op: row might not be in edit mode
            }

            setRowModesModel((prev) => {
              if (!(params.id in prev)) {
                return prev;
              }
              const next = { ...prev };
              delete next[params.id];
              return next;
            });

            setTimeout(() => {
              setRows((prevRows) => {
                const nextRows = prevRows.filter(
                  (row) => String(row.id) !== rowId,
                );
                if (typeof onChange === "function") {
                  onChange(JSON.stringify(nextRows));
                }
                return nextRows;
              });
              deletingRowIdsRef.current.delete(rowId);
            }, 0);
          }}
          className="inline-flex items-center justify-center text-secondary-text hover:text-red"
          aria-label="Delete row"
          title="Delete row"
        >
          <TrashIcon className="h-4 w-4 text-red" />
        </button>
      ),
    };

    return [...baseColumns, actionsColumn];
  }, [columnWidths, emitRows, evaluateExpression, isReadOnly, onChange, resolvedDynamicOptions, stableHeaders]);

  const handleColumnWidthChange = React.useCallback(
    (params: GridColumnResizeParams) => {
      const field = String(params.colDef.field);
      setColumnWidths((prev) => {
        if (prev[field] === params.width) return prev;
        return { ...prev, [field]: params.width };
      });
    },
    [],
  );

  React.useEffect(() => {
    const nextRows = parseRowsFromValue(value);
    setRows(nextRows);
  }, [value]);

  React.useEffect(() => {
    if (!rows.length || !stableHeaders.length) return;

    const nextRows = rows.map((row) => {
      const nextRow = { ...row } as Record<string, unknown>;
      let changed = false;

      stableHeaders.forEach((header) => {
        // Expression columns are computed at render time, not stored in row data
        if (header.type === "expression") return;

        const primaryField = getHeaderField(header);
        const legacyField = header.key?.trim();

        if (!(primaryField in nextRow)) {
          if (
            legacyField &&
            legacyField !== primaryField &&
            legacyField in nextRow
          ) {
            nextRow[primaryField] = nextRow[legacyField];
          } else {
            nextRow[primaryField] =
              header.type === "number" || header.type === "date"
                ? undefined
                : "";
          }
          changed = true;
        }

        if (
          legacyField &&
          legacyField !== primaryField &&
          legacyField in nextRow
        ) {
          delete nextRow[legacyField];
          changed = true;
        }

        if (
          header.keyValue &&
          header.keyValue !== primaryField &&
          header.keyValue in nextRow
        ) {
          delete nextRow[header.keyValue];
          changed = true;
        }
      });

      return changed ? (nextRow as GridRowModel) : row;
    });

    if (nextRows.every((row, index) => row === rows[index])) return;

    emitRows(nextRows);
  }, [emitRows, rows, stableHeaders]);

  const processRowUpdate = (newRow: GridRowModel) => {
    if (deletingRowIdsRef.current.has(String(newRow.id))) {
      return newRow;
    }

    const updatedRow = { ...newRow, isNew: false };
    const updatedRowRecord = updatedRow as Record<string, unknown>;
    let firstErrorField: string | undefined;
    let firstErrorMessage: string | undefined;

    stableHeaders.forEach((header) => {
      const fieldKey = getHeaderField(header);
      const error = getRequiredError(header, updatedRowRecord[fieldKey]);
      if (error && !firstErrorField) {
        firstErrorField = fieldKey;
        firstErrorMessage = error;
      }
    });

    if (firstErrorField) {
      setRowModesModel((oldModel) => ({
        ...oldModel,
        [newRow.id]: { mode: GridRowModes.Edit, fieldToFocus: firstErrorField },
      }));
      throw new Error(firstErrorMessage ?? "Row has validation errors");
    }

    const newRows = rows.map((row) =>
      row.id === newRow.id ? updatedRow : row,
    );
    emitRows(newRows);
    return updatedRow;
  };

  const handleRowModesModelChange = (newRowModesModel: GridRowModesModel) => {
    setRowModesModel(sanitizeRowModesModel(newRowModesModel, rows));
  };

  const handleAddRow = () => {
    if (isReadOnly || !canAdd) return;

    const newRow = buildEmptyRow(stableHeaders);
    const newRows = [...rows, newRow];
    const firstField = stableHeaders[0]
      ? getHeaderField(stableHeaders[0])
      : undefined;

    emitRows(newRows);
    setRowModesModel((oldModel) => ({
      ...oldModel,
      [newRow.id]: firstField
        ? { mode: GridRowModes.Edit, fieldToFocus: firstField }
        : { mode: GridRowModes.Edit },
    }));
  };

  return (
    <div className="h-fit">
      <MUIDataGrid
        rows={rows}
        columns={columns.length ? columns : []}
        editMode="row"
        sx={gridSx}
        rowModesModel={rowModesModel}
        onRowModesModelChange={handleRowModesModelChange}
        processRowUpdate={processRowUpdate}
        onColumnWidthChange={handleColumnWidthChange}
        // onProcessRowUpdateError={(error) => {
        //   setGridError(error instanceof Error ? error.message : String(error));
        // }}
        hideFooter
        disableColumnSelector
        disableColumnResize={false}
        rowSpacingType="border"
        rowSelection={false}
      />
      {/* {!!gridError && <ValidationError>{gridError}</ValidationError>} */}
      {!isReadOnly && (
        <button
          type="button"
          onClick={handleAddRow}
          disabled={!canAdd}
          className="flex flex-row items-center gap-2 font-medium text-lighten-blue disabled:text-secondary-text disabled:cursor-not-allowed pt-2.5"
        >
          <AddButtonIcon />
          add a row
        </button>
      )}
    </div>
  );
}
