import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@coltorapps/builder-react";

import { defaultOptionValueAttribute } from "./definition";
import { useEffect, useState } from "react";
import { OptionType } from "@/types/domain";
import {
  type OptionsUpdatedPayload,
  getOptionsUpdatedEventName,
} from "../options/component";
import { Select } from "@ui/select";
import CodeToggle from "@ui/code-toggle";
import { useCodeBuilder } from "@/hooks/useCode/useCodeBuilder";
import CodeEditButton from "@ui/button/code-edit-button";

const noneOption: OptionType = {
  label: "none",
  value: "",
  key: "none",
};

export const DefaultOptionValueAttribute = createAttributeComponent(
  defaultOptionValueAttribute,
  function DefaultOptionValueAttribute(props) {
    const { validateReference } = useCodeBuilder();
    const [expressionError, setExpressionError] = useState<string | undefined>(
      undefined,
    );
    const attributeValue = props.attribute.value ?? {
      isReference: false,
      value: undefined,
      reference: "",
    };
    const selectedValue =
      typeof attributeValue.value === "string"
        ? attributeValue.value
        : undefined;
    const [options, setOptions] = useState<OptionType[]>(
      () => (props.entity.attributes.options as OptionType[]) ?? [],
    );

    useEffect(() => {
      setOptions((props.entity.attributes.options as OptionType[]) ?? []);
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
          const newOptions = event.detail.options as OptionType[];
          const stillExists = selectedValue
            ? newOptions.some((opt) => opt.value === selectedValue)
            : true;

          if (!stillExists) {
            props.setValue({ isReference: false, value: undefined });
          }

          setOptions(newOptions);
        }
      };
      const listener = handler as EventListener;
      const eventName = getOptionsUpdatedEventName(props.entity?.id);
      window.addEventListener(eventName, listener);
      return () => window.removeEventListener(eventName, listener);
    }, [props.entity?.id]);

    return (
      <div>
        <div className="flex flex-row items-center justify-between pb-1.5">
          <Label htmlFor={props.attribute.name}>Default Value</Label>
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
            trigger={attributeValue.reference}
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
          <Select
            mode="single"
            options={[noneOption, ...options]}
            value={selectedValue}
            placeholder="Default Value"
            name={props.attribute.name}
            onChange={(value) => {
              setExpressionError(undefined);
              props.setValue({
                isReference: false,
                value: value || undefined,
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
