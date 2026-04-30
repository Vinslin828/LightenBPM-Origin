import {
  BackIcon,
  InputIcon,
  NumberIcon,
  DateTimeIcon,
  DropdownIcon,
} from "@/components/icons";
import { builderStoreAtom, selectedGridHeaderAtom } from "@/store";
import { cn } from "@/utils/cn";
import { AttributeComponentProps } from "@coltorapps/builder-react";
import { type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import Accordion from "@ui/accordion";
import { PlusIcon } from "lucide-react";
import { Checkbox } from "@ui/checkbox";
import { Input } from "@ui/input";
import { Label } from "@ui/label";
import { Select } from "@ui/select";
import { SelectOption } from "@ui/select/single-select";
import { Toggle } from "@ui/toggle";
import { DatePicker, DateTimePicker, TimePicker } from "@ui/datetime-selector";
import { Button } from "@/components/ui/button";
import { SortableItem, SortableList } from "@/components/ui/sortable";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { useAtom } from "jotai";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { gridHeaderAttribute } from "../../attributes/grid-header/definition";
import { ZodError } from "zod";

type GridHeadersValue = AttributeComponentProps<
  typeof gridHeaderAttribute
>["attribute"]["value"];
type GridHeaderItem = GridHeadersValue[number];
type StaticOption = {
  label: string;
  value: string;
  key: string;
};
type StaticDatasource = {
  type: "static";
  options: StaticOption[];
  defaultValue?: {
    isReference: boolean;
    value?: string;
    reference?: string;
  };
};

const createStaticOption = (index: number, keyValue: string): StaticOption => ({
  label: `Option ${index + 1}`,
  value: `option_${index + 1}_${keyValue || "column"}`,
  key: crypto.randomUUID(),
});

const normalizeStaticDatasource = (
  datasource: unknown,
  keyValue: string,
): StaticDatasource => {
  if (
    datasource &&
    typeof datasource === "object" &&
    "type" in datasource &&
    (datasource as { type?: string }).type === "static"
  ) {
    const staticDatasource = datasource as unknown as {
      options?: unknown[];
      defaultValue?: unknown;
    };
    const rawOptions = Array.isArray(staticDatasource.options)
      ? staticDatasource.options
      : [];

    const options = rawOptions.length
      ? rawOptions.map((option, index) => {
          const entry = option as Partial<StaticOption>;
          return {
            label:
              typeof entry.label === "string"
                ? entry.label
                : `Option ${index + 1}`,
            value:
              typeof entry.value === "string"
                ? entry.value
                : `option_${index + 1}_${keyValue || "column"}`,
            key:
              typeof entry.key === "string" && entry.key
                ? entry.key
                : crypto.randomUUID(),
          };
        })
      : [createStaticOption(0, keyValue)];

    const rawDefaultValue = staticDatasource.defaultValue;
    const defaultValue =
      rawDefaultValue &&
      typeof rawDefaultValue === "object" &&
      "isReference" in rawDefaultValue
        ? (rawDefaultValue as StaticDatasource["defaultValue"])
        : undefined;

    return { type: "static", options, defaultValue };
  }

  return {
    type: "static",
    options: [createStaticOption(0, keyValue)],
    defaultValue: undefined,
  };
};

export default function HeaderItemAttribute({
  entityId,
  headerKey,
}: {
  entityId: string;
  headerKey: string;
}) {
  const [builderStore] = useAtom(builderStoreAtom);
  const [activeHeader, setActiveHeader] = useAtom(selectedGridHeaderAtom);
  const [storeVersion, setStoreVersion] = useState(0);
  const [expandedOptionIndexes, setExpandedOptionIndexes] = useState<number[]>(
    [],
  );

  useEffect(() => {
    if (!builderStore) return;
    return builderStore.subscribe(() => {
      setStoreVersion((prev) => prev + 1);
    });
  }, [builderStore]);

  const selectedHeaderKey = activeHeader?.headerKey ?? headerKey;

  const headers = useMemo(() => {
    if (!builderStore) return [];
    const schema = builderStore.getData().schema;
    const entity = schema.entities[entityId] as
      | { attributes?: Record<string, unknown> }
      | undefined;
    const rawHeaders =
      (entity?.attributes?.gridHeaders as GridHeadersValue) ?? [];
    return Array.isArray(rawHeaders) ? rawHeaders : [];
  }, [builderStore, entityId, storeVersion]);
  const header = useMemo(
    () => headers.find((h) => h.key === selectedHeaderKey),
    [headers, selectedHeaderKey],
  );
  const headerIndex = useMemo(
    () => headers.findIndex((h) => h.key === selectedHeaderKey),
    [headers, selectedHeaderKey],
  );

  const updateHeader = (patch: Partial<GridHeaderItem>) => {
    if (!builderStore || !header) return;

    const nextHeaders = headers.map((item) =>
      item.key === header.key ? { ...item, ...patch } : item,
    );
    builderStore.setEntityAttribute(
      entityId,
      "gridHeaders",
      nextHeaders as any,
    );
    void builderStore.validateEntityAttribute(entityId, "gridHeaders");

    if (patch.key && activeHeader) {
      setActiveHeader({
        ...activeHeader,
        headerKey: patch.key,
      });
    }
  };

  const replaceHeader = (nextHeader: GridHeaderItem) => {
    if (!builderStore || !header) return;

    const nextHeaders = headers.map((item) =>
      item.key === header.key ? nextHeader : item,
    );
    builderStore.setEntityAttribute(
      entityId,
      "gridHeaders",
      nextHeaders as any,
    );
    void builderStore.validateEntityAttribute(entityId, "gridHeaders");
  };

  if (!header) {
    return null;
  }

  const formattedHeaderErrors = formatError(
    headers,
    activeHeader?.header.attribute.error,
  );
  const headerError =
    formattedHeaderErrors?.[`${headerIndex}`]?.keyValue?._errors?.[0] ??
    formattedHeaderErrors?.[`${headerIndex}`]?._errors?.[0] ??
    (activeHeader?.header.attribute.error instanceof ZodError
      ? activeHeader.header.attribute.error.issues.find(
          (issue) =>
            issue.path[0] === headerIndex && issue.path[1] === "keyValue",
        )?.message
      : activeHeader?.header.attribute.error instanceof Error
        ? activeHeader.header.attribute.error.message
        : undefined);

  const getDefaultValueText = () => {
    if (!("defaultValue" in header)) return "";
    if (typeof header.defaultValue === "number")
      return String(header.defaultValue);
    return header.defaultValue ?? "";
  };

  const typeOptions: Array<{
    value: NonNullable<GridHeaderItem["type"]>;
    label: string;
    icon: ReactNode;
  }> = [
    {
      value: "input",
      label: "Input",
      icon: <InputIcon className="text-primary-text" />,
    },
    {
      value: "number",
      label: "Number",
      icon: <NumberIcon className="text-primary-text" />,
    },
    {
      value: "date",
      label: "Date",
      icon: <DateTimeIcon className="text-primary-text" />,
    },
    {
      value: "dropdown",
      label: "Dropdown",
      icon: <DropdownIcon className="text-primary-text" />,
    },
  ];
  const dateSubtypeOptions: SelectOption<string>[] = [
    { label: "Date", value: "date", key: "date" },
    { label: "Time", value: "time", key: "time" },
    // { label: "Date & Time", value: "datetime" },
  ];

  const flowOptions: Array<{
    value: "split" | "recursive" | "others";
    label: string;
  }> = [
    { value: "split", label: "Split" },
    { value: "recursive", label: "Recursive" },
    { value: "others", label: "Others" },
  ];
  const currentType = header.type ?? "input";
  const showDefaultValue = currentType !== "dropdown";
  const staticDatasource =
    currentType === "dropdown"
      ? normalizeStaticDatasource(
          (header as GridHeaderItem & { datasource?: unknown }).datasource,
          header.keyValue,
        )
      : undefined;
  const staticOptions = staticDatasource?.options ?? [];
  const defaultDropdownValue =
    staticDatasource?.defaultValue &&
    !staticDatasource.defaultValue.isReference &&
    typeof staticDatasource.defaultValue.value === "string"
      ? staticDatasource.defaultValue.value
      : "__none__";
  const dropdownDefaultValueOptions: SelectOption<string>[] = [
    { label: "None", value: "__none__", key: "none" },
    ...staticOptions,
  ];

  const updateStaticDatasource = (
    updater: (current: StaticDatasource) => StaticDatasource,
  ) => {
    const currentDatasource = normalizeStaticDatasource(
      (header as GridHeaderItem & { datasource?: unknown }).datasource,
      header.keyValue,
    );
    const nextDatasource = updater(currentDatasource);
    updateHeader({
      datasource: nextDatasource as GridHeaderItem extends {
        datasource?: infer T;
      }
        ? T
        : never,
    } as Partial<GridHeaderItem>);
  };

  const handleDropdownOptionsDragEnd = (event: DragEndEvent) => {
    if (currentType !== "dropdown") return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = staticOptions.findIndex(
      (option) => option.key === active.id,
    );
    const newIndex = staticOptions.findIndex(
      (option) => option.key === over.id,
    );
    if (oldIndex < 0 || newIndex < 0) return;

    updateStaticDatasource((current) => ({
      ...current,
      options: arrayMove(current.options, oldIndex, newIndex),
    }));

    setExpandedOptionIndexes((prev) =>
      prev.map((i) => {
        if (i === oldIndex) return newIndex;
        if (oldIndex < newIndex && i > oldIndex && i <= newIndex) return i - 1;
        if (oldIndex > newIndex && i >= newIndex && i < oldIndex) return i + 1;
        return i;
      }),
    );
  };
  const dateSubtype =
    currentType === "date"
      ? header.type === "date"
        ? (header.subtype ?? "date")
        : "date"
      : "date";

  return (
    <>
      <div className="border-b border-b-stroke text-dark py-[13px] px-5 flex flex-row gap-[14px] text-base font-semibold items-center sticky top-0 bg-white z-10">
        <button
          type="button"
          onClick={() => setActiveHeader(null)}
          className="p-[6px] rounded-sm border border-stroke bg-white hover:bg-gray-2"
        >
          <BackIcon className="text-secondary-text" />
        </button>
        Edit Header Items
      </div>

      <Accordion
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <div>
                  <Label>Label</Label>
                  <Input
                    value={header.label}
                    placeholder="Label"
                    onChange={(e) => updateHeader({ label: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Key</Label>
                  <Input
                    value={header.keyValue}
                    placeholder="Key"
                    onChange={(e) => updateHeader({ keyValue: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {typeOptions.map((typeItem) => {
                    const active = (header.type ?? "input") === typeItem.value;

                    return (
                      <button
                        key={typeItem.value}
                        type="button"
                        onClick={() => {
                          const nextType = typeItem.value;
                          const nextHeader = {
                            label: header.label,
                            key: header.key,
                            keyValue: header.keyValue,
                            type: nextType,
                            ...(nextType === "date" ? { subtype: "date" } : {}),
                            ...(nextType === "dropdown"
                              ? {
                                  datasource: normalizeStaticDatasource(
                                    (
                                      header as GridHeaderItem & {
                                        datasource?: unknown;
                                      }
                                    ).datasource,
                                    header.keyValue,
                                  ),
                                }
                              : {}),
                          } as GridHeaderItem;

                          replaceHeader(nextHeader);
                        }}
                        className={cn(
                          "w-full py-3 rounded-md border inline-flex flex-col items-center gap-1 bg-white",
                          active
                            ? "border-2 border-lighten-blue bg-lighten-blue/10"
                            : "border-stroke",
                        )}
                      >
                        {typeItem.icon}
                        <span className="text-xs font-medium text-dark">
                          {typeItem.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div>
                  <Label>Placeholder</Label>
                  <Input
                    value={header.placeholder ?? ""}
                    placeholder="Placeholder"
                    onChange={(e) =>
                      updateHeader({ placeholder: e.target.value })
                    }
                  />
                </div>
                {currentType === "date" && (
                  <div className="flex flex-col gap-2">
                    <Label>Date Subtype</Label>
                    <Select
                      mode="single"
                      options={dateSubtypeOptions}
                      value={
                        header.type === "date"
                          ? (header.subtype ?? "date")
                          : "date"
                      }
                      onChange={(value) =>
                        updateHeader({
                          subtype: (value || "date") as
                            | "date"
                            | "time"
                            | "datetime",
                        })
                      }
                      placeholder="Select subtype"
                    />
                  </div>
                )}
                {showDefaultValue && (
                  <div>
                    <Label>Default Value</Label>
                    {currentType === "date" ? (
                      <>
                        {dateSubtype === "time" ? (
                          <TimePicker
                            name={`grid-header-${header.key}-default-time`}
                            value={
                              "defaultValue" in header &&
                              typeof header.defaultValue === "number"
                                ? header.defaultValue
                                : undefined
                            }
                            onChange={(timestamp) =>
                              updateHeader({ defaultValue: timestamp })
                            }
                          />
                        ) : dateSubtype === "datetime" ? (
                          <DateTimePicker
                            name={`grid-header-${header.key}-default-datetime`}
                            value={
                              "defaultValue" in header &&
                              typeof header.defaultValue === "number"
                                ? header.defaultValue
                                : undefined
                            }
                            onChange={(timestamp) =>
                              updateHeader({ defaultValue: timestamp })
                            }
                          />
                        ) : (
                          <DatePicker
                            name={`grid-header-${header.key}-default-date`}
                            value={
                              "defaultValue" in header &&
                              typeof header.defaultValue === "number"
                                ? header.defaultValue
                                : undefined
                            }
                            onChange={(timestamp) =>
                              updateHeader({ defaultValue: timestamp })
                            }
                          />
                        )}
                      </>
                    ) : (
                      <Input
                        type={currentType === "number" ? "number" : "text"}
                        value={getDefaultValueText()}
                        placeholder="Default Value"
                        onChange={(e) => {
                          if (currentType === "number") {
                            const rawValue = e.target.value;
                            updateHeader({
                              defaultValue:
                                rawValue === "" ? undefined : Number(rawValue),
                            });
                            return;
                          }

                          updateHeader({ defaultValue: e.target.value });
                        }}
                      />
                    )}
                  </div>
                )}
                {currentType === "dropdown" && (
                  <>
                    <div className="space-y-2">
                      <div className="flex flex-row justify-between items-center">
                        <Label>Options</Label>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-white bg-lighten-blue rounded-full w-5 h-5 flex items-center justify-center">
                            {staticOptions.length}
                          </div>
                          <Button
                            variant="ghost"
                            className="p-0 cursor-pointer"
                            onClick={() => {
                              updateStaticDatasource((current) => ({
                                ...current,
                                options: [
                                  ...current.options,
                                  createStaticOption(
                                    current.options.length,
                                    header.keyValue,
                                  ),
                                ],
                              }));
                            }}
                          >
                            <PlusIcon className="text-lighten-blue" />
                          </Button>
                        </div>
                      </div>

                      <SortableList
                        items={staticOptions.map((option) => ({
                          id: option.key,
                        }))}
                        onDragEnd={handleDropdownOptionsDragEnd}
                      >
                        {staticOptions.map((option, index) => (
                          <SortableItem
                            key={option.key}
                            id={option.key}
                            expanded={expandedOptionIndexes.includes(index)}
                            onExpand={() => {
                              setExpandedOptionIndexes((prev) =>
                                prev.includes(index)
                                  ? prev.filter((i) => i !== index)
                                  : [...prev, index],
                              );
                            }}
                            onRemove={() => {
                              if (staticOptions.length <= 1) return;

                              updateStaticDatasource((current) => {
                                const nextOptions = current.options.filter(
                                  (_, i) => i !== index,
                                );
                                const optionValues = new Set(
                                  nextOptions.map((item) => item.value),
                                );
                                const currentDefault =
                                  current.defaultValue &&
                                  !current.defaultValue.isReference &&
                                  typeof current.defaultValue.value === "string"
                                    ? current.defaultValue.value
                                    : undefined;

                                return {
                                  ...current,
                                  options: nextOptions,
                                  defaultValue:
                                    currentDefault &&
                                    !optionValues.has(currentDefault)
                                      ? undefined
                                      : current.defaultValue,
                                };
                              });

                              setExpandedOptionIndexes((prev) =>
                                prev
                                  .filter((i) => i !== index)
                                  .map((i) => (i > index ? i - 1 : i)),
                              );
                            }}
                            title={
                              <span className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                                {option.label || option.value}
                              </span>
                            }
                          >
                            {expandedOptionIndexes.includes(index) && (
                              <div className="mt-3 space-y-4 pt-3 border-t border-[#DFE4EA]">
                                <div className="space-y-2">
                                  <Label className="text-base font-medium text-dark">
                                    Label
                                  </Label>
                                  <Input
                                    value={option.label}
                                    placeholder={`Option ${index + 1}`}
                                    onChange={(e) => {
                                      const nextLabel = e.target.value;
                                      updateStaticDatasource((current) => ({
                                        ...current,
                                        options: current.options.map(
                                          (item, i) =>
                                            i === index
                                              ? { ...item, label: nextLabel }
                                              : item,
                                        ),
                                      }));
                                    }}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label className="text-base font-medium text-dark">
                                    Value
                                  </Label>
                                  <Input
                                    value={option.value}
                                    placeholder={`option_${index + 1}_${header.keyValue}`}
                                    onChange={(e) => {
                                      const nextValue = e.target.value;
                                      updateStaticDatasource((current) => {
                                        const previousValue =
                                          current.options[index]?.value;
                                        const nextOptions = current.options.map(
                                          (item, i) =>
                                            i === index
                                              ? { ...item, value: nextValue }
                                              : item,
                                        );
                                        const currentDefault =
                                          current.defaultValue &&
                                          !current.defaultValue.isReference &&
                                          typeof current.defaultValue.value ===
                                            "string"
                                            ? current.defaultValue.value
                                            : undefined;

                                        return {
                                          ...current,
                                          options: nextOptions,
                                          defaultValue:
                                            currentDefault === previousValue
                                              ? {
                                                  isReference: false,
                                                  value: nextValue,
                                                }
                                              : current.defaultValue,
                                        };
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                            )}
                          </SortableItem>
                        ))}
                      </SortableList>
                    </div>

                    <div className="space-y-2">
                      <Label>Default Value</Label>
                      <Select
                        mode="single"
                        options={dropdownDefaultValueOptions}
                        value={defaultDropdownValue}
                        placeholder="Select default value"
                        onChange={(value) =>
                          updateStaticDatasource((current) => ({
                            ...current,
                            defaultValue:
                              value && value !== "__none__"
                                ? { isReference: false, value }
                                : undefined,
                          }))
                        }
                      />
                    </div>
                  </>
                )}
                {headerError && (
                  <ValidationError>{headerError}</ValidationError>
                )}
                <div className="flex flex-row justify-between items-center">
                  <span className="text-base font-medium text-dark">
                    Required
                  </span>
                  <Toggle
                    pressed={header.required ?? false}
                    onPressedChange={(value) =>
                      updateHeader({ required: value })
                    }
                  />
                </div>
              </div>
            ),
          },
          {
            key: "flow-related",
            name: "Flow Related",
            content: (
              <div className="flex flex-col gap-4">
                {flowOptions.map((item) => {
                  const currentFlowType = header.flowType ?? ["split"];
                  const checked = currentFlowType.includes(item.value);
                  return (
                    <div
                      className="flex flex-row gap-2 items-center"
                      key={item.value}
                    >
                      <Checkbox
                        id={`grid-header-flow-${item.value}`}
                        checked={checked}
                        onCheckedChange={(nextChecked) => {
                          const normalized = new Set(currentFlowType);
                          if (nextChecked) {
                            normalized.add(item.value);
                          } else {
                            normalized.delete(item.value);
                          }
                          updateHeader({
                            flowType: Array.from(normalized),
                          });
                        }}
                      />
                      <label
                        htmlFor={`grid-header-flow-${item.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {item.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
