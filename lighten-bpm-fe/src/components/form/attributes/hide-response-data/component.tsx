import { Toggle } from "@/components/ui/toggle";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { hideResponseDataAttribute } from "./definition";

export const HideResponseDataAttribute = createAttributeComponent(
  hideResponseDataAttribute,
  function HideResponseDataAttribute(props) {
    const hide = props.attribute.value === true;
    return (
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor={props.attribute.name} className="text-sm font-medium">
            Hide response data
          </Label>
          <Toggle
            pressed={hide}
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
