import { createAttributeComponent } from "@coltorapps/builder-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  decimalDigitsAttribute,
  type DecimalDigitsUpdatedDetail,
} from "./definition";
import { ValidationError } from "@/components/ui/validation-error";

export const DECIMAL_DIGITS_UPDATED_EVENT = "decimal-digits-updated";
export const getDecimalDigitsUpdatedEventName = (entityId?: string) =>
  `${DECIMAL_DIGITS_UPDATED_EVENT}-${entityId ?? "unknown"}`;

export const DecimalDigitsAttribute = createAttributeComponent(
  decimalDigitsAttribute,
  function DecimalDigitsAttribute(props) {
    const hasError =
      typeof props.attribute.value === "number" &&
      (props.attribute.value < 0 || props.attribute.value > 20);

    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={props.attribute.name}>Decimal Digits</Label>
        <Input
          id={props.attribute.name}
          name={props.attribute.name}
          type="number"
          min={0}
          max={20}
          className={hasError ? "border-red-500" : ""}
          value={props.attribute.value ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            if (value === "") {
              props.setValue(undefined);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent<DecimalDigitsUpdatedDetail>(
                    getDecimalDigitsUpdatedEventName(props.entity?.id),
                    {
                      detail: { entityId: props.entity?.id, value: undefined },
                    },
                  ),
                );
              }
              return;
            }
            const parsed = parseInt(value, 10);
            const next = Number.isNaN(parsed) ? undefined : Math.max(0, parsed);
            props.setValue(next);
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent<DecimalDigitsUpdatedDetail>(
                  getDecimalDigitsUpdatedEventName(props.entity?.id),
                  {
                    detail: { entityId: props.entity?.id, value: next },
                  },
                ),
              );
            }
          }}
          placeholder="0"
        />
        {hasError && (
          <ValidationError>
            Decimal digits must be between 0 and 20.
          </ValidationError>
        )}
      </div>
    );
  },
);
