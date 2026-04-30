import Accordion from "@ui/accordion";
import CodeEditButton from "@ui/button/code-edit-button";
import CodeToggle from "@ui/code-toggle";
import { Label } from "@ui/label";
import { RadioGroup, type RadioOption } from "@ui/radio-group";
import { MultiSelect, Select, type SelectOption } from "@ui/select";
import { useEffect, useMemo, useState } from "react";
import { useAtom } from "jotai";

import { useCodeBuilder } from "@/hooks/useCode/useCodeBuilder";
import { useBpmDatasets, useBpmDatasetRecords } from "@/hooks/useMasterData";
import { builderStoreAtom } from "@/store";
import type { Operator } from "@/types/flow";
import { cn } from "@/utils/cn";
import { ValidationError } from "@ui/validation-error";

export type DynamicFilterUi = {
  isReference: false;
  columnKey?: string;
  logic?: Operator;
  formField?: string;
};

export type DynamicFilterExpression = {
  isReference: true;
  expression?: string;
};

export type DynamicDefaultValue = {
  isReference: boolean;
  reference?: string;
  value?: string | string[];
};

export type DynamicValue = {
  type: "dynamic";
  table?: {
    tableKey: string | null;
    labelKey: string | null;
    valueKey: string | null;
  };
  sorter?: {
    columnKey?: string;
    order?: "asc" | "desc";
  };
  filter?: DynamicFilterUi | DynamicFilterExpression;
  defaultValue?: DynamicDefaultValue;
};

type Props = {
  value: DynamicValue;
  multipleSelection: boolean;
  onChange: (value: DynamicValue) => void;
};

type FilterSectionProps = {
  filter?: DynamicValue["filter"];
  columnOptions: SelectOption<string>[];
  formFieldOptions: SelectOption<string>[];
  onChangeFilter: (next: DynamicValue["filter"]) => void;
};

const sortingOrderOptions: RadioOption[] = [
  { value: "asc", label: "Ascending (A-Z)" },
  { value: "desc", label: "Descending (Z-A)" },
];

const operatorOptions: SelectOption<Operator>[] = [
  { label: ">", value: ">", key: ">" },
  { label: "<", value: "<", key: "<" },
  { label: ">=", value: ">=", key: ">=" },
  { label: "<=", value: "<=", key: "<=" },
  { label: "==", value: "==", key: "==" },
  { label: "!=", value: "!=", key: "!=" },
  { label: "Contains", value: "contains", key: "contains" },
  { label: "Not Contains", value: "not_contains", key: "not_contains" },
  { label: "Equals", value: "equals", key: "equals" },
  { label: "Not Equals", value: "not_equals", key: "not_equals" },
];

export default function DynamicSetting({
  value,
  multipleSelection,
  onChange,
}: Props) {
  const [openKey, setOpenKey] = useState<string[]>(["dynamic-option"]);
  const { datasets: allTable, isLoading: isLoadingTables } = useBpmDatasets();
  const [bStore] = useAtom(builderStoreAtom);
  const { validateReference } = useCodeBuilder();
  const [expressionError, setExpressionError] = useState<string | undefined>(
    undefined,
  );

  const selectFields = useMemo(() => {
    const { labelKey, valueKey } = value.table ?? {};
    if (!labelKey || !valueKey) return undefined;
    return labelKey === valueKey ? [valueKey] : [labelKey, valueKey];
  }, [value.table]);

  const { records, isLoading: isLoadingRecords } = useBpmDatasetRecords(
    selectFields ? (value.table?.tableKey ?? undefined) : undefined,
    selectFields ? { limit: 1000, select: selectFields } : undefined,
  );

  const defaultValueOptions: SelectOption<string>[] = useMemo(() => {
    const { labelKey, valueKey } = value.table ?? {};
    if (!labelKey || !valueKey || !records.length) return [];
    return records.map((record: Record<string, unknown>) => ({
      label: String(record[labelKey] ?? record[valueKey] ?? ""),
      value: String(record[valueKey] ?? ""),
      key: String(record[valueKey] ?? ""),
    }));
  }, [records, value.table]);

  useEffect(() => {
    if (value.defaultValue?.isReference) return;
    const currentDefault = value.defaultValue?.value;

    if (!multipleSelection && Array.isArray(currentDefault)) {
      onChange({
        ...value,
        defaultValue: {
          isReference: false,
          value: currentDefault[0] ?? undefined,
        },
      });
      return;
    }

    if (multipleSelection && typeof currentDefault === "string") {
      onChange({
        ...value,
        defaultValue: {
          isReference: false,
          value: [currentDefault],
        },
      });
      return;
    }
  }, [multipleSelection, value, onChange]);

  useEffect(() => {
    if (isLoadingRecords || !defaultValueOptions.length) return;
    if (value.defaultValue?.isReference) return;

    const currentDefault = value.defaultValue?.value;
    const optionValues = new Set(defaultValueOptions.map((opt) => opt.value));

    if (Array.isArray(currentDefault)) {
      const next = currentDefault.filter((v) => optionValues.has(v));
      const normalized = next.length ? next : undefined;
      if (
        next.length !== currentDefault.length ||
        (normalized === undefined && currentDefault !== undefined)
      ) {
        onChange({
          ...value,
          defaultValue: { isReference: false, value: normalized },
        });
      }
    } else if (
      typeof currentDefault === "string" &&
      !optionValues.has(currentDefault)
    ) {
      onChange({
        ...value,
        defaultValue: { isReference: false, value: undefined },
      });
    }
  }, [isLoadingRecords, defaultValueOptions, value, onChange]);

  const tableOptions: SelectOption<string>[] = useMemo(
    () =>
      allTable.map((table) => ({
        label: table.name,
        value: table.code,
        key: table.code,
      })),
    [allTable],
  );

  const columnOptions = useMemo(() => {
    const fields = allTable.find(
      (table) => table.code === value.table?.tableKey,
    )?.fields;
    return (
      fields?.map((field) => ({
        label: field.name,
        value: field.name,
        key: field.name,
      })) ?? []
    );
  }, [allTable, value.table?.tableKey]);

  const formFieldOptions = useMemo(() => {
    return Object.values(bStore?.getSchema().entities ?? {}).map((entity) => ({
      label:
        (entity.attributes.label.isReference
          ? entity.attributes.label.reference
          : entity.attributes.label.value) ?? "Unknown",
      value: entity.attributes.name,
      key: entity.attributes.name,
    }));
  }, [bStore]);

  const validTableKey = useMemo(() => {
    const currentTableKey = value.table?.tableKey;
    if (!currentTableKey) return undefined;
    return tableOptions.find((option) => option.value === currentTableKey)
      ?.value;
  }, [tableOptions, value.table?.tableKey]);

  const updateTable = (next: {
    tableKey?: string | null;
    labelKey?: string | null;
    valueKey?: string | null;
  }) => {
    const current = value.table ?? {
      tableKey: null,
      labelKey: null,
      valueKey: null,
    };

    onChange({
      ...value,
      table: { ...current, ...next },
    });
  };

  const updateSorter = (partial: Partial<DynamicValue["sorter"]>) => {
    onChange({
      ...value,
      sorter: { ...(value.sorter ?? {}), ...partial },
    });
  };

  useEffect(() => {
    if (isLoadingTables) return;

    const currentTableKey = value.table?.tableKey;
    if (!currentTableKey) {
      if (!value.table && !value.sorter && !value.filter && !value.defaultValue)
        return;

      onChange({
        ...value,
        table: undefined,
        sorter: undefined,
        filter: undefined,
        defaultValue: undefined,
      });
      return;
    }

    if (validTableKey) return;

    onChange({
      ...value,
      table: undefined,
      sorter: undefined,
      filter: undefined,
      defaultValue: undefined,
    });
  }, [
    isLoadingTables,
    onChange,
    tableOptions,
    validTableKey,
    value,
    value.filter,
    value.sorter,
    value.table,
    value.table?.tableKey,
  ]);

  console.debug(value.table?.tableKey, validTableKey);

  return (
    <Accordion
      key="datasource-dynamic-options"
      defaultOpenKey={["dynamic-option"]}
      openKeys={openKey}
      onClose={() => setOpenKey([])}
      onOpen={() => setOpenKey(["dynamic-option"])}
      items={[
        {
          key: "dynamic-option",
          name: (
            <div className="bg-white flex flex-row w-full justify-between">
              <span className="flex items-center gap-2">Dynamic Setting</span>
            </div>
          ),
          content: (
            <div className="bg-gray-100 border-stroke inline-flex flex-col justify-start items-start gap-4 w-full">
              <div className="justify-start text-secondary-text text-sm font-medium">
                Table Configuration
              </div>

              <div className="self-stretch flex flex-col justify-start items-start gap-1">
                <Label
                  className="text-dark text-base font-medium"
                  aria-required
                >
                  Source Name
                </Label>
                <Select
                  options={tableOptions}
                  value={validTableKey}
                  placeholder="Select a table"
                  onChange={(nextTableKey: string) => {
                    onChange({
                      type: "dynamic",
                      table: {
                        tableKey: nextTableKey,
                        valueKey: null,
                        labelKey: null,
                      },
                      filter: undefined,
                      sorter: undefined,
                      defaultValue: undefined,
                    });
                  }}
                />
              </div>

              {validTableKey && (
                <>
                  <div className="self-stretch flex flex-col justify-start items-start gap-1">
                    <Label
                      className="text-dark text-base font-medium"
                      aria-required
                    >
                      Label Column
                    </Label>
                    <Select
                      options={columnOptions}
                      value={value.table?.labelKey ?? undefined}
                      placeholder="Select a table column"
                      onChange={(nextLabelKey: string) =>
                        updateTable({ labelKey: nextLabelKey })
                      }
                    />
                  </div>

                  <div className="self-stretch flex flex-col justify-start items-start gap-1">
                    <Label
                      className="text-dark text-base font-medium"
                      aria-required
                    >
                      Value Column
                    </Label>
                    <Select
                      options={columnOptions}
                      value={value.table?.valueKey ?? ""}
                      placeholder="Select a table column"
                      onChange={(nextValueKey: string) =>
                        updateTable({ valueKey: nextValueKey })
                      }
                    />
                  </div>
                </>
              )}

              {validTableKey && (
                <>
                  <div className="justify-start text-secondary-text text-sm font-medium">
                    Sorting Configuration
                  </div>

                  <div className="self-stretch flex flex-col justify-start items-start gap-1">
                    <Label className="text-dark text-base font-medium">
                      Sorting Column
                    </Label>
                    <Select
                      options={columnOptions}
                      value={value.sorter?.columnKey}
                      placeholder="Select a table column"
                      onChange={(nextSortColumn: string) =>
                        updateSorter({ columnKey: nextSortColumn })
                      }
                    />
                  </div>

                  <div
                    className={cn(
                      "self-stretch flex flex-col justify-start items-start gap-1 pointer-events-none opacity-30",
                      value.sorter?.columnKey &&
                        "pointer-events-auto opacity-100",
                    )}
                  >
                    <Label className="text-dark text-base font-medium">
                      Sorting Order
                    </Label>
                    <div className="pl-5">
                      <RadioGroup
                        name="sorting-order"
                        value={value.sorter?.order}
                        onChange={(nextOrder) =>
                          updateSorter({ order: nextOrder as "asc" | "desc" })
                        }
                        options={sortingOrderOptions}
                        disabled={!value.sorter?.columnKey}
                      />
                    </div>
                  </div>

                  <FilterSection
                    filter={value.filter}
                    columnOptions={columnOptions}
                    formFieldOptions={formFieldOptions}
                    onChangeFilter={(nextFilter) =>
                      onChange({
                        ...value,
                        filter: nextFilter,
                      })
                    }
                  />

                  <div className="space-y-2 w-full">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Default Value
                      </Label>
                      <CodeToggle
                        value={
                          value.defaultValue?.isReference ? "code" : "manual"
                        }
                        onChange={(nextValue) => {
                          setExpressionError(undefined);
                          onChange({
                            ...value,
                            defaultValue: {
                              isReference: nextValue === "code",
                              value: undefined,
                              reference: "",
                            },
                          });
                        }}
                      />
                    </div>
                    {value.defaultValue?.isReference ? (
                      <CodeEditButton
                        variant="reference"
                        value={String(value.defaultValue.reference ?? "")}
                        trigger={value.defaultValue.reference}
                        onSave={(nextValue) => {
                          const result = validateReference(nextValue);
                          if (!result.isValid) {
                            setExpressionError(result.errors[0]);
                            return;
                          }
                          setExpressionError(undefined);
                          onChange({
                            ...value,
                            defaultValue: {
                              isReference: true,
                              reference: nextValue,
                            },
                          });
                        }}
                      />
                    ) : multipleSelection ? (
                      <MultiSelect
                        options={defaultValueOptions}
                        value={
                          Array.isArray(value.defaultValue?.value)
                            ? (value.defaultValue?.value as string[])
                            : value.defaultValue?.value
                              ? [value.defaultValue.value as string]
                              : []
                        }
                        onChange={(vals) => {
                          const normalized =
                            Array.isArray(vals) && vals.length === 0
                              ? undefined
                              : vals;
                          onChange({
                            ...value,
                            defaultValue: {
                              isReference: false,
                              value: normalized as string[] | undefined,
                            },
                          });
                        }}
                        placeholder="Select defaults"
                        disabled={
                          !value.table?.labelKey ||
                          !value.table?.valueKey ||
                          isLoadingRecords
                        }
                      />
                    ) : (
                      <Select
                        options={[
                          { label: "None", value: "", key: "none" },
                          ...defaultValueOptions,
                        ]}
                        value={
                          typeof value.defaultValue?.value === "string"
                            ? value.defaultValue.value
                            : ""
                        }
                        onChange={(val: string) =>
                          onChange({
                            ...value,
                            defaultValue: {
                              isReference: false,
                              value: val || undefined,
                            },
                          })
                        }
                        placeholder="Select default"
                        disabled={
                          !value.table?.labelKey ||
                          !value.table?.valueKey ||
                          isLoadingRecords
                        }
                      />
                    )}
                    {expressionError && (
                      <ValidationError>{expressionError}</ValidationError>
                    )}
                  </div>
                </>
              )}
            </div>
          ),
        },
      ]}
    />
  );
}

function FilterSection({
  filter,
  columnOptions,
  formFieldOptions,
  onChangeFilter,
}: FilterSectionProps) {
  const getCurrentUiFilter = (): DynamicFilterUi => {
    if (filter && !filter.isReference) {
      return {
        isReference: false,
        columnKey: filter.columnKey ?? "",
        logic: filter.logic ?? "equals",
        formField: filter.formField ?? "",
      };
    }
    return {
      isReference: false,
      columnKey: "",
      logic: "equals",
      formField: "",
    };
  };

  return (
    <>
      <div className="justify-start text-secondary-text text-sm font-medium">
        Filter Configuration
      </div>

      {/* <div className="self-stretch flex flex-row justify-between items-center gap-1.5">
        <Label className="text-dark text-base font-medium">Filter</Label>
        <CodeToggle
          value={filter?.isReference ? "code" : "manual"}
          onChange={(value) => {
            if (value === "code") {
              onChangeFilter({
                isReference: true,
                expression:
                  filter && filter.isReference
                    ? filter.expression
                    : "function condition(){\n return true;\n}",
              });
              return;
            }
            onChangeFilter(getCurrentUiFilter());
          }}
        />
      </div> */}

      {filter?.isReference ? (
        <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
          <Label className="text-dark text-base font-medium">Expression</Label>
          <CodeEditButton
            variant="validation"
            validationReturnType="boolean"
            showApiToggle={false}
            contextPreset={{
              value: "",
              filter: {},
              sorter: {},
            }}
            value={
              filter.expression ?? "function condition(){\n return true;\n}"
            }
            trigger={filter.expression ?? "Click to open code editor"}
            onSave={(nextExpression) => {
              onChangeFilter({
                isReference: true,
                expression: nextExpression,
              } satisfies DynamicFilterExpression);
            }}
          />
        </div>
      ) : (
        <>
          <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
            <Label className="text-dark text-base font-medium">
              Filter Value Source
            </Label>
            <Select
              options={columnOptions}
              value={filter?.columnKey}
              placeholder="Select a table column"
              onChange={(nextColumn: string) => {
                onChangeFilter({
                  ...getCurrentUiFilter(),
                  columnKey: nextColumn,
                });
              }}
            />
          </div>
          <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
            <Label className="text-dark text-base font-medium">Operator</Label>
            <Select
              options={operatorOptions}
              value={filter?.logic ?? undefined}
              placeholder="Select operator"
              onChange={(nextOperator: Operator) => {
                onChangeFilter({
                  ...getCurrentUiFilter(),
                  logic: nextOperator,
                });
              }}
            />
          </div>

          <div className="self-stretch flex flex-col justify-start items-start gap-1.5">
            <Label className="text-dark text-base font-medium">
              Referenced Field
            </Label>
            <Select
              options={formFieldOptions}
              value={filter?.formField}
              placeholder="Select a form field"
              onChange={(nextField: string) => {
                onChangeFilter({
                  ...getCurrentUiFilter(),
                  formField: nextField,
                });
              }}
            />
          </div>
        </>
      )}
    </>
  );
}
