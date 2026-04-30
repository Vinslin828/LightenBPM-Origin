import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@coltorapps/builder-react";

import { defaultMultiOptionValueAttribute } from "./definition";
import { useEffect, useMemo, useState } from "react";
import { OptionType } from "@/types/domain";
import { MultiSelect } from "@ui/select/multi-select";
import {
  type OptionsUpdatedPayload,
  getOptionsUpdatedEventName,
} from "../options/component";
import CodeToggle from "@ui/code-toggle";
import { useCodeBuilder } from "@/hooks/useCode/useCodeBuilder";
import CodeEditButton from "@ui/button/code-edit-button";

export const DefaultMultiOptionValueAttribute = createAttributeComponent(
  defaultMultiOptionValueAttribute,
  function DefaultMultiOptionValueAttribute(props) {
    const { validateReference } = useCodeBuilder();
    const [expressionError, setExpressionError] = useState<string | undefined>(
      undefined,
    );
    const attributeValue = props.attribute.value ?? {
      isReference: false,
      value: undefined,
      reference: "",
    };
    const selectedOptions = Array.isArray(attributeValue.value)
      ? (attributeValue.value as OptionType[])
      : [];
    const [options, setOptions] = useState<OptionType[]>(() =>
      ((props.entity.attributes.options as OptionType[]) ?? []).map(
        (option) => ({
          label: option.label,
          value: option.value,
          key: option.key,
        }),
      ),
    );

    useEffect(() => {
      setOptions(
        ((props.entity.attributes.options as OptionType[]) ?? []).map(
          (option) => ({
            label: option.label,
            value: option.value,
            key: option.key,
          }),
        ),
      );
    }, [props.entity.attributes.options]);

    useEffect(() => {
      const handler = (event: CustomEvent<OptionsUpdatedPayload>) => {
        if (
          event.detail?.entityId &&
          event.detail.entityId !== props.entity?.id
        ) {
          return;
        }
        if (event.detail?.options) {
          console.debug(
            "[default-multi-option] options updated",
            props.entity.id,
            event.detail.options,
          );
          const newOptions = event.detail.options.map((option) => ({
            label: option.label,
            value: option.value,
            key: option.key,
          }));

          setOptions(newOptions);
          if (attributeValue.isReference) {
            return;
          }

          const validSelected = selectedOptions.filter((selected) =>
            newOptions.some((opt) => opt.value === selected.value),
          );

          if (validSelected.length !== selectedOptions.length) {
            props.setValue({ isReference: false, value: validSelected });
          }
        }
      };
      const listener = handler as EventListener;
      const eventName = getOptionsUpdatedEventName(props.entity?.id);
      window.addEventListener(eventName, listener);
      return () => window.removeEventListener(eventName, listener);
    }, [attributeValue.isReference, props.entity?.id, selectedOptions]);

    const placeholder = useMemo(
      () => props.entity.attributes.placeholder,
      [props.entity.attributes.placeholder],
    );

    return (
      <div>
        <div className="flex flex-row items-center justify-between pb-1.5">
          <Label htmlFor={props.attribute.name}>Default Values</Label>
          <CodeToggle
            value={attributeValue.isReference ? "code" : "manual"}
            onChange={(value) => {
              setExpressionError(undefined);
              props.setValue({
                isReference: value === "code",
                value: undefined,
                reference: "",
              });
            }}
          />
        </div>
        {attributeValue.isReference ? (
          <CodeEditButton
            variant="reference"
            value={String(attributeValue.reference ?? "")}
            trigger={
              typeof attributeValue.reference === "string"
                ? attributeValue.reference
                : ""
            }
            onSave={(nextValue) => {
              const result = validateReference(nextValue);
              if (!result.isValid) {
                setExpressionError(result.errors[0]);
                return;
              }
              setExpressionError(undefined);
              props.setValue({
                ...attributeValue,
                reference: nextValue,
              });
            }}
          />
        ) : (
          <MultiSelect
            options={options}
            value={selectedOptions.map((opt) => opt.value)}
            placeholder="Default Values"
            name={props.attribute.name}
            onChange={(values: string[]) => {
              setExpressionError(undefined);
              props.setValue({
                isReference: false,
                value: options.filter((option) =>
                  values.includes(option.value),
                ),
              });
            }}
          />
        )}
        <ValidationError>
          {expressionError ??
            formatError(props.attribute.value, props.attribute.error)
              ?._errors?.[0]}
        </ValidationError>
      </div>
    );
  },
);
