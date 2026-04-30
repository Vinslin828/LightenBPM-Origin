import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@coltorapps/builder-react";

import { requiredAttribute } from "./definition";
import { ATTRIBUTE_HIDE_UPDATED, AttributeUpdatedDetail } from "../hide/component";

export const ATTRIBUTE_REQUIRED_UPDATED = "attribute-required-updated";

export const RequiredAttribute = createAttributeComponent(
  requiredAttribute,
  function RequiredAttribute(props) {
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

    if (isHide) return null;

    return (
      <div>
        <div className="flex items-center gap-2.5">
          <Checkbox
            checked={props.attribute.value || false}
            disabled={isDisabledAttr}
            onCheckedChange={(checked) => {
              props.setValue(checked);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent<AttributeUpdatedDetail>(
                    ATTRIBUTE_REQUIRED_UPDATED,
                    {
                      detail: { entityId: props.entity?.id, value: checked },
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
            Required
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
