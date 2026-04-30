import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createEntityComponent } from "@coltorapps/builder-react";
import { toggleFieldEntity } from "./definition";
import { useFieldValidationState } from "@/hooks/useFieldValidationState";

export const ToggleFieldEntity = createEntityComponent(
  toggleFieldEntity,
  function ToggleFieldEntity(props) {
    const { localError, isValidating, validateAndCommit } =
      useFieldValidationState(props.entity.id);

    const errorMessage =
      localError ||
      formatError(props.entity.value, props.entity.error)?._errors?.[0];

    const handleValidation = async (pressed?: boolean) => {
      if (props.entity.attributes.readonly || props.entity.attributes.disabled) {
        return;
      }
      await validateAndCommit({
        value: pressed,
        setValue: props.setValue,
        validator: props.entity.attributes.validator,
        isRequiredInvalid: (value) =>
          Boolean(props.entity.attributes.required && value !== true),
        requiredMessage: "This field is required",
        onValidationSuccess: props.resetError,
      });
    };

    // console.debug(
    //   props.entity.attributes.label,
    //   props.entity.value,
    //   props.entity.attributes.defaultValue,
    //   {
    //     finalValue:
    //       typeof props.entity.value === "boolean"
    //         ? props.entity.value
    //         : props.entity.attributes.defaultValue,
    //   },
    //   typeof props.entity.value,
    // );

    return (
      <div className="flex flex-col">
        <Label
          aria-required={props.entity.attributes.required}
          className="block mb-2"
        >
          {!!props.entity.attributes.label.value
            ? props.entity.attributes.label.value
            : props.entity.attributes.name}
        </Label>
        <Toggle
          pressed={
            typeof props.entity.value === "boolean"
              ? props.entity.value
              : typeof props.entity.attributes.defaultValue === "boolean"
                ? props.entity.attributes.defaultValue
                : props.entity.attributes.defaultValue &&
                    typeof props.entity.attributes.defaultValue === "object" &&
                    "value" in props.entity.attributes.defaultValue &&
                    typeof (
                      props.entity.attributes.defaultValue as {
                        value?: unknown;
                      }
                    ).value === "boolean"
                  ? (props.entity.attributes.defaultValue as { value: boolean })
                      .value
                  : false
          }
          onPressedChange={(pressed) => {
            void handleValidation(pressed ?? false);
          }}
          readonly={Boolean(props.entity.attributes.readonly)}
          disabled={Boolean(props.entity.attributes.disabled)}
          aria-label={props.entity.attributes.label}
          className={errorMessage ? "border-red-500" : ""}
        />
        {isValidating ? (
          <p className="text-sm mt-1 text-secondary-text">Running validation...</p>
        ) : errorMessage ? (
          <ValidationError>{errorMessage}</ValidationError>
        ) : null}
      </div>
    );
  },
);
