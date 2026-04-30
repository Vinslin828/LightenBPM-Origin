import { useCodeBuilder } from "@/hooks/useCode/useCodeBuilder";
import { DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import CodeEditButton from "@ui/button/code-edit-button";
import CodeToggle from "@ui/code-toggle";
import { Input } from "@ui/input";
import { Label } from "@ui/label";
import { RadioOption } from "@ui/radio-group";
import { MultiSelect, Select } from "@ui/select";
import { ValidationError } from "@ui/validation-error";
import { PlusIcon } from "lucide-react";
import { useState, useRef, useMemo, useEffect } from "react";
import { SortableList, SortableItem } from "../../../ui/sortable";
import Accordion from "@ui/accordion";

type Props = {
  attributeName: string;
  value: StaticValue;
  multipleSelection: boolean;
  onChange: (value: StaticValue) => void;
};

type StaticOption = { label: string; value: string; key: string };
export type StaticValue = {
  type: "static";
  options: StaticOption[];
  defaultValue?: {
    isReference: boolean;
    reference?: string;
    value?: string | string[];
  };
};

export default function StaticSetting({
  attributeName,
  value,
  multipleSelection,
  onChange,
}: Props) {
  const { validateReference } = useCodeBuilder();
  const [expressionError, setExpressionError] = useState<string | undefined>(
    undefined,
  );
  const [expandedIndexes, setExpandedIndexes] = useState<number[]>([]);
  const [openKey, setOpenKey] = useState<string[]>(["static-option"]);
  const nextKeyId = useRef(value.options.length);
  const optionsWithKeys = useMemo(
    () =>
      value.options.map((opt) =>
        opt.key
          ? opt
          : {
              ...opt,
              key: opt.key ?? `${attributeName}-${nextKeyId.current++}`,
            },
      ),
    [value.options],
  );

  console.debug(multipleSelection);

  useEffect(() => {
    if (value.options.some((opt) => !opt.key)) {
      onChange({ ...value, options: optionsWithKeys });
      return;
    }
    nextKeyId.current = Math.max(nextKeyId.current, value.options.length);
    setExpandedIndexes((prev) =>
      prev.filter((index) => index < value.options.length),
    );
    setOpenKey((prev) =>
      prev.includes("static-option") ? prev : ["static-option"],
    );
  }, [attributeName, value.options.length, onChange, optionsWithKeys, value]);

  const handleStaticOptionChange = (
    index: number,
    key: keyof StaticOption,
    newValue: string,
  ) => {
    const nextOptions = [...value.options];
    nextOptions[index] = { ...nextOptions[index], [key]: newValue };
    onChange({ ...value, options: nextOptions });
  };

  const handleAddOption = () => {
    const nextOptions = [
      ...optionsWithKeys,
      {
        label: `Option ${value.options.length + 1}`,
        value: `option_${value.options.length + 1}`,
        key: `${attributeName}-${Date.now()}-${value.options.length + 1}`,
      },
    ];
    onChange({ ...value, options: nextOptions });
  };

  const defaultValueWrapper =
    value.defaultValue &&
    typeof value.defaultValue === "object" &&
    "isReference" in value.defaultValue
      ? (value.defaultValue as {
          isReference: boolean;
          reference?: string;
          value?: string | string[];
        })
      : { isReference: false, value: value.defaultValue };

  const handleDefaultChange = (val?: string | string[]) => {
    const normalized = Array.isArray(val) && val.length === 0 ? undefined : val;
    onChange({
      ...value,
      defaultValue: { isReference: false, value: normalized },
    });
  };

  useEffect(() => {
    const optionValues = new Set(optionsWithKeys.map((opt) => opt.value));

    if (defaultValueWrapper.isReference) {
      return;
    }
    if (Array.isArray(defaultValueWrapper.value)) {
      const next = defaultValueWrapper.value.filter(
        (v): v is string => typeof v === "string" && optionValues.has(v),
      );
      const normalized = next.length ? next : undefined;

      if (
        next.length !== defaultValueWrapper.value.length ||
        (normalized === undefined && defaultValueWrapper.value !== undefined)
      ) {
        onChange({
          ...value,
          defaultValue: { isReference: false, value: normalized },
        });
      }
    } else if (
      typeof defaultValueWrapper.value === "string" &&
      !optionValues.has(defaultValueWrapper.value)
    ) {
      onChange({
        ...value,
        defaultValue: { isReference: false, value: undefined },
      });
    }
  }, [
    defaultValueWrapper.isReference,
    defaultValueWrapper.value,
    optionsWithKeys,
    onChange,
    value,
  ]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = optionsWithKeys.findIndex(
        (opt) => opt.key === active.id,
      );
      const newIndex = optionsWithKeys.findIndex((opt) => opt.key === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      const newOptions = arrayMove(optionsWithKeys, oldIndex, newIndex);
      onChange({ ...value, options: newOptions });
      setExpandedIndexes((prev) =>
        prev.map((i) => {
          if (i === oldIndex) return newIndex;
          if (oldIndex < newIndex && i > oldIndex && i <= newIndex) {
            return i - 1;
          }
          if (oldIndex > newIndex && i >= newIndex && i < oldIndex) {
            return i + 1;
          }
          return i;
        }),
      );
    }
  };

  return (
    <>
      <Accordion
        key={"datasource-static-options"}
        defaultOpenKey={["static-option"]}
        openKeys={openKey}
        onClose={() => setOpenKey([])}
        onOpen={() => setOpenKey(["static-option"])}
        items={[
          {
            key: "static-option",
            name: (
              <div className="bg-white flex flex-row w-full justify-between">
                <span className="flex items-center gap-2">
                  Static Options
                  <div className="text-xs text-white bg-giant-blue rounded-full w-5 h-5 flex items-center justify-center">
                    {value.options.length}
                  </div>
                </span>

                <span
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddOption();
                  }}
                >
                  <PlusIcon className="text-giant-blue" />
                </span>
              </div>
            ),
            content: (
              <div className="flex flex-col gap-4">
                <SortableList
                  items={optionsWithKeys.map((opt) => ({
                    ...opt,
                    id: opt.key,
                  }))}
                  onDragEnd={handleDragEnd}
                >
                  {optionsWithKeys.map((opt, index) => (
                    <SortableItem
                      key={opt.key}
                      id={opt.key}
                      expanded={expandedIndexes.includes(index)}
                      onExpand={() => {
                        setExpandedIndexes((prev) =>
                          prev.includes(index)
                            ? prev.filter((i) => i !== index)
                            : [...prev, index],
                        );
                      }}
                      onRemove={() => {
                        if (value.options.length <= 1) return;
                        const nextOptions = optionsWithKeys.filter(
                          (_, i) => i !== index,
                        );
                        const newExpanded = expandedIndexes
                          .filter((i) => i !== index)
                          .map((i) => (i > index ? i - 1 : i));
                        onChange({ ...value, options: nextOptions });
                        setExpandedIndexes(newExpanded);
                      }}
                      title={
                        <span className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                          {opt.label}
                        </span>
                      }
                    >
                      {expandedIndexes.includes(index) && (
                        <div className="mt-3 space-y-4 pt-3 border-t border-[#DFE4EA]">
                          <div className="space-y-2">
                            <Label className="text-base font-medium text-dark">
                              Label
                            </Label>
                            <Input
                              value={opt.label}
                              onChange={(e) =>
                                handleStaticOptionChange(
                                  index,
                                  "label",
                                  e.target.value,
                                )
                              }
                              placeholder={`Option ${index + 1}`}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-medium text-[#111928]">
                              Value
                            </Label>
                            <Input
                              value={opt.value}
                              onChange={(e) =>
                                handleStaticOptionChange(
                                  index,
                                  "value",
                                  e.target.value,
                                )
                              }
                              placeholder={`value_${index + 1}`}
                            />
                          </div>
                        </div>
                      )}
                    </SortableItem>
                  ))}
                </SortableList>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Default Value</Label>
                    <CodeToggle
                      value={
                        defaultValueWrapper.isReference ? "code" : "manual"
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
                  {defaultValueWrapper.isReference ? (
                    <CodeEditButton
            variant="reference"
                      value={String(defaultValueWrapper.reference ?? "")}
                      trigger={defaultValueWrapper.reference}
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
                      options={value.options.map((opt) => ({
                        label: opt.label || opt.value,
                        value: opt.value,
                        key: opt.value,
                      }))}
                      value={
                        Array.isArray(defaultValueWrapper.value)
                          ? defaultValueWrapper.value
                          : defaultValueWrapper.value
                            ? [defaultValueWrapper.value]
                            : []
                      }
                      onChange={(vals) =>
                        handleDefaultChange(vals as string[] | undefined)
                      }
                      placeholder="Select defaults"
                    />
                  ) : (
                    <Select
                      options={[
                        { label: "None", value: "", key: "none" },
                        ...value.options.map((opt) => ({
                          label: opt.label || opt.value,
                          value: opt.value,
                          key: opt.value,
                        })),
                      ]}
                      value={
                        typeof defaultValueWrapper.value === "string"
                          ? defaultValueWrapper.value
                          : ""
                      }
                      onChange={(val: string) =>
                        handleDefaultChange(val ? String(val) : undefined)
                      }
                      placeholder="Select default"
                    />
                  )}
                  {expressionError && (
                    <ValidationError>{expressionError}</ValidationError>
                  )}
                </div>
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
