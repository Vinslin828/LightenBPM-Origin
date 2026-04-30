import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrashIcon, PlusIcon } from "@/components/icons";
import { useTranslation } from "react-i18next";
import type { ColumnType, DatasetField } from "@/types/master-data-dataset";
import {
  SingleSelect,
  type SelectOption,
} from "@/components/ui/select/single-select";

const COLUMN_TYPES: ColumnType[] = ["text", "boolean", "number", "date"];

const COLUMN_TYPE_OPTIONS: SelectOption<ColumnType>[] = COLUMN_TYPES.map(
  (type) => ({ label: type, value: type, key: type }),
);

const BOOLEAN_OPTIONS: SelectOption<string>[] = [
  { label: "NULL", value: "", key: "null" },
  { label: "true", value: "true", key: "true" },
  { label: "false", value: "false", key: "false" },
];

interface ColumnConfigPanelProps {
  onSave: (columns: DatasetField[]) => void;
  onClose: () => void;
  loading?: boolean;
  initialColumns?: DatasetField[];
  title?: string;
}

export const ColumnConfigPanel = ({
  onSave,
  onClose,
  loading,
  initialColumns,
  title,
}: ColumnConfigPanelProps) => {
  const { t } = useTranslation();
  const [columns, setColumns] = useState<DatasetField[]>(
    initialColumns && initialColumns.length > 0
      ? initialColumns
      : [{ name: "", type: "text", nullable: false, unique: false }],
  );
  const [confirmInput, setConfirmInput] = useState("");

  const updateColumn = (index: number, updates: Partial<DatasetField>) => {
    setColumns((prev) =>
      prev.map((col, i) => (i === index ? { ...col, ...updates } : col)),
    );
  };

  const addColumn = () => {
    setColumns((prev) => [
      ...prev,
      { name: "", type: "text", nullable: false, unique: false },
    ]);
  };

  const removeColumn = (index: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== index));
  };

  const namedColumns = columns.filter((c) => c.name.trim());
  const isValid = namedColumns.length > 0;
  const isSaveEnabled = isValid && confirmInput === "Confirm";

  const handleSave = () => {
    if (!isSaveEnabled) return;

    onSave(namedColumns);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 top-[44px] z-[110] bg-dark/40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-[44px] right-0 bottom-0 z-[120] flex w-[960px] flex-col border-l border-stroke bg-white">
        {/* Header */}
        <div className="flex min-h-[100px] items-center gap-5 border-b border-stroke px-5 py-4">
          <div className="flex flex-1 flex-col gap-1 min-w-0">
            <h2 className="text-base font-semibold text-dark">
              {title ?? t("master_data.new_table")}
            </h2>
            <p className="text-base text-dark leading-snug">
              {t("master_data.edit_column_desc_prefix")}
              <span className="font-semibold text-[#F23030]">
                {t("master_data.edit_column_desc_highlight")}
              </span>
              {t("master_data.edit_column_desc_suffix")}
              <span className="font-bold">
                {t("master_data.edit_column_desc_confirm_word")}
              </span>
              {t("master_data.edit_column_desc_end")}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-[10px]">
            <Input
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={t("master_data.confirm_placeholder")}
              className="w-[120px]"
            />
            <Button
              onClick={handleSave}
              disabled={!isSaveEnabled || loading}
              loading={loading}
            >
              {t("master_data.save")}
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Column sub-header */}
          <div className="flex h-[58px] items-center px-5">
            <h3 className="text-base font-semibold text-dark">
              {t("master_data.column")}
            </h3>
          </div>

          {/* Column config area */}
          <div className="flex flex-col gap-[11px] px-5">
            {/* Grid header */}
            <div className="grid grid-cols-[1fr_1fr_1fr_62px_55px_46px] items-center gap-[10px] text-base font-medium text-dark">
              <span>
                {t("master_data.name")}
                <span className="text-[#F23030]">*</span>
              </span>
              <span>
                {t("master_data.type")}
                <span className="text-[#F23030]">*</span>
              </span>
              <span>{t("master_data.default_value")}</span>
              <span>{t("master_data.nullable")}</span>
              <span>{t("master_data.unique")}</span>
              <span />
            </div>

            {/* Column rows */}
            {columns.map((col, index) => (
              <div
                key={index}
                className="grid grid-cols-[1fr_1fr_1fr_62px_55px_46px] items-center gap-[10px]"
              >
                <Input
                  value={col.name}
                  onChange={(e) =>
                    updateColumn(index, { name: e.target.value })
                  }
                  placeholder={t("master_data.name")}
                />
                <SingleSelect
                  value={col.type}
                  options={COLUMN_TYPE_OPTIONS}
                  onChange={(val) =>
                    updateColumn(index, {
                      type: val as ColumnType,
                      default_value: undefined,
                    })
                  }
                />
                {col.type === "boolean" ? (
                  <SingleSelect
                    value={
                      col.default_value === true
                        ? "true"
                        : col.default_value === false
                          ? "false"
                          : ""
                    }
                    options={BOOLEAN_OPTIONS}
                    onChange={(val) =>
                      updateColumn(index, {
                        default_value: val === "" ? undefined : val === "true",
                      })
                    }
                  />
                ) : col.type === "number" ? (
                  <Input
                    type="number"
                    value={String(col.default_value ?? "")}
                    onChange={(e) =>
                      updateColumn(index, {
                        default_value: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    placeholder="NULL"
                  />
                ) : col.type === "date" ? (
                  <Input
                    type="date"
                    value={String(col.default_value ?? "")}
                    onChange={(e) =>
                      updateColumn(index, {
                        default_value: e.target.value || undefined,
                      })
                    }
                    placeholder="NULL"
                    className="justify-start"
                  />
                ) : (
                  <Input
                    value={String(col.default_value ?? "")}
                    onChange={(e) =>
                      updateColumn(index, {
                        default_value: e.target.value || undefined,
                      })
                    }
                    placeholder="NULL"
                  />
                )}
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={col.nullable ?? false}
                    onChange={(e) =>
                      updateColumn(index, { nullable: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-stroke cursor-pointer"
                  />
                </div>
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={col.unique ?? false}
                    onChange={(e) =>
                      updateColumn(index, { unique: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-stroke cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeColumn(index)}
                  className="flex items-center justify-center cursor-pointer text-secondary-text hover:text-red-500"
                >
                  <TrashIcon className="h-6 w-6" />
                </button>
              </div>
            ))}
          </div>

          {/* Add column link */}
          <div className="border-b border-stroke p-5">
            <button
              type="button"
              onClick={addColumn}
              className="inline-flex items-center gap-[5px] text-base font-medium cursor-pointer text-lighten-blue hover:underline"
            >
              <PlusIcon className="h-6 w-6" />
              {t("master_data.add_column")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
