import { createEntityComponent } from "@coltorapps/builder-react";

import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { cn } from "@/utils/cn";
import { useRefWithErrorFocus } from "@/utils/error-focus";
import { useFieldValidationState } from "@/hooks/useFieldValidationState";

import { datePickerFieldEntity } from "./definition";
import { useId } from "react";
import { DatePicker, DateTimePicker, TimePicker } from "@ui/datetime-selector";

export const DatePickerFieldEntity = createEntityComponent(
  datePickerFieldEntity,
  function DatePickerFieldEntity(props) {
    const inputRef = useRefWithErrorFocus<HTMLInputElement>(props.entity.error);
    const { localError, isValidating, validateAndCommit } =
      useFieldValidationState(props.entity.id);

    const hasError =
      !!localError ||
      !!formatError(props.entity.value, props.entity.error)?._errors?.[0] ||
      false;

    const id = useId();

    const subtype =
      (props.entity.attributes.dateSubtype as
        | "date"
        | "time"
        | "datetime"
        | undefined) ?? "date";
    const customPlaceholder = (
      props.entity.attributes as Record<string, unknown>
    )?.placeholder;
    const resolvedPlaceholder =
      typeof customPlaceholder === "string" && customPlaceholder.trim()
        ? customPlaceholder
        : subtype === "time"
          ? "hh:mm"
          : subtype === "datetime"
            ? "yyyy/mm/dd hh:mm"
            : "yyyy/mm/dd";

    const defaultValueAttr = props.entity.attributes.defaultValue;
    const defaultValue =
      typeof defaultValueAttr === "number"
        ? defaultValueAttr
        : defaultValueAttr &&
            typeof defaultValueAttr === "object" &&
            "value" in defaultValueAttr &&
            typeof (defaultValueAttr as { value?: unknown }).value === "number"
          ? (defaultValueAttr as { value: number }).value
          : undefined;
    const value =
      typeof props.entity.value === "number"
        ? props.entity.value
        : defaultValue;

    const errorMessage =
      localError ||
      formatError(props.entity.value, props.entity.error)?._errors?.[0];

    const handleValidation = async (timestamp?: number) => {
      if (props.entity.attributes.readonly) return;
      await validateAndCommit({
        value: timestamp,
        setValue: props.setValue,
        validator: props.entity.attributes.validator,
        isRequiredInvalid: (value) =>
          Boolean(props.entity.attributes.required && !value),
        requiredMessage: "This field is required",
        onValidationSuccess: props.resetError,
      });
    };

    const renderPicker = () => {
      const pickerProps = {
        ref: inputRef,
        id,
        name: props.entity.attributes.name ?? props.entity.id,
        disabled: props.entity.attributes.disabled,
        readonly: props.entity.attributes.readonly,
        required: props.entity.attributes.required,
        value,
        onFocus: () => {
          void handleValidation(value);
        },
        onChange: (timestamp?: number) => {
          void handleValidation(timestamp);
        },
        error: hasError,
        placeholder: resolvedPlaceholder,
        className: cn(
          "w-full",
          // hasError && "ring-2 ring-offset-1 ring-red-500",
        ),
      };

      switch (subtype) {
        case "time":
          return <TimePicker {...pickerProps} />;
        case "datetime":
          return <DateTimePicker {...pickerProps} />;
        case "date":
        default:
          return <DatePicker {...pickerProps} />;
      }
    };

    return (
      <div className="w-full">
        <Label aria-required={props.entity.attributes.required} htmlFor={id}>
          {!!props.entity.attributes.label.value
            ? props.entity.attributes.label.value
            : props.entity.attributes.name}
        </Label>
        <div>{renderPicker()}</div>
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
