import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createEntityComponent } from "@coltorapps/builder-react";
import { currencyFieldEntity } from "./definition";
import { useFieldValidationState } from "@/hooks/useFieldValidationState";
import { useEntityLabel } from "@/hooks/useEntityLabel";
import { extractReferencedFieldNames } from "@/hooks/useCode/utils";
import type { CurrencyCode } from "@/types/form-builder";

const ALL_CURRENCY_CODES: CurrencyCode[] = [
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "EUR",
  "GBP",
  "HKD",
  "HUF",
  "JPY",
  "KRW",
  "MXN",
  "PLN",
  "THB",
  "TWD",
  "USD",
  "VND",
];

const currencyDecimalMap: Record<string, number> = {
  AUD: 2,
  CAD: 2,
  CHF: 2,
  CNY: 2,
  EUR: 2,
  GBP: 2,
  HKD: 2,
  HUF: 2,
  JPY: 0,
  KRW: 0,
  MXN: 2,
  PLN: 2,
  THB: 2,
  TWD: 2,
  USD: 2,
  VND: 0,
};

export const CurrencyFieldEntity = createEntityComponent(
  currencyFieldEntity,
  function CurrencyFieldEntity(props) {
    const { localError, isValidating, validateAndCommit } =
      useFieldValidationState(props.entity.id);
    const label = useEntityLabel(
      props.entity.id,
      props.entity.attributes.label.value || props.entity.attributes.name,
      props.entity.attributes.name,
    );

    const coerceNumber = (input: unknown) => {
      if (typeof input === "number" && Number.isFinite(input)) return input;
      if (typeof input === "string" && input.trim() !== "") {
        const parsed = Number(input);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    };

    // Handle form data that may be { value, currencyCode } object or plain number
    const rawEntityValue = props.entity.value as {
      value?: number;
      currencyCode?: string;
    };
    const savedCurrencyCode =
      typeof rawEntityValue === "object" &&
      rawEntityValue !== null &&
      "currencyCode" in rawEntityValue
        ? (rawEntityValue as { currencyCode?: string }).currencyCode
        : undefined;
    const entityNumericValue =
      typeof rawEntityValue === "object" &&
      rawEntityValue !== null &&
      "value" in rawEntityValue
        ? coerceNumber((rawEntityValue as { value?: unknown }).value)
        : coerceNumber(rawEntityValue);

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
    const value = entityNumericValue ?? coerceNumber(defaultValue);

    const rawCurrencyCode = props.entity.attributes.currencyCode as
      | { isReference?: boolean; reference?: string; value?: string }
      | string
      | undefined;
    const isReferenceCode =
      typeof rawCurrencyCode === "object" &&
      rawCurrencyCode?.isReference === true;
    const referencedCurrencyFieldName = isReferenceCode
      ? (extractReferencedFieldNames(
          (rawCurrencyCode as { reference?: string }).reference ?? "",
        )[0] ?? undefined)
      : undefined;
    // Prefer currencyCode from saved form data, then fall back to attribute
    const resolvedCurrencyCode =
      savedCurrencyCode ??
      (typeof rawCurrencyCode === "string"
        ? rawCurrencyCode
        : rawCurrencyCode?.value) ??
      "USD";
    // Validate against the currency list; fall back to "USD" if the
    // referenced value is not a recognized currency code.
    const currencyCode = ALL_CURRENCY_CODES.includes(
      resolvedCurrencyCode as CurrencyCode,
    )
      ? resolvedCurrencyCode
      : "USD";
    const currencyDecimals =
      currencyDecimalMap[currencyCode] ??
      (props.entity.attributes.decimalDigits as number | undefined) ??
      2;

    const rawDecimalDigits =
      typeof props.entity.attributes.decimalDigits === "number"
        ? props.entity.attributes.decimalDigits
        : currencyDecimals;

    const parsedDigits =
      typeof rawDecimalDigits === "string"
        ? Number(rawDecimalDigits)
        : rawDecimalDigits;

    const decimalDigits = Number.isFinite(parsedDigits)
      ? Math.max(0, Math.min(20, Math.floor(Number(parsedDigits))))
      : 0;

    const allowCurrencyChange =
      props.entity.attributes.allowCurrencyChange ?? !isReferenceCode;

    const [selectedCurrency, setSelectedCurrency] = useState(currencyCode);
    useEffect(() => {
      setSelectedCurrency(currencyCode);
    }, [currencyCode]);

    const errorMessage =
      localError ||
      formatError(props.entity.value, props.entity.error)?._errors?.[0];

    const handleValidation = async (nextValue?: number) => {
      await validateAndCommit({
        value: { value: nextValue, currencyCode: selectedCurrency },
        setValue: props.setValue,
        validator: props.entity.attributes.validator,
        isRequiredInvalid: (v: any) =>
          Boolean(
            props.entity.attributes.required &&
              (v === undefined || v?.value === undefined),
          ),
        requiredMessage: "This field is required",
        onValidationSuccess: props.resetError,
      });
    };

    return (
      <div>
        <Label
          htmlFor={props.entity.attributes.name || props.entity.id}
          aria-required={props.entity.attributes.required}
        >
          {label}
        </Label>
        <CurrencyInput
          id={props.entity.attributes.name || props.entity.id}
          name={props.entity.attributes.name || props.entity.id}
          currencyCode={selectedCurrency}
          referencedCurrencyFieldName={referencedCurrencyFieldName}
          decimalDigits={decimalDigits}
          value={value}
          onValueChange={(nextValue) => {
            props.setValue({
              value: nextValue,
              currencyCode: selectedCurrency,
            });
          }}
          onBlur={() => {
            void handleValidation(value);
          }}
          className={errorMessage ? "border-red-500" : ""}
          readOnly={props.entity.attributes.readonly}
          disabled={props.entity.attributes.disabled}
          allowCurrencyChange={allowCurrencyChange}
          currencyOptions={ALL_CURRENCY_CODES}
          onCurrencyChange={(newCurrency) => {
            setSelectedCurrency(newCurrency);
            props.setValue({
              value: value,
              currencyCode: newCurrency,
            });
          }}
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
