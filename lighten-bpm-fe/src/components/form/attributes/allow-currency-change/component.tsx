import { Toggle } from "@/components/ui/toggle";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { allowCurrencyChangeAttribute } from "./definition";

export const AllowCurrencyChangeAttribute = createAttributeComponent(
  allowCurrencyChangeAttribute,
  function AllowCurrencyChangeAttribute(props) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Allow user to change currency
          </Label>
          <Toggle
            pressed={props.attribute.value ?? true}
            onPressedChange={(pressed) => {
              props.setValue(pressed);
            }}
            className={
              formatError(props.attribute.value, props.attribute.error)
                ?._errors?.[0]
                ? "ring-red-500"
                : ""
            }
          />
        </div>
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
