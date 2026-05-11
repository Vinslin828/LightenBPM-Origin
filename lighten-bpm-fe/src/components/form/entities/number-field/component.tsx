import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createEntityComponent } from "@coltorapps/builder-react";

import { numberFieldEntity } from "./definition";
import { useRefWithErrorFocus } from "@/utils/error-focus";
import { useFieldValidationState } from "@/hooks/useFieldValidationState";
import { useEntityLabel } from "@/hooks/useEntityLabel";

export const NumberFieldEntity = createEntityComponent(
  numberFieldEntity,
  function NumberFieldEntity(props) {
    const id = useId();
    const [touched, setTouched] = useState(false);

    const inputRef = useRefWithErrorFocus<HTMLInputElement>(props.entity.error);
    const label = useEntityLabel(
      props.entity.id,
      props.entity.attributes.label.value || props.entity.attributes.name,
      props.entity.attributes.name,
    );

    const { localError, isValidating, validateAndCommit, setLocalError } =
      useFieldValidationState(props.entity.id);

    const { attributes } = props.entity;
    const { decimalDigits, step } = attributes;

    let stepValue = step;
    if (
      stepValue === undefined &&
      decimalDigits !== undefined &&
      decimalDigits !== null
    ) {
      if (decimalDigits === 0) {
        stepValue = 1;
      } else {
        stepValue = 1 / 10 ** decimalDigits;
      }
    }

    const handleValidation = async (nextValue?: number) => {
      const { min, max, decimalDigits: digitsAttr } = props.entity.attributes;

      // Do not pass setValue here — the field already sets the value via onChange.
      // Passing setValue would trigger a second EntityValueUpdated event after
      // validation completes (via commitMode "before"), causing a feedback loop.
      const nextError = await validateAndCommit({
        value: nextValue,
        validator: props.entity.attributes.validator,
        isRequiredInvalid: (value) =>
          Boolean(
            props.entity.attributes.required &&
              (value === undefined || Number.isNaN(value)),
          ),
        requiredMessage: "This field is required",
        onValidationSuccess: props.resetError,
      });

      if (typeof nextValue === "number" && !Number.isNaN(nextValue)) {
        if (typeof min === "number" && nextValue < min) {
          setLocalError(`Value must be greater than or equal to ${min}`);
          return;
        }
        if (typeof max === "number" && nextValue > max) {
          setLocalError(`Value must be less than or equal to ${max}`);
          return;
        }
        if (
          typeof digitsAttr === "number" &&
          digitsAttr >= 0 &&
          nextValue.toString().includes(".")
        ) {
          const [, decimals = ""] = nextValue.toString().split(".");
          if (decimals.length > digitsAttr) {
            setLocalError(
              `Maximum ${digitsAttr} decimal place${
                digitsAttr === 1 ? "" : "s"
              } allowed`,
            );
            return;
          }
        }
      }

      if (!nextError) {
        props.resetError();
      }
    };

    const handleBlur = async () => {
      const { value } = props.entity;

      await handleValidation(value);

      // if (
      //   typeof value === "number" &&
      //   decimalDigits !== undefined &&
      //   decimalDigits !== null
      // ) {
      //   const roundedValue = parseFloat(value.toFixed(decimalDigits));
      //   if (value !== roundedValue) {
      //     handleValidation(roundedValue);
      //   }
      // }
    };

    const defaultValueAttr = props.entity.attributes.defaultValue;
    const defaultValue =
      typeof defaultValueAttr === "number"
        ? defaultValueAttr
        : defaultValueAttr &&
            typeof defaultValueAttr === "object" &&
            "value" in defaultValueAttr &&
            typeof defaultValueAttr.value === "number"
          ? defaultValueAttr.value
          : undefined;
    const displayValue =
      !touched && props.entity.value === undefined
        ? (defaultValue ?? "")
        : (props.entity.value ?? "");

    const errorMessage =
      localError ||
      formatError(props.entity.value, props.entity.error)?._errors?.[0];

    return (
      <div className="w-full">
        <Label htmlFor={id} aria-required={props.entity.attributes.required}>
          {label}
        </Label>
        <Input
          ref={inputRef}
          id={id}
          name={props.entity.attributes.name}
          type="number"
          value={displayValue}
          onChange={(e) => {
            const val = e.target.value;
            setTouched(true);
            props.setValue(
              e.target.value === "" ? undefined : Number(e.target.value),
            );
            // handleValidation(parsed);
          }}
          onBlur={() => void handleBlur()}
          placeholder="0"
          min={props.entity.attributes.min}
          max={props.entity.attributes.max}
          step={stepValue}
          required={props.entity.attributes.required}
          className={errorMessage ? "border-red-500" : ""}
          readOnly={props.entity.attributes.readonly}
          disabled={props.entity.attributes.disabled}
        />
        {isValidating ? (
          <p className="text-sm mt-1 text-secondary-text">
            Running validation...
          </p>
        ) : errorMessage ? (
          <ValidationError>{errorMessage}</ValidationError>
        ) : null}
      </div>
    );
  },
);
