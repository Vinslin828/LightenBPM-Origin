import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@coltorapps/builder-react";

import { useEffect, useMemo } from "react";
import { OptionType } from "@/types/domain";
import { defaultArrayValueAttribute } from "./definition";
import { MultiSelect } from "@ui/select/multi-select";

export const DefaultArrayValueAttribute = createAttributeComponent(
  defaultArrayValueAttribute,
  function DefaultArrayValueAttribute(props) {
    const normalizeValues = (raw: unknown): string[] =>
      Array.isArray(raw)
        ? raw
            .map((item) => {
              if (typeof item === "string") return item;
              if (
                item &&
                typeof item === "object" &&
                "value" in (item as Record<string, unknown>)
              ) {
                const val = (item as Record<string, unknown>).value;
                return typeof val === "string" ? val : undefined;
              }
              return undefined;
            })
            .filter((val): val is string => typeof val === "string")
        : [];

    const selectedValues = normalizeValues(props.attribute.value);
    const options = useMemo(
      () =>
        (props.entity.attributes.options as OptionType[])?.map((option) => ({
          label: option.label,
          value: option.value,
          key: option.value,
        })) ?? [],
      [props.entity.attributes.options],
    );

    useEffect(() => {
      if (selectedValues.length > 0) {
        const validSelectedValues = selectedValues.filter((value) =>
          options.some((opt) => opt.value === value),
        );

        if (validSelectedValues.length !== selectedValues.length) {
          props.setValue(
            validSelectedValues.length > 0 ? validSelectedValues : undefined,
          );
        }
      }
    }, [options, selectedValues, props.setValue]);

    return (
      <div>
        <Label htmlFor={props.attribute.name}>Default Value</Label>
        <MultiSelect
          options={options}
          value={selectedValues}
          placeholder="Default Value"
          name={props.attribute.name}
          onChange={(values: string[]) => {
            props.setValue(values.length > 0 ? values : undefined);
          }}
        />
        <ValidationError>
          {
            formatError(props.attribute.value, props.attribute.error)
              ?._errors?.[0]
          }
        </ValidationError>
      </div>
    );
  },
);
