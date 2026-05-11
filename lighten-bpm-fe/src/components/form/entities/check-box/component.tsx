import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatError } from "@/components/ui/validation-error";
import { ValidationError } from "@/components/ui/validation-error";

import { createEntityComponent } from "@coltorapps/builder-react";

import { checkboxFieldEntity } from "./definition";
import { useId } from "react";
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

export const CheckboxFieldEntity = createEntityComponent(
  checkboxFieldEntity,
  function CheckboxFieldEntity(props) {
    const parseStringArray = (raw: unknown): string[] | null => {
      if (typeof raw !== "string") return null;
      try {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed) &&
          parsed.every((item) => typeof item === "string")
        ) {
          return parsed;
        }
      } catch {
        return null;
      }
      return null;
    };

    const normalizeValues = (raw: unknown): string[] | undefined => {
      if (raw && typeof raw === "object" && "isReference" in raw) {
        const record = raw as {
          isReference?: boolean;
          value?: unknown;
          reference?: unknown;
        };
        if (record.value !== undefined) {
          return normalizeValues(record.value);
        }
        if (record.isReference) {
          const parsed = parseStringArray(record.reference);
          return parsed ?? undefined;
        }
        return normalizeValues(record.value);
      }
      const parsed = parseStringArray(raw);
      if (parsed) return parsed;
      if (typeof raw === "string") {
        return [raw];
      }
      return Array.isArray(raw)
        ? raw
            .map((item) => {
              if (typeof item === "string") return item;
              if (
                item &&
                typeof item === "object" &&
                "value" in (item as Record<string, unknown>)
              ) {
                const val = (item as Record<string, unknown>).value;
                return typeof val === "string" ? val : undefined;
              }
              return undefined;
            })
            .filter((val): val is string => typeof val === "string")
        : [];
    };

    const baseId = useId();
    const userValues = normalizeValues(props.entity.value);
    const defaultValues = normalizeValues(props.entity.attributes.defaultValue);
    const hasUserValue =
      props.entity.value !== undefined && props.entity.value !== null;
    const effectiveValues = hasUserValue ? userValues : defaultValues;
    const isRequired = props.entity.attributes.required;
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

    const handleValidation = async (nextValues: string[]) => {
      await validateAndCommit({
        value: nextValues,
        setValue: props.setValue,
        validator: props.entity.attributes.validator,
        isRequiredInvalid: (value) => Boolean(isRequired && value.length === 0),
        requiredMessage: "At least one option must be selected",
        onValidationSuccess: props.resetError,
      });
    };

    const handleCheckboxChange = async (
      optionValue: string,
      checked: boolean,
    ) => {
      if (
        props.entity.attributes.readonly ||
        props.entity.attributes.disabled
      ) {
        return;
      }

      const baseValues = effectiveValues ?? [];
      const isCurrentlySelected = baseValues.includes(optionValue);

      if (checked && !isCurrentlySelected) {
        await handleValidation([...baseValues, optionValue]);
      } else if (!checked && isCurrentlySelected) {
        await handleValidation(baseValues.filter((v) => v !== optionValue));
      }
    };

    const options = props.entity.attributes.options || [];
    const errorMessage =
      localError ||
      formatError(props.entity.value, props.entity.error)?._errors?.[0];

    return (
      <div>
        <Label
          className="text-sm font-medium mb-2 block"
          aria-required={props.entity.attributes.required}
        >
          {label}
        </Label>
        <div className="space-y-4">
          {options.length > 0 ? (
            options.map((option, index) => {
              const checkboxId = `${baseId}-${index}`;
              const isChecked = effectiveValues?.includes(option.value);
              const optionLabel = resolveEntityLabel(
                getOptionTranslationKey(props.entity.id, option.value),
                option.label,
                labelTranslations,
                defaultLang,
                i18n.language,
                [getOptionTranslationKey(entityTranslationKey, option.value)],
              );

              return (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={checkboxId}
                    name={props.entity.attributes.name || props.entity.id}
                    checked={isChecked}
                    readonly={Boolean(props.entity.attributes.readonly)}
                    disabled={Boolean(props.entity.attributes.disabled)}
                    onCheckedChange={(checked) =>
                      void handleCheckboxChange(option.value, checked === true)
                    }
                    className={
                      formatError(props.entity.value, props.entity.error)
                        ?._errors?.[0]
                        ? "border-red-500"
                        : ""
                    }
                  />
                  <label
                    htmlFor={checkboxId}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {optionLabel}
                  </label>
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground text-sm">
              No options available
            </p>
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
