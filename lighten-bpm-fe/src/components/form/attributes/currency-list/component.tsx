import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { SingleSelect } from "@ui/select/single-select";
import { currencyListAttribute } from "./definition";

export const CurrencyListAttribute = createAttributeComponent(
  currencyListAttribute,
  function CurrencyListAttribute(props) {
    const hasValue = Boolean(props.attribute.value);
    const options: { label: string; value: string; key: string }[] = hasValue
      ? [
          {
            label: String(props.attribute.value),
            value: String(props.attribute.value),
            key: String(props.attribute.value),
          },
        ]
      : [];

    return (
      <div>
        <Label htmlFor={props.attribute.name}>Currency List</Label>
        <SingleSelect
          name={props.attribute.name}
          value={props.attribute.value ?? ""}
          onChange={(value) => props.setValue(value)}
          options={options}
          placeholder="Select currency list"
          hasError={
            !!formatError(props.attribute.value, props.attribute.error)
              ?._errors?.[0]
          }
          disabled={options.length === 0}
          className="w-full"
        />
        {options.length === 0 && (
          <p className="mt-1 text-xs text-secondary-text">
            No currency lists available.
          </p>
        )}
        <ValidationError>
          {
            formatError(props.attribute.value, props.attribute.error)
              ?._errors?.[0]
          }
        </ValidationError>
      </div>
    );
  },
);
