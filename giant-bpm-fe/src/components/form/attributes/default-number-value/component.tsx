import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@coltorapps/builder-react";

import { defaultNumberValueAttribute } from "./definition";
import CodeToggle from "@ui/code-toggle";
import { useCodeBuilder } from "@/hooks/useCode/useCodeBuilder";
import CodeEditButton from "@ui/button/code-edit-button";

export const DEFAULT_NUMBER_VALUE_UPDATED_EVENT = "default-number-updated";
export type DefaultNumberUpdatedDetail = {
  entityId?: string;
  value?: number;
};

export const DefaultNumberValueAttribute = createAttributeComponent(
  defaultNumberValueAttribute,
  function DefaultNumberValueAttribute(props) {
    const [localError, setLocalError] = useState<string | undefined>(undefined);
    const { validateReference } = useCodeBuilder();
    const [expressionError, setExpressionError] = useState<string | undefined>(
      undefined,
    );
    const attributeValue = props.attribute.value ?? {
      isReference: false,
      value: undefined,
      reference: "",
    };

    const min = props.entity.attributes.min as number | undefined;
    const max = props.entity.attributes.max as number | undefined;
    const decimalDigits = useMemo(() => {
      const raw = props.entity.attributes.decimalDigits as
        | number
        | string
        | undefined;
      const parsed =
        typeof raw === "string" ? Number(raw) : (raw as number | undefined);
      return Number.isFinite(parsed)
        ? Math.max(0, Math.min(20, Math.floor(Number(parsed))))
        : undefined;
    }, [props.entity.attributes.decimalDigits]);

    const errorMessage =
      expressionError ||
      localError ||
      formatError(props.attribute.value, props.attribute.error)?._errors?.[0];

    const validateValue = (nextValue?: number) => {
      if (nextValue === undefined || Number.isNaN(nextValue)) {
        setLocalError(undefined);
        return;
      }

      if (typeof min === "number" && nextValue < min) {
        setLocalError(`Value must be greater than or equal to ${min}`);
        return;
      }

      if (typeof max === "number" && nextValue > max) {
        setLocalError(`Value must be less than or equal to ${max}`);
        return;
      }

      if (typeof decimalDigits === "number" && decimalDigits >= 0) {
        const [, decimals = ""] = nextValue.toString().split(".");
        if (decimals.length > decimalDigits) {
          setLocalError(
            `Maximum ${decimalDigits} decimal place${
              decimalDigits === 1 ? "" : "s"
            } allowed`,
          );
          return;
        }
      }

      setLocalError(undefined);
    };

    useEffect(() => {
      if (attributeValue.isReference) {
        setLocalError(undefined);
        return;
      }
      validateValue(
        typeof attributeValue.value === "number"
          ? attributeValue.value
          : undefined,
      );
    }, [
      attributeValue.isReference,
      attributeValue.value,
      min,
      max,
      decimalDigits,
    ]);

    return (
      <div>
        <div className="flex flex-row items-center justify-between pb-1.5">
          <Label htmlFor={props.attribute.name}>Default Value</Label>
          <CodeToggle
            value={attributeValue.isReference ? "code" : "manual"}
            onChange={(value) => {
              setExpressionError(undefined);
              setLocalError(undefined);
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
          <Input
            id={props.attribute.name}
            name={props.attribute.name}
            type="number"
            value={
              attributeValue.value === undefined
                ? ""
                : String(attributeValue.value)
            }
            onChange={(e) => {
              const nextValue = e.target.value
                ? parseFloat(e.target.value)
                : undefined;
              validateValue(nextValue);
              props.setValue({ ...attributeValue, value: nextValue });
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent<DefaultNumberUpdatedDetail>(
                    DEFAULT_NUMBER_VALUE_UPDATED_EVENT,
                    {
                      detail: { entityId: props.entity?.id, value: nextValue },
                    },
                  ),
                );
              }
            }}
            placeholder="0"
          />
        )}
        <ValidationError>{errorMessage}</ValidationError>
      </div>
    );
  },
);
