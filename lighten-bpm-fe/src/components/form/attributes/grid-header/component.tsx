import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { type DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { ZodError } from "zod";

import { createAttributeComponent } from "@coltorapps/builder-react";
import { gridHeaderAttribute } from "./definition";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { SortableList, SortableItem } from "@/components/ui/sortable";
import { useAtom } from "jotai";
import { selectedGridHeaderAtom } from "@/store";

type GridHeaderItem = {
  label: string;
  keyValue: string;
  key: string;
  type: "input" | "number" | "date" | "dropdown";
  subtype?: "date" | "time" | "datetime";
  placeholder?: string;
  defaultValue?: string | number;
  required: boolean;
  flowType?: ("split" | "recursive" | "others")[];
  datasource?: unknown;
};

const createGridHeader = (index: number): GridHeaderItem => ({
  label: `Column ${index + 1}`,
  keyValue: `column_${index + 1}`,
  key: uuidv4(),
  type: "input",
  placeholder: "",
  defaultValue: "",
  required: false,
  flowType: ["split"],
});

export const GridHeaderAttribute = createAttributeComponent(
  gridHeaderAttribute,
  function GridHeaderAttribute(props) {
    const formattedError = formatError(props.attribute.value, props.attribute.error);
    const attributeError =
      formattedError?._errors?.[0] ??
      (props.attribute.error instanceof Error ? props.attribute.error.message : undefined);
    const [expandedIndexes, setExpandedIndexes] = useState<number[]>([]);
    const [, setSelectedHeader] = useAtom(selectedGridHeaderAtom);

    const headers = (props.attribute.value ?? []) as GridHeaderItem[];
    const missingRequired = headers.length === 0;

    const emitHeadersUpdate = (nextHeaders: GridHeaderItem[]) => {
      props.setValue(nextHeaders as typeof props.attribute.value);
    };

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = headers.findIndex(
          (header) => header.key === active.id,
        );
        const newIndex = headers.findIndex((header) => header.key === over.id);

        if (oldIndex < 0 || newIndex < 0) return;

        const nextHeaders = arrayMove(headers, oldIndex, newIndex);
        emitHeadersUpdate(nextHeaders);
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
          <div className="text-xs text-white bg-lighten-blue rounded-full w-5 h-5 flex items-center justify-center">
            {headers.length}
          </div>
          <Button
            variant="ghost"
            className="p-0 cursor-pointer"
            onClick={() => {
              const nextHeaders = [
                ...headers,
                createGridHeader(headers.length),
              ];
              emitHeadersUpdate(nextHeaders);
            }}
          >
            <PlusIcon className="text-lighten-blue" />
          </Button>
        </div>

        <div className="flex flex-col gap-4">
          <SortableList
            items={headers.map((header) => ({ id: header.key }))}
            onDragEnd={handleDragEnd}
          >
            {headers.map((header, index) => (
              <SortableItem
                key={header.key}
                id={header.key}
                expanded={expandedIndexes.includes(index)}
                onExpand={() => {
                  setExpandedIndexes((prev) =>
                    prev.includes(index)
                      ? prev.filter((i) => i !== index)
                      : [...prev, index],
                  );
                }}
                onRemove={() => {
                  if (headers.length <= 1) return;
                  const nextHeaders = headers.filter((_, i) => i !== index);
                  const nextExpanded = expandedIndexes
                    .filter((i) => i !== index)
                    .map((i) => (i > index ? i - 1 : i));
                  emitHeadersUpdate(nextHeaders);
                  setExpandedIndexes(nextExpanded);
                }}
                onEdit={() => {
                  setSelectedHeader({
                    entityId: props.entity.id,
                    headerKey: header.key,
                    header: props,
                  });
                }}
                title={
                  <span className="font-medium overflow-hidden text-ellipsis whitespace-nowrap">
                    {header.label}
                  </span>
                }
              >
                {expandedIndexes.includes(index) && (
                  <div className="mt-3 space-y-4 pt-3 border-t border-[#DFE4EA]">
                    <div className="flex flex-col gap-2.5">
                      <span className="text-base font-medium text-dark">
                        Label
                      </span>
                      <Input
                        name={`${props.attribute.name}-header-${index}-label`}
                        value={header.label}
                        placeholder={`Column ${index + 1}`}
                        onChange={(e) => {
                          const nextLabel = e.target.value;
                          const nextHeaders = headers.map((item, i) =>
                            i === index ? { ...item, label: nextLabel } : item,
                          );
                          emitHeadersUpdate(nextHeaders);
                        }}
                      />
                    </div>
                    <div className="flex flex-col gap-2.5">
                      <span className="font-medium text-dark text-base">
                        Key
                      </span>
                      <Input
                        name={`${props.attribute.name}-header-${index}-key`}
                        value={header.keyValue}
                        placeholder={`column_${index + 1}`}
                        onChange={(e) => {
                          const nextKeyValue = e.target.value;
                          const nextHeaders = headers.map((item, i) =>
                            i === index
                              ? { ...item, keyValue: nextKeyValue }
                              : item,
                          );
                          emitHeadersUpdate(nextHeaders);
                        }}
                      />
                    </div>
                    <ValidationError>
                      {
                        formattedError?.[`${index}`]?.keyValue?._errors?.[0] ??
                        formattedError?.[`${index}`]?._errors?.[0] ??
                        (props.attribute.error instanceof ZodError
                          ? props.attribute.error.issues.find(
                              (issue) =>
                                issue.path[0] === index &&
                                issue.path[1] === "keyValue",
                            )?.message
                          : undefined)
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
            <ValidationError>At least one header is required.</ValidationError>
          )}
        </div>
      </>
    );
  },
);
