import { createEntityComponent } from "@coltorapps/builder-react";
import { useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { cn } from "@/utils/cn";
import { useRefWithErrorFocus } from "@/utils/error-focus";
import { radioButtonEntity } from "./definition";
import { OptionType } from "@/types/domain";
import { useFieldValidationState } from "@/hooks/useFieldValidationState";
import {
  getEntityTranslationKey,
  getOptionTranslationKey,
  resolveEntityLabel,
  useEntityLabel,
} from "@/hooks/useEntityLabel";
import { useAtomValue } from "jotai";
import { formSettingAtom } from "@/store";
import { useTranslation } from "react-i18next";

export const RadioButtonEntity = createEntityComponent(
  radioButtonEntity,
  function RadioButtonEntity(props) {
    const radioGroupRef = useRefWithErrorFocus<HTMLDivElement>(
      props.entity.error,
    );

    const { localError, isValidating, validateAndCommit } =
      useFieldValidationState(props.entity.id);
    const { defaultLang, labelTranslations } = useAtomValue(formSettingAtom);
    const { i18n } = useTranslation();
    const entityTranslationKey = getEntityTranslationKey(
      props.entity.id,
      props.entity.attributes,
    );
    const label = useEntityLabel(
      props.entity.id,
      props.entity.attributes.label.value || props.entity.attributes.name,
      entityTranslationKey,
    );

    // console.debug("error", props.entity.error);

    const errorMessage =
      localError ||
      formatError(props.entity.value, props.entity.error)?._errors?.[0];

    const options = props.entity.attributes.options;
    const translatedOptions = options.map((option) => ({
      ...option,
      label: resolveEntityLabel(
        getOptionTranslationKey(props.entity.id, option.value),
        option.label,
        labelTranslations,
        defaultLang,
        i18n.language,
        [getOptionTranslationKey(entityTranslationKey, option.value)],
      ),
    }));

    const userValue =
      typeof props.entity.value === "string"
        ? props.entity.value
        : (props.entity.value as OptionType | undefined)?.value;
    const defaultValueAttr = props.entity.attributes.defaultValue;
    const defaultValue = useMemo(() => {
      if (typeof defaultValueAttr === "string") {
        return defaultValueAttr;
      } else if (!!defaultValueAttr && "value" in defaultValueAttr) {
        if (typeof defaultValueAttr.value === "string") {
          return defaultValueAttr.value;
        } else {
          return JSON.stringify(defaultValueAttr.value);
        }
      } else {
        return undefined;
      }
    }, [defaultValueAttr]);

    const effectiveValue = userValue ?? defaultValue ?? "";
    const direction =
      (props.entity.attributes.groupDirection as "horizontal" | "vertical") ??
      "vertical";

    console.debug({ defaultValueAttr, defaultValue });

    const handleValidation = async (val?: string) => {
      if (props.entity.attributes.readonly) {
        return;
      }
      await validateAndCommit({
        value: val,
        setValue: (next) => props.setValue(next || undefined),
        validator: props.entity.attributes.validator,
        isRequiredInvalid: (value) =>
          Boolean(props.entity.attributes.required && !value),
        requiredMessage: "This field is required",
        onValidationSuccess: props.resetError,
      });
    };

    return (
      <div>
        <Label
          aria-required={props.entity.attributes.required}
          className="mb-2 block"
        >
          {label}
        </Label>

        <div
          className={
            props.entity.attributes.readonly
              ? "pointer-events-none select-none"
              : undefined
          }
        >
          {options.length > 0 ? (
            <RadioGroup
              ref={radioGroupRef}
              name={props.entity.id}
              value={effectiveValue}
              onChange={(val) => {
                void handleValidation(val);
              }}
              options={translatedOptions}
              className={cn(
                "flex gap-4",
                direction === "horizontal" ? "flex-row flex-wrap" : "flex-col",
              )}
              disabled={props.entity.attributes.disabled}
            />
          ) : (
            <div ref={radioGroupRef}>
              <p className="text-sm text-muted-foreground">
                No options available
              </p>
            </div>
          )}
        </div>
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
