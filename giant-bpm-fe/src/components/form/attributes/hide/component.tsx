import { Toggle } from "@/components/ui/toggle";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@coltorapps/builder-react";

import { hideAttribute } from "./definition";

export const ATTRIBUTE_HIDE_UPDATED = "attribute-hide-updated";
export type AttributeUpdatedDetail = {
  entityId: string;
  value: any;
};

export const HideAttribute = createAttributeComponent(
  hideAttribute,
  function HideAttribute(props) {
    const hide = !props.attribute.value;
    return (
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor={props.attribute.name} className="text-sm font-medium">
            Show component
          </Label>
          <Toggle
            pressed={hide}
            onPressedChange={(pressed) => {
              const nextHide = !pressed;
              props.setValue(nextHide);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent<AttributeUpdatedDetail>(
                    ATTRIBUTE_HIDE_UPDATED,
                    {
                      detail: { entityId: props.entity?.id, value: nextHide },
                    },
                  ),
                );
              }
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
