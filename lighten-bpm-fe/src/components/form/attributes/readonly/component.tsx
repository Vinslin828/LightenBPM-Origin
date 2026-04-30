import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@coltorapps/builder-react";

import { readonlyAttribute } from "./definition";
import { ATTRIBUTE_HIDE_UPDATED, AttributeUpdatedDetail } from "../hide/component";

export const ATTRIBUTE_READONLY_UPDATED = "attribute-readonly-updated";

export const ReadonlyAttribute = createAttributeComponent(
  readonlyAttribute,
  function ReadonlyAttribute(props) {
    const [isHide, setIsHide] = useState(
      (props.entity.attributes.hide as boolean) ?? false,
    );
    const [isDisabledAttr, setIsDisabledAttr] = useState(
      (props.entity.attributes.disabled as boolean) ?? false,
    );

    useEffect(() => {
      setIsHide((props.entity.attributes.hide as boolean) ?? false);
      setIsDisabledAttr((props.entity.attributes.disabled as boolean) ?? false);

      const handleHideUpdate = (event: Event) => {
        const customEvent = event as CustomEvent<AttributeUpdatedDetail>;
        if (customEvent.detail.entityId === props.entity.id) {
          setIsHide(customEvent.detail.value);
        }
      };

      const handleDisabledUpdate = (event: Event) => {
        const customEvent = event as CustomEvent<AttributeUpdatedDetail>;
        if (customEvent.detail.entityId === props.entity.id) {
          setIsDisabledAttr(customEvent.detail.value);
        }
      };

      window.addEventListener(ATTRIBUTE_HIDE_UPDATED, handleHideUpdate);
      window.addEventListener("attribute-disabled-updated", handleDisabledUpdate);

      return () => {
        window.removeEventListener(ATTRIBUTE_HIDE_UPDATED, handleHideUpdate);
        window.removeEventListener(
          "attribute-disabled-updated",
          handleDisabledUpdate,
        );
      };
    }, [props.entity.id]);

    const editable = !props.attribute.value;

    if (isHide) return null;

    return (
      <div>
        <div className="flex items-center gap-2.5">
          <Checkbox
            checked={editable}
            disabled={isDisabledAttr}
            onCheckedChange={(checked) => {
              // Schema remains readonly; editable=true means readonly=false.
              const nextReadonly = !checked;
              props.setValue(nextReadonly);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent<AttributeUpdatedDetail>(
                    ATTRIBUTE_READONLY_UPDATED,
                    {
                      detail: { entityId: props.entity?.id, value: nextReadonly },
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
          <Label
            htmlFor={props.attribute.name}
            className="text-sm font-normal pb-0"
          >
            Editable
          </Label>
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
