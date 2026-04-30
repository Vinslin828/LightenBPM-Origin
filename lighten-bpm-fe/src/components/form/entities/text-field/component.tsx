import { useId, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createEntityComponent } from "@coltorapps/builder-react";

import { textFieldEntity } from "./definition";
import { useRefWithErrorFocus } from "@/utils/error-focus";
import { useFieldValidationState } from "@/hooks/useFieldValidationState";
import { cn } from "@/utils/cn";
import { HideIcon } from "@/components/icons";

export const TextFieldEntity = createEntityComponent(
  textFieldEntity,
  function TextFieldEntity(props) {
    const id = useId();
    const { localError, isValidating, validateAndCommit } =
      useFieldValidationState(props.entity.id);
    const inputRef = useRefWithErrorFocus<HTMLInputElement>(props.entity.error);

    const handleValidation = async (nextValue?: string) => {
      await validateAndCommit({
        value: nextValue,
        setValue: props.setValue,
        validator: props.entity.attributes.validator,
        isRequiredInvalid: (value) =>
          Boolean(
            props.entity.attributes.required && (value ?? "").trim() === "",
          ),
        requiredMessage: "This field is required",
        onValidationSuccess: props.resetError,
      });
    };

    const defaultValueAttr = props.entity.attributes.defaultValue;
    const defaultValue = useMemo(() => {
      if (typeof defaultValueAttr === "string") {
        return defaultValueAttr;
      }
      if (
        defaultValueAttr &&
        typeof defaultValueAttr === "object" &&
        "value" in defaultValueAttr
      ) {
        const value = (defaultValueAttr as { value?: unknown }).value;
        if (value === undefined || value === null) {
          return "";
        }
        if (typeof value === "string") {
          return value;
        }
        return String(value);
      }
      return "";
    }, [defaultValueAttr]);

    const displayValue =
      props.entity.value === undefined || props.entity.value === null
        ? defaultValue
        : typeof props.entity.value === "string"
          ? props.entity.value
          : String(props.entity.value);
    const errorMessage =
      localError ||
      formatError(props.entity.value, props.entity.error)?._errors?.[0];

    const placeholder = useMemo(
      () => props.entity.attributes.placeholder,
      [props.entity.attributes.placeholder],
    );

    return (
      <div className={cn("w-full")}>
        <Label htmlFor={id} aria-required={props.entity.attributes.required}>
          {!!props.entity.attributes.label.value
            ? props.entity.attributes.label.value
            : props.entity.attributes.name}
        </Label>

        <Input
          ref={inputRef}
          id={id}
          name={props.entity.attributes.name || props.entity.id}
          type={props.entity.attributes.inputType || "text"}
          value={displayValue}
          onChange={(e) => {
            // handleValidation(e.target.value);
            props.setValue(e.target.value);
          }}
          placeholder={
            typeof placeholder === "string" ? placeholder : placeholder.value
          }
          onBlur={(e) => {
            void handleValidation(e.target.value);
          }}
          required={props.entity.attributes.required}
          disabled={props.entity.attributes.disabled}
          readOnly={props.entity.attributes.readonly}
          className={errorMessage ? "border-red-500" : ""}
        />

        {isValidating ? (
          <p className="text-sm mt-1 text-secondary-text">
            Running validation…
          </p>
        ) : errorMessage ? (
          <ValidationError>{errorMessage}</ValidationError>
        ) : null}
      </div>
    );
  },
);
