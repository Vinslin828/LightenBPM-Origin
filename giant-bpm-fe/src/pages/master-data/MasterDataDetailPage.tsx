import { useState, useMemo, useCallback } from "react";
import { DatePicker } from "@/components/ui/datetime-selector";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { BackIcon, PlusIcon, ExportIcon, ImportIcon } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import {
  useDataset,
  useDatasetRecords,
  useCreateDatasetRecords,
  useUpdateDatasetRecords,
  useDeleteDatasetRecords,
  useRenameDataset,
  useUpdateExternalApiConfig,
  useUpdateDatasetSchema,
  useExportDatasetCsv,
} from "@/hooks/useDataset";
import type { DatasetField, DatasetRecord } from "@/types/master-data-dataset";
import { cn } from "@/utils/cn";
import { MoreHorizontal, Pencil, Check, X } from "lucide-react";
import { ColumnConfigPanel } from "@/components/master-data/ColumnConfigPanel";
import UpdateApiConfigModal from "@/components/master-data/UpdateApiConfigModal";
import type { ExternalApiConfigValue } from "@/components/master-data/ExternalApiConfig";
import ImportCsvModal from "@/components/master-data/ImportCsvModal";
import { useModal } from "@/hooks/useModal";

// Type badge color mapping
const typeBadgeClass: Record<string, string> = {
  uuid: "bg-purple-100 text-purple-700",
  text: "bg-blue-100 text-blue-700",
  boolean: "bg-green-100 text-green-700",
  number: "bg-orange-100 text-orange-700",
  date: "bg-pink-100 text-pink-700",
};

// Generate a stable row key from record + primary key
const getRowKey = (
  record: DatasetRecord,
  primaryKey: string,
  fallbackIndex: number,
) => {
  const pkVal = record[primaryKey];
  return pkVal != null ? String(pkVal) : `__new_${fallbackIndex}`;
};

export const MasterDataDetailPage = () => {
  const { code } = useParams<{ code: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const { dataset, isLoading: isLoadingDef } = useDataset(code);
  const { records: rawRecords, isLoading: isLoadingRecords } =
    useDatasetRecords(code, { limit: 50000 }); // large limit to fetch all for client-side sorting/editing
  // Reverse so oldest records appear first (newest at the bottom)
  const serverRecords = useMemo(() => [...rawRecords].reverse(), [rawRecords]);

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState("");
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [showUpdateApiConfig, setShowUpdateApiConfig] = useState(false);
  const {
    open: openImportCsv,
    isOpen: isImportCsvOpen,
    close: closeImportCsv,
  } = useModal();

  // Local state for edits
  const [newRows, setNewRows] = useState<DatasetRecord[]>([]);
  const [modifiedRows, setModifiedRows] = useState<Map<number, DatasetRecord>>(
    new Map(),
  );
  // Selection by original index in displayRecords (same index-based pattern as modifiedRows)
  const [selectedKeys, setSelectedKeys] = useState<Set<number>>(new Set());
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const fields = dataset?.fields ?? [];
  const primaryKey = dataset?.primaryKey ?? "";
  const isExternalApiDataset = dataset?.source_type === "EXTERNAL_API";
  const fieldNames = useMemo(() => fields.map((f) => f.name), [fields]);

  const renameDataset = useRenameDataset(code ?? "");
  const updateExternalApiConfig = useUpdateExternalApiConfig(code ?? "");
  const updateSchema = useUpdateDatasetSchema(code ?? "");
  const createRecords = useCreateDatasetRecords(code ?? "");
  const updateRecords = useUpdateDatasetRecords(code ?? "", fieldNames);
  const deleteRecords = useDeleteDatasetRecords(code ?? "", fieldNames);
  const exportCsv = useExportDatasetCsv();

  // Merge server records with local modifications
  const displayRecords = useMemo(() => {
    const merged = serverRecords.map((record, index) => {
      const modified = modifiedRows.get(index);
      return modified ? { ...record, ...modified } : record;
    });
    return [...merged, ...newRows];
  }, [serverRecords, modifiedRows, newRows]);

  // Sort records client-side
  const sortedRecords = useMemo(() => {
    if (!sortField) return displayRecords;
    const fieldType = fields.find((f) => f.name === sortField)?.type;
    const dir = sortDirection === "asc" ? 1 : -1;

    return [...displayRecords].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      // Treat null/undefined/"" as nullish; always sort to the bottom
      const aNullish = aVal == null || aVal === "";
      const bNullish = bVal == null || bVal === "";
      if (aNullish && bNullish) return 0;
      if (aNullish) return 1;
      if (bNullish) return -1;

      if (fieldType === "boolean") {
        const aBool = aVal === true || aVal === "true";
        const bBool = bVal === true || bVal === "true";
        if (aBool === bBool) return 0;
        return (aBool ? 1 : -1) * dir;
      }

      if (fieldType === "date") {
        const aTime = new Date(String(aVal)).getTime();
        const bTime = new Date(String(bVal)).getTime();
        const aInvalid = Number.isNaN(aTime);
        const bInvalid = Number.isNaN(bTime);
        if (aInvalid && bInvalid) return 0;
        if (aInvalid) return 1;
        if (bInvalid) return -1;
        return (aTime - bTime) * dir;
      }

      if (fieldType === "number") {
        const numA = Number(aVal);
        const numB = Number(bVal);
        const aInvalid = Number.isNaN(numA);
        const bInvalid = Number.isNaN(numB);
        if (aInvalid && bInvalid) return 0;
        if (aInvalid) return 1;
        if (bInvalid) return -1;
        return (numA - numB) * dir;
      }

      // text (default): locale-aware string compare
      return String(aVal).localeCompare(String(bVal)) * dir;
    });
  }, [displayRecords, sortField, sortDirection, fields]);

  const hasChanges = newRows.length > 0 || modifiedRows.size > 0;

  // Find the original index of a record in the unsorted displayRecords array
  const findOriginalIndex = useCallback(
    (record: DatasetRecord): number => {
      return displayRecords.indexOf(record);
    },
    [displayRecords],
  );

  const handleCellChange = useCallback(
    (record: DatasetRecord, fieldName: string, value: unknown) => {
      const originalIndex = findOriginalIndex(record);
      if (originalIndex === -1) return;

      const serverLen = serverRecords.length;
      if (originalIndex < serverLen) {
        setModifiedRows((prev) => {
          const next = new Map(prev);
          const existing = next.get(originalIndex) ?? {};
          next.set(originalIndex, { ...existing, [fieldName]: value });
          return next;
        });
      } else {
        const newRowIndex = originalIndex - serverLen;
        setNewRows((prev) =>
          prev.map((row, i) =>
            i === newRowIndex ? { ...row, [fieldName]: value } : row,
          ),
        );
      }
    },
    [findOriginalIndex, serverRecords.length],
  );

  const handleAddRow = () => {
    const emptyRow: DatasetRecord = {};

    fields.forEach((f) => {
      if (f.type === "boolean") {
        emptyRow[f.name] = false;
      } else {
        emptyRow[f.name] = f.default_value ?? "";
      }
    });
    setNewRows((prev) => [...prev, emptyRow]);
  };

  const handleSave = async () => {
    try {
      if (newRows.length > 0) {
        await createRecords.mutateAsync(newRows);
      }
      if (modifiedRows.size > 0) {
        const updates = Array.from(modifiedRows.entries()).map(
          ([index, changes]) => ({
            original: serverRecords[index],
            changes,
          }),
        );
        await updateRecords.mutateAsync(updates);
      }
      setNewRows([]);
      setModifiedRows(new Map());
      toast({ variant: "success", title: t("master_data.save") });
    } catch {
      // Error handled by global mutation error handler
    }
  };

  const handleDeleteSelected = async () => {
    const serverLen = serverRecords.length;
    const serverRecordsToDelete: DatasetRecord[] = [];
    const newRowIndicesToRemove: Set<number> = new Set();

    // Use index to distinguish server records from new rows (same pattern as updateRecords)
    selectedKeys.forEach((originalIndex) => {
      if (originalIndex < serverLen) {
        serverRecordsToDelete.push(serverRecords[originalIndex]);
      } else {
        newRowIndicesToRemove.add(originalIndex - serverLen);
      }
    });

    // Remove new rows by index
    if (newRowIndicesToRemove.size > 0) {
      setNewRows((prev) =>
        prev.filter((_, i) => !newRowIndicesToRemove.has(i)),
      );
    }

    // Delete server records (same pattern as updateRecords)
    if (serverRecordsToDelete.length > 0) {
      try {
        await deleteRecords.mutateAsync(serverRecordsToDelete);
      } catch {
        // Error handled by global mutation error handler
      }
    }

    setSelectedKeys(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedKeys.size === sortedRecords.length) {
      setSelectedKeys(new Set());
    } else {
      const allIndices = new Set<number>();
      displayRecords.forEach((_, i) => {
        allIndices.add(i);
      });
      setSelectedKeys(allIndices);
    }
  };

  const toggleSelectRow = (index: number) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleSort = (fieldName: string, direction: "asc" | "desc") => {
    setSortField(fieldName);
    setSortDirection(direction);
  };

  const handleExport = async () => {
    try {
      const blob = await exportCsv.mutateAsync(code ?? "");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${dataset?.name ?? code}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ variant: "success", title: t("master_data.export_success") });
    } catch {
      toast({ variant: "destructive", title: t("master_data.export_failed") });
    }
  };

  const isSaving =
    createRecords.isPending ||
    updateRecords.isPending ||
    deleteRecords.isPending;

  const initialExternalApiConfig = useMemo<ExternalApiConfigValue | undefined>(
    () =>
      isExternalApiDataset
        ? {
            api_config: dataset?.api_config ?? {
              url: "",
              method: "GET",
            },
            field_mappings: {
              records_path: dataset?.field_mappings?.records_path ?? "",
              mappings: (dataset?.field_mappings?.mappings ?? []).map(
                (mapping, index) => ({
                  id: `mapping-${index}`,
                  field_name: mapping.field_name,
                  json_path: mapping.json_path,
                }),
              ),
            },
          }
        : undefined,
    [dataset, isExternalApiDataset],
  );

  if (isLoadingDef) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="text-secondary-text">{t("loading")}</span>
      </div>
    );
  }

  if (!dataset) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4">
        <p className="text-secondary-text">{t("master_data.no_data")}</p>
        <Button variant="tertiary" onClick={() => navigate("/master-data")}>
          {t("master_data.title")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-[60px] items-center border-b border-stroke bg-white px-5">
        <button
          onClick={() => navigate("/master-data")}
          className="flex h-11 w-11 items-center justify-center rounded-[6px] border border-stroke hover:bg-gray-50"
        >
          <BackIcon className="h-7 w-7" />
        </button>
        <div className="ml-3 flex items-center gap-2">
          {isEditingName ? (
            <>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-9 w-60 text-base font-semibold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    renameDataset.mutate(editName, {
                      onSuccess: () => setIsEditingName(false),
                    });
                  }
                  if (e.key === "Escape") setIsEditingName(false);
                }}
              />
              <button
                onClick={() => {
                  renameDataset.mutate(editName, {
                    onSuccess: () => setIsEditingName(false),
                  });
                }}
                className="rounded p-1 text-green-600 hover:bg-green-50"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsEditingName(false)}
                className="rounded p-1 text-secondary-text hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </>
          ) : (
            <>
              <span className="text-base font-semibold text-dark">
                {dataset.name}
              </span>
              <button
                onClick={() => {
                  setEditName(dataset.name);
                  setIsEditingName(true);
                }}
                className="text-secondary-text hover:text-primary-text cursor-pointer"
              >
                <Pencil className="h-5 w-5" />
              </button>
              {isExternalApiDataset && (
                <div className="px-3 py-[3px] bg-gray-100 rounded-sm text-slate-400 text-sm font-medium">
                  External
                </div>
              )}
            </>
          )}
        </div>
        <div className="flex-1" />
        <div className="flex flex-row gap-2">
          {selectedKeys.size > 0 && (
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={isExternalApiDataset}
            >
              {t("master_data.delete")} ({selectedKeys.size})
            </Button>
          )}
          <Button
            variant="secondary"
            icon={<ImportIcon className="h-5 w-5" />}
            className="bg-white cursor-pointer"
            onClick={openImportCsv}
            disabled={isExternalApiDataset}
          >
            {t("master_data.import_csv")}
          </Button>
          <Button
            variant="secondary"
            icon={<ExportIcon className="h-5 w-5" />}
            className="bg-white cursor-pointer"
            onClick={handleExport}
          >
            {t("master_data.export_csv")}
          </Button>
          {isExternalApiDataset && (
            <Button
              variant="secondary"
              onClick={() => setShowUpdateApiConfig(true)}
            >
              {t("master_data.api_config")}
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving || isExternalApiDataset}
            loading={isSaving}
          >
            {t("master_data.save")}
          </Button>
        </div>
      </div>

      {/* Dotted background area with table card */}
      <div className="flex-1 overflow-auto bg-[size:25px_25px] bg-[radial-gradient(circle_at_2px_2px,#dfe0e4_2px,#E5E7EB_2px)] p-6">
        <div className="overflow-x-auto rounded-lg border border-stroke bg-white">
          <div className="min-w-max">
            <table className="w-full min-w-max border-collapse">
              <thead>
                <tr className="border-b border-stroke">
                  {/* Checkbox column */}
                  <th className="w-12 px-3 py-3">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={
                          sortedRecords.length > 0 &&
                          selectedKeys.size === sortedRecords.length
                        }
                        onChange={toggleSelectAll}
                        disabled={isExternalApiDataset}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </div>
                  </th>
                  {/* Data columns */}
                  {fields.map((field) => (
                    <th
                      key={field.name}
                      className="border-l border-stroke px-4 py-3 text-left text-sm font-medium text-primary-text min-w-[250px]"
                    >
                      <div className="flex items-center gap-2">
                        <span>{field.name}</span>
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-xs font-normal",
                            typeBadgeClass[field.type] ??
                              "bg-gray-100 text-gray-600",
                          )}
                        >
                          {field.type}
                        </span>
                        <ColumnMenu field={field} onSort={handleSort} t={t} />
                      </div>
                    </th>
                  ))}
                  {/* Add column button */}
                  <th className="w-12 border-l border-stroke px-3 py-3">
                    {!isExternalApiDataset && (
                      <button
                        onClick={() => setShowAddColumn(true)}
                        className="rounded p-0.5 text-giant-blue hover:bg-gray-100"
                      >
                        <PlusIcon className="h-5 w-5" />
                      </button>
                    )}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoadingRecords && (
                  <tr>
                    <td
                      colSpan={fields.length + 2}
                      className="px-6 py-8 text-center text-secondary-text"
                    >
                      {t("loading")}
                    </td>
                  </tr>
                )}
                {!isLoadingRecords && sortedRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan={fields.length + 2}
                      className="px-6 py-8 text-center text-secondary-text"
                    >
                      {t("master_data.no_data")}
                    </td>
                  </tr>
                )}
                {sortedRecords.map((record, visualIndex) => {
                  // Find the original unsorted index for stable selection
                  const originalIndex = displayRecords.indexOf(record);
                  const stableIndex =
                    originalIndex >= 0 ? originalIndex : visualIndex;
                  return (
                    <tr
                      key={stableIndex}
                      className="border-t border-dashed border-gray-200 hover:bg-gray-50"
                    >
                      <td className="w-12 px-3 py-2">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={selectedKeys.has(stableIndex)}
                            onChange={() => toggleSelectRow(stableIndex)}
                            disabled={isExternalApiDataset}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </div>
                      </td>
                      {fields.map((field) => (
                        <td
                          key={field.name}
                          className="border-l border-dashed border-gray-200 px-4 py-2 min-w-[250px]"
                        >
                          <CellRenderer
                            field={field}
                            value={record[field.name]}
                            onChange={(val) =>
                              handleCellChange(record, field.name, val)
                            }
                            readOnly={isExternalApiDataset}
                          />
                        </td>
                      ))}
                      <td className="w-12" />
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Add new row inside the card */}
            {!isExternalApiDataset && (
              <div className="border-t border-dashed border-gray-200 px-6 py-3">
                <button
                  onClick={handleAddRow}
                  className="inline-flex items-center gap-1 text-sm font-medium text-giant-blue hover:underline"
                >
                  <PlusIcon className="h-4 w-4" />
                  {t("master_data.add_new_row")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddColumn && !isExternalApiDataset && (
        <ColumnConfigPanel
          initialColumns={fields}
          title={dataset.name}
          onSave={(updatedColumns) => {
            updateSchema.mutate(updatedColumns, {
              onSuccess: () => {
                setShowAddColumn(false);
                setSearchParams({});
                toast({ variant: "success", title: t("master_data.save") });
              },
              onError: (error: unknown) => {
                const axiosError = error as {
                  response?: {
                    data?: { errors?: { message: string }[]; message?: string };
                  };
                  message?: string;
                };
                const errors = axiosError.response?.data?.errors;
                const description = errors?.map((e) => e.message).join("\n");
                const title =
                  axiosError.response?.data?.message ?? axiosError.message;
                toast({ variant: "destructive", title, description });
              },
            });
          }}
          loading={updateSchema.isPending}
          onClose={() => {
            setShowAddColumn(false);
            setSearchParams({});
          }}
        />
      )}

      {isExternalApiDataset && (
        <UpdateApiConfigModal
          isOpen={showUpdateApiConfig}
          datasetName={dataset.name}
          initialValue={initialExternalApiConfig}
          onClose={() => setShowUpdateApiConfig(false)}
          onUpdate={async (value) => {
            await updateExternalApiConfig.mutateAsync({
              api_config: value.api_config,
              field_mappings: {
                records_path: value.field_mappings.records_path,
                mappings: value.field_mappings.mappings.map(
                  ({ field_name, json_path }) => ({
                    field_name,
                    json_path,
                  }),
                ),
              },
            });
            toast({ variant: "success", title: t("master_data.save") });
            setShowUpdateApiConfig(false);
          }}
        />
      )}

      <ImportCsvModal
        isOpen={isImportCsvOpen}
        close={closeImportCsv}
        datasetCode={code ?? ""}
      />
    </div>
  );
};

// Column three-dot menu
function ColumnMenu({
  field,
  onSort,
  t,
}: {
  field: DatasetField;
  onSort: (fieldName: string, direction: "asc" | "desc") => void;
  t: (key: string) => string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="ml-auto rounded p-0.5 text-secondary-text hover:bg-gray-200">
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={() => onSort(field.name, "asc")}>
          {t("master_data.sort_ascending")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onSort(field.name, "desc")}>
          {t("master_data.sort_descending")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Cell renderer by type
function CellRenderer({
  field,
  value,
  onChange,
  readOnly,
}: {
  field: DatasetField;
  value: unknown;
  onChange: (val: unknown) => void;
  readOnly?: boolean;
}) {
  if (field.type === "boolean") {
    const boolVal = value === true || value === "true";
    return (
      <div className="flex items-center gap-2">
        <Toggle
          pressed={boolVal}
          onPressedChange={(pressed) => {
            if (readOnly) return;
            onChange(pressed);
          }}
          readonly={readOnly}
          size="sm"
        />
        <span className="text-sm text-secondary-text">
          {boolVal ? "True" : "False"}
        </span>
      </div>
    );
  }

  if (field.type === "number") {
    return (
      <Input
        type="number"
        value={value != null && value !== "" ? String(value) : ""}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? null : Number(raw));
        }}
        readOnly={readOnly}
        className="h-8 bg-transparent outline-0 border-0 focus:border-0 focus:border-transparent p-0"
      />
    );
  }

  if (field.type === "date") {
    const dateMs = value ? new Date(String(value)).getTime() : undefined;
    const validDateMs =
      dateMs !== undefined && !Number.isNaN(dateMs) ? dateMs : undefined;

    return (
      <DatePicker
        name={`cell-date-${field.name}`}
        value={validDateMs}
        onChange={(val) => {
          if (val === undefined) {
            onChange("");
            return;
          }
          onChange(new Date(val).toISOString());
        }}
        disabled={readOnly}
        placeholder="YYYY-MM-DD"
        className="h-8 bg-transparent outline-0 border-0 focus:border-0 focus:border-transparent p-0"
      />
    );
  }

  // text (default)
  return (
    <Input
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      readOnly={readOnly}
      className="h-8 bg-transparent outline-0 border-0 focus:border-0 focus:border-transparent p-0"
    />
  );
}
