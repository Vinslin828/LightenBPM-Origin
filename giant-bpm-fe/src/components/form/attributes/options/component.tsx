import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { PlusIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";

import { createAttributeComponent } from "@coltorapps/builder-react";
import { optionsAttribute } from "./definition";
import { Button } from "@/components/ui/button";
import { SortableList, SortableItem } from "../../../ui/sortable";

export const OPTIONS_UPDATED_EVENT = "options-updated";
export const getOptionsUpdatedEventName = (entityId?: string) =>
  `${OPTIONS_UPDATED_EVENT}-${entityId ?? "unknown"}`;
export type OptionsUpdatedPayload = {
  entityId?: string;
  options: { label: string; value: string; key: string }[];
};

export const OptionsAttribute = createAttributeComponent(
  optionsAttribute,
  function OptionsAttribute(props) {
    const attributeError = formatError(
      props.attribute.value,
      props.attribute.error,
    )?._errors?.[0];
    const [expandedIndexes, setExpandedIndexes] = useState<number[]>([]);
    const options = props.attribute.value as {
      label: string;
      value: string;
      key: string;
    }[];
    const missingRequired = options.length === 0;
    const optionsWithKeys = useMemo(
      () =>
        options.map((opt, index) =>
          opt.key ? opt : { ...opt, key: crypto.randomUUID() },
        ),
      [options],
    );

    const emitOptionsUpdate = (
      newOptions: { label: string; value: string; key: string }[],
    ) => {
      props.setValue(newOptions);
      if (typeof window !== "undefined") {
        console.debug(getOptionsUpdatedEventName(props.entity.id), {
          entityId: props.entity?.id,
          options: newOptions.map((opt, index) => ({
            label: opt.label,
            value: opt.value,
            key: opt.key,
          })),
        } satisfies OptionsUpdatedPayload);
        window.dispatchEvent(
          new CustomEvent(getOptionsUpdatedEventName(props.entity.id), {
            detail: {
              entityId: props.entity?.id,
              options: newOptions.map((opt, index) => ({
                label: opt.label,
                value: opt.value,
                key: opt.key,
              })),
            } satisfies OptionsUpdatedPayload,
          }),
        );
      }
    };

    // Handle drag end
    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      console.debug("options:drag", {
        activeId: active?.id,
        overId: over?.id,
        activeOption: options.find((o) => o.key === active?.id),
        overOption: options.find((o) => o.key === over?.id),
      });

      if (over && active.id !== over.id) {
        const oldIndex = optionsWithKeys.findIndex(
          (opt) => opt.key === active.id,
        );
        const newIndex = optionsWithKeys.findIndex(
          (opt) => opt.key === over.id,
        );

        const newOptions = arrayMove(optionsWithKeys, oldIndex, newIndex);
        emitOptionsUpdate(newOptions);
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
        <div className="flex flex-row justify-end items-center gap-29 translate-x-[125px] -translate-y-[52px] w-fit h-0">
          <div className="text-xs text-white bg-giant-blue rounded-full w-5 h-5 flex items-center justify-center">
            {props.attribute.value.length}
          </div>
          <Button
            variant={"ghost"}
            className="p-0 cursor-pointer"
            onClick={() => {
              console.debug(
                "add new options",
                props.attribute.value.length + 1,
              );
              const nextOptions = [
                ...optionsWithKeys,
                {
                  label: `Option ${optionsWithKeys.length + 1}`,
                  value: `option_${optionsWithKeys.length + 1}_${props.attribute.name}`,
                  key: crypto.randomUUID(),
                },
              ];
              emitOptionsUpdate(nextOptions);
            }}
          >
            <PlusIcon className="text-giant-blue" />
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          <SortableList
            items={optionsWithKeys.map((option) => ({
              ...option,
              id: option.key,
              key: option.key,
            }))}
            onDragEnd={handleDragEnd}
          >
            {optionsWithKeys.map((option, index) => (
              <SortableItem
                key={option.key}
                id={option.key}
                expanded={expandedIndexes.includes(index)}
                onExpand={() => {
                  setExpandedIndexes((prev) =>
                    prev.includes(index)
                      ? prev.filter((i) => i !== index)
                      : [...prev, index],
                  );
                }}
                onRemove={() => {
                  if (options.length <= 1) return;
                  const newOptions = optionsWithKeys.filter(
                    (_, i) => i !== index,
                  );
                  const newExpanded = expandedIndexes
                    .filter((i) => i !== index)
                    .map((i) => (i > index ? i - 1 : i));
                  emitOptionsUpdate(newOptions);
                  setExpandedIndexes(newExpanded);
                }}
                title={
                  <span className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                    {option.label}
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
                        name={`${props.attribute.name}-options-${index}-label`}
                        value={option.label ?? ""}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          const newOptions = optionsWithKeys.map((item, i) =>
                            i === index ? { ...item, label: newValue } : item,
                          );
                          emitOptionsUpdate(newOptions);
                        }}
                        placeholder={`Option ${index + 1}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-medium text-[#111928]">
                        Value
                      </Label>
                      <Input
                        name={`${props.attribute.name}-options-${index}-value`}
                        value={option.value}
                        placeholder={
                          option.value ||
                          `option_${index + 1}_${props.attribute.name}`
                        }
                        onChange={(e) => {
                          const newValue = e.target.value;
                          const newOptions = optionsWithKeys.map((item, i) =>
                            i === index ? { ...item, value: newValue } : item,
                          );
                          emitOptionsUpdate(newOptions);
                        }}
                      />
                    </div>
                    <ValidationError>
                      {
                        formatError(
                          props.attribute.value,
                          props.attribute.error,
                        )?.[`${index}`]?._errors?.[0]
                      }
                    </ValidationError>
                  </div>
                )}
              </SortableItem>
            ))}
          </SortableList>

          {attributeError && (
            <div>
              <ValidationError>{attributeError}</ValidationError>
            </div>
          )}
          {!attributeError && missingRequired && (
            <ValidationError>At least one option is required.</ValidationError>
          )}
        </div>
      </>
    );
  },
);
