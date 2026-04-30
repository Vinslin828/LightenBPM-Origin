import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { defaultCurrencyValueAttribute } from "./definition";
import { useEffect, useState } from "react";
import {
  type CurrencyUpdatedDetail,
  getCurrencyUpdatedEventName,
} from "../currency-code/component";
import { getDecimalDigitsUpdatedEventName } from "../decimal-digits/component";
import type { DecimalDigitsUpdatedDetail } from "../decimal-digits/definition";
import CodeToggle from "@ui/code-toggle";
import { useCodeBuilder } from "@/hooks/useCode/useCodeBuilder";
import CodeEditButton from "@ui/button/code-edit-button";

export const DefaultCurrencyValueAttribute = createAttributeComponent(
  defaultCurrencyValueAttribute,
  function DefaultCurrencyValueAttribute(props) {
    const { validateReference } = useCodeBuilder();
    const [expressionError, setExpressionError] = useState<string | undefined>(
      undefined,
    );
    const extractCurrencyCode = (raw: unknown): string => {
      if (typeof raw === "string") return raw;
      if (raw && typeof raw === "object" && "value" in raw) {
        const val = (raw as { value?: string }).value;
        if (typeof val === "string") return val;
      }
      return "USD";
    };

    const [currencyCode, setCurrencyCode] = useState<string>(
      extractCurrencyCode(props.entity.attributes.currencyCode),
    );
    const attributeValue = props.attribute.value ?? {
      isReference: false,
      value: undefined,
      reference: "",
    };

    const [decimalDigits, setDecimalDigits] = useState<number>(() => {
      const raw = props.entity.attributes.decimalDigits as
        | number
        | string
        | undefined;
      const parsed =
        typeof raw === "string" ? Number(raw) : (raw as number | undefined);
      return Number.isFinite(parsed)
        ? Math.max(0, Math.min(20, Math.floor(Number(parsed))))
        : 0;
    });

    // Sync with local attribute changes
    useEffect(() => {
      setCurrencyCode(
        extractCurrencyCode(props.entity.attributes.currencyCode),
      );
    }, [props.entity.attributes.currencyCode]);

    useEffect(() => {
      const raw = props.entity.attributes.decimalDigits as
        | number
        | string
        | undefined;
      const parsed =
        typeof raw === "string" ? Number(raw) : (raw as number | undefined);
      setDecimalDigits(
        Number.isFinite(parsed)
          ? Math.max(0, Math.min(20, Math.floor(Number(parsed))))
          : 0,
      );
    }, [props.entity.attributes.decimalDigits]);

    // Listen for cross-attribute updates (other panels)
    useEffect(() => {
      const handleCurrency = (event: Event) => {
        const detail = (event as CustomEvent<CurrencyUpdatedDetail>).detail;
        if (detail?.entityId && detail.entityId !== props.entity?.id) return;
        if (detail?.currency) setCurrencyCode(detail.currency);
      };
      const handleDecimals = (event: Event) => {
        const detail = (event as CustomEvent<DecimalDigitsUpdatedDetail>)
          .detail;
        if (detail?.entityId && detail.entityId !== props.entity?.id) return;
        if (detail?.value !== undefined) {
          setDecimalDigits(
            Math.max(0, Math.min(20, Math.floor(Number(detail.value)))),
          );
        }
      };
      const currencyEvent = getCurrencyUpdatedEventName(props.entity?.id);
      const decimalsEvent = getDecimalDigitsUpdatedEventName(props.entity?.id);
      window.addEventListener(currencyEvent, handleCurrency);
      window.addEventListener(decimalsEvent, handleDecimals);
      return () => {
        window.removeEventListener(currencyEvent, handleCurrency);
        window.removeEventListener(decimalsEvent, handleDecimals);
      };
    }, [props.entity?.id]);

    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center justify-between">
          <Label htmlFor={props.attribute.name}>Default Value</Label>
          <CodeToggle
            value={attributeValue.isReference ? "code" : "manual"}
            onChange={(value) => {
              setExpressionError(undefined);
              props.setValue({
                isReference: value === "code",
                reference: "",
                value: undefined,
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
                isReference: true,
                reference: nextValue,
                value: undefined,
              });
            }}
          />
        ) : (
          <CurrencyInput
            id={props.attribute.name}
            name={props.attribute.name}
            currencyCode={currencyCode}
            decimalDigits={decimalDigits}
            value={
              typeof attributeValue.value === "number"
                ? attributeValue.value
                : undefined
            }
            onValueChange={(val) => {
              setExpressionError(undefined);
              props.setValue({ isReference: false, value: val });
            }}
            placeholder="0"
            hideCurrencyPrefix
          />
        )}
        <ValidationError>
          {expressionError ??
            formatError(props.attribute.value, props.attribute.error)
              ?._errors?.[0]}
        </ValidationError>
      </div>
    );
  },
);
