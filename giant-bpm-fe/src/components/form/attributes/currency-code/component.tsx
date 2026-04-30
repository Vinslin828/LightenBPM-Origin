import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { SingleSelect } from "@ui/select/single-select";
import { currencyCodeAttribute } from "./definition";
import type { CurrencyCode } from "@/types/form-builder";
import { useId, useState } from "react";
import CodeToggle from "@ui/code-toggle";
import { useCodeBuilder } from "@/hooks/useCode/useCodeBuilder";
import CodeEditButton from "@ui/button/code-edit-button";

const currencyCodeOptions = [
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
].map((code) => ({ label: code, value: code, key: code }));

export const CURRENCY_UPDATED_EVENT = "currency-updated";
export const getCurrencyUpdatedEventName = (entityId?: string) =>
  `${CURRENCY_UPDATED_EVENT}-${entityId ?? "unknown"}`;
export type CurrencyUpdatedDetail = {
  entityId?: string;
  currency?: string;
};

type CurrencyCodeValue =
  | { isReference: true; reference?: string }
  | { isReference?: false; value?: string };

export const CurrencyCodeAttribute = createAttributeComponent(
  currencyCodeAttribute,
  function CurrencyCodeAttribute(props) {
    const { validateReference } = useCodeBuilder();
    const [expressionError, setExpressionError] = useState<string | undefined>(
      undefined,
    );

    const raw = props.attribute.value as CurrencyCodeValue | undefined;
    const attributeValue: CurrencyCodeValue = raw ?? {
      isReference: false,
      value: undefined,
    };
    const isReference = attributeValue.isReference === true;
    const currentValue = isReference
      ? undefined
      : (attributeValue as { isReference?: false; value?: string }).value;

    const dispatchCurrencyEvent = (currency: string) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(getCurrencyUpdatedEventName(props.entity?.id), {
            detail: { entityId: props.entity?.id, currency },
          }),
        );
      }
    };

    return (
      <div className="flex flex-col gap-2">
        <div className="flex flex-row items-center justify-between">
          <Label>Default currency</Label>
          <CodeToggle
            value={isReference ? "code" : "manual"}
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
        {isReference ? (
          <CodeEditButton
            variant="reference"
            value={String(
              (attributeValue as { isReference: true; reference?: string })
                .reference ?? "",
            )}
            trigger={
              (attributeValue as { isReference: true; reference?: string })
                .reference
            }
            onSave={(nextValue) => {
              const result = validateReference(nextValue);
              if (!result.isValid) {
                setExpressionError(result.errors[0]);
                return;
              }
              setExpressionError(undefined);
              props.setValue({ isReference: true, reference: nextValue });
            }}
          />
        ) : (
          <SingleSelect
            name={props.attribute.name}
            value={currentValue ?? ""}
            onChange={(value) => {
              props.setValue({
                isReference: false,
                value: value as CurrencyCode,
              });
              dispatchCurrencyEvent(value);
            }}
            options={currencyCodeOptions}
            placeholder="Select currency"
            hasError={
              !!formatError(props.attribute.value, props.attribute.error)
                ?._errors?.[0]
            }
            className="w-full"
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
