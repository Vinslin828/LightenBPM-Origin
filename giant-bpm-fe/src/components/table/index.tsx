import { ReactNode, useMemo, useState, useCallback } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  RowSelectionState,
  Updater,
  useReactTable,
  Table as ReactTable,
} from "@tanstack/react-table";
import { cn } from "@/utils/cn";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import TablePagination from "./table-pagination";

// --- TYPE DEFINITIONS ---

interface ColumnMeta {
  headerClassName?: string;
  cellClassName?: string;
  headerContent: ReactNode;
}

export interface TableColumn<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
}

export interface TableMobileRowContext<T> {
  row: T;
  rowIndex: number;
  isSelected: boolean;
  selectable: boolean;
  toggleSelected?: (checked: boolean) => void;
  cells: Array<{
    id: string;
    header: ReactNode;
    content: ReactNode;
    columnKey: string;
  }>;
  selectionControl: ReactNode | null;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  selectable?: boolean;
  onRowClick?: (row: T) => void;
  selectedRowIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  keyExtractor?: (row: T, index: number) => string;
  className?: string;
  emptyState?: ReactNode;
  pagination?: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    onPageChange: (page: number) => void;
    pageSizeOptions?: number[];
    onPageSizeChange?: (pageSize: number) => void;
  };
  renderMobileRow?: (context: TableMobileRowContext<T>) => ReactNode | null;
}

// --- SUB-COMPONENTS ---

const TableLoading = () => (
  <div className="flex items-center justify-center p-10">
    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
  </div>
);

const DesktopTable = <T,>({
  table,
  selectable,
  onRowClick,
}: {
  table: ReactTable<T>;
  selectable: boolean;
  onRowClick?: (row: T) => void;
}) => (
  <div className="hidden md:block overflow-x-auto w-full min-h-full flex-1">
    <table className="w-full">
      <thead className="h-11">
        {table.getHeaderGroups().map((headerGroup, groupIndex) => (
          <tr key={headerGroup.id} className="bg-gray-50">
            {selectable && groupIndex === 0 && (
              <th
                className="w-[56px] p-5 align-middle"
                rowSpan={table.getHeaderGroups().length}
              >
                <Checkbox
                  checked={
                    table.getIsAllPageRowsSelected()
                      ? true
                      : table.getIsSomePageRowsSelected()
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(!!value)
                  }
                  disabled={table.getRowModel().rows.length === 0}
                  aria-label="Select all rows"
                />
              </th>
            )}
            {headerGroup.headers.map((header) => {
              const meta = header.column.columnDef.meta as
                | ColumnMeta
                | undefined;
              return (
                <th
                  key={header.id}
                  colSpan={header.colSpan}
                  className={cn(
                    "text-left h-11 px-5 font-medium text-base text-[#111928]",
                    meta?.headerClassName,
                  )}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              );
            })}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr
            key={row.id}
            className={cn(
              "border-t border-stroke hover:bg-gray last:border-b",
              onRowClick && "cursor-pointer",
              selectable && row.getIsSelected() && "bg-[#f0f6ff]",
            )}
            onClick={() => onRowClick?.(row.original)}
          >
            {selectable && (
              <td
                className="p-5 align-top"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Select row ${row.index + 1}`}
                />
              </td>
            )}
            {row.getVisibleCells().map((cell) => {
              const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
              return (
                <td
                  key={cell.id}
                  className={cn("px-5 align-center h-19", meta?.cellClassName)}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const MobileTable = <T,>({
  table,
  selectable,
  renderMobileRow,
  onRowClick,
}: {
  table: ReactTable<T>;
  selectable: boolean;
  renderMobileRow?: (context: TableMobileRowContext<T>) => ReactNode | null;
  onRowClick?: (row: T) => void;
}) => (
  <div className="md:hidden w-full">
    <div className="flex flex-col">
      {table.getRowModel().rows.map((row) => {
        const isSelected = row.getIsSelected();
        const cells = row.getVisibleCells().map((cell) => {
          const meta = cell.column.columnDef.meta as ColumnMeta | undefined;
          return {
            id: cell.id,
            header: meta?.headerContent ?? cell.column.id ?? "",
            content: flexRender(cell.column.columnDef.cell, cell.getContext()),
            columnKey: cell.column.id ?? cell.column.columnDef.id ?? "",
          };
        });

        const selectionControl = selectable ? (
          <Checkbox
            checked={isSelected}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label={`Select row ${row.index + 1}`}
          />
        ) : null;

        const context: TableMobileRowContext<T> = {
          row: row.original,
          rowIndex: row.index,
          isSelected,
          selectable,
          toggleSelected: selectable
            ? (checked: boolean) => row.toggleSelected(!!checked)
            : undefined,
          cells,
          selectionControl,
        };

        const customContent = renderMobileRow?.(context);
        if (customContent !== undefined && customContent !== null) {
          return customContent;
        }

        return (
          <div
            key={row.id}
            className={cn(
              "rounded-lg border border-[#dfe4ea] bg-white p-4 shadow-sm",
              selectable && isSelected && "border-[#1a75e0]",
            )}
            onClick={() => onRowClick?.(row.original)}
          >
            {selectionControl && (
              <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                {selectionControl}
              </div>
            )}
            <div className="flex flex-col gap-3">
              {cells.map((cell) => (
                <div key={cell.id} className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-[#111928]/70">
                    {cell.header}
                  </span>
                  <div>{cell.content}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// --- MAIN COMPONENT ---

export default function Table<T>({
  data,
  columns,
  loading,
  ...props
}: TableProps<T>) {
  const {
    selectable = false,
    onRowClick,
    selectedRowIds,
    onSelectionChange,
    keyExtractor,
    className,
    emptyState,
    pagination,
    renderMobileRow,
  } = props;
  const [internalSelection, setInternalSelection] = useState<string[]>([]);
  const isControlled = Array.isArray(selectedRowIds);
  const selection = isControlled ? (selectedRowIds ?? []) : internalSelection;

  const resolveKey = useCallback(
    (row: T, index: number) => {
      if (keyExtractor) {
        return String(keyExtractor(row, index));
      }
      return (row as { id?: string }).id ?? `${index}`;
    },
    [keyExtractor],
  );

  const columnDefs = useMemo<ColumnDef<T, unknown>[]>(() => {
    return columns.map<ColumnDef<T, unknown>>((column) => ({
      id: column.key,
      header: () => column.header,
      cell: ({ row }) => column.cell(row.original),
      meta: {
        headerClassName: column.headerClassName,
        cellClassName: column.cellClassName,
        headerContent: column.header,
      } as ColumnMeta,
    }));
  }, [columns]);

  const rowSelectionState = useMemo<RowSelectionState>(() => {
    if (!selectable) return {};
    return selection.reduce<RowSelectionState>((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
  }, [selectable, selection]);

  const handleRowSelectionChange = useCallback(
    (updater: Updater<RowSelectionState>) => {
      const nextState =
        typeof updater === "function" ? updater(rowSelectionState) : updater;
      const nextSelected = Object.keys(nextState).filter(
        (key) => nextState[key],
      );

      if (!isControlled) {
        setInternalSelection(nextSelected);
      }
      onSelectionChange?.(nextSelected);
    },
    [isControlled, onSelectionChange, rowSelectionState],
  );

  const table = useReactTable({
    data,
    columns: columnDefs,
    state: { rowSelection: rowSelectionState },
    enableRowSelection: selectable,
    onRowSelectionChange: handleRowSelectionChange,
    getCoreRowModel: getCoreRowModel(),
    getRowId: resolveKey,
  });

  const paginationDetails = useMemo(() => {
    if (!pagination) return null;
    const totalPages =
      pagination.pageSize > 0
        ? Math.max(1, Math.ceil(pagination.totalItems / pagination.pageSize))
        : 1;
    return {
      currentPage: pagination.currentPage,
      pageSize: pagination.pageSize,
      totalItems: pagination.totalItems,
      totalPages,
      onPageChange: pagination.onPageChange,
      onPageSizeChange: pagination.onPageSizeChange,
      pageSizeOptions: pagination.pageSizeOptions,
    };
  }, [pagination]);

  if (loading) {
    return (
      <div
        className={cn("bg-white rounded-lg border border-gray-200", className)}
      >
        <TableLoading />
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "bg-white rounded-lg border border-gray-200 overflow-clip min-h-68 flex items-center flex-col justify-center",
          className,
        )}
      >
        {data.length === 0 && emptyState}
        {data.length > 0 && (
          <>
            <DesktopTable
              table={table}
              selectable={selectable}
              onRowClick={onRowClick}
            />
            <MobileTable
              table={table}
              selectable={selectable}
              renderMobileRow={renderMobileRow}
              onRowClick={onRowClick}
            />
          </>
        )}
        {paginationDetails && (
          <TablePagination
            currentPage={paginationDetails.currentPage}
            pageSize={paginationDetails.pageSize}
            totalItems={paginationDetails.totalItems}
            totalPages={paginationDetails.totalPages}
            onPageChange={paginationDetails.onPageChange}
            onPageSizeChange={paginationDetails.onPageSizeChange}
            pageSizeOptions={paginationDetails.pageSizeOptions}
          />
        )}
      </div>
    </>
  );
}
