import { useId, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createEntityComponent } from "@coltorapps/builder-react";

import { textareaFieldEntity } from "./definition";
import { useRefWithErrorFocus } from "@/utils/error-focus";
import { useFieldValidationState } from "@/hooks/useFieldValidationState";
import { useEntityLabel } from "@/hooks/useEntityLabel";

export const TextareaFieldEntity = createEntityComponent(
  textareaFieldEntity,
  function TextareaFieldEntity(props) {
    const id = useId();
    const { localError, isValidating, validateAndCommit } =
      useFieldValidationState(props.entity.id);

    const inputRef = useRefWithErrorFocus<HTMLTextAreaElement>(
      props.entity.error,
    );
    const label = useEntityLabel(
      props.entity.id,
      props.entity.attributes.label.value || props.entity.attributes.name,
      props.entity.attributes.name,
    );

    const handleValidation = async (nextValue?: string) => {
      // Do not pass setValue here — the field already sets the value via onChange.
      // Passing setValue would trigger a second EntityValueUpdated event after
      // validation completes (via commitMode "before"), causing a feedback loop.
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

    const defaultValue =
      typeof defaultValueAttr === "string"
        ? defaultValueAttr
        : defaultValueAttr &&
            typeof defaultValueAttr === "object" &&
            "value" in defaultValueAttr
          ? String((defaultValueAttr as { value?: unknown }).value ?? "")
          : "";
    const displayValue =
      props.entity.value === undefined
        ? defaultValue
        : (props.entity.value ?? "");
    const errorMessage =
      localError ||
      formatError(props.entity.value, props.entity.error)?._errors?.[0];

    // console.debug({ defaultValueAttr, defaultValue }, props.entity.attributes);

    const placeholder = useMemo(
      () => props.entity.attributes.placeholder,
      [props.entity.attributes.placeholder],
    );

    return (
      <div className="w-full">
        <Label htmlFor={id} aria-required={props.entity.attributes.required}>
          {label}
        </Label>

        <Textarea
          id={id}
          ref={inputRef}
          name={props.entity.attributes.name}
          value={displayValue}
          onChange={(e) => props.setValue(e.target.value)}
          onBlur={(e) => void handleValidation(e.target.value)}
          placeholder={
            typeof placeholder === "string" ? placeholder : placeholder.value
          }
          required={props.entity.attributes.required}
          disabled={props.entity.attributes.disabled}
          readOnly={props.entity.attributes.readonly}
          className={errorMessage ? "border-red-500" : ""}
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
