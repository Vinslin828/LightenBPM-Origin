import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@coltorapps/builder-react";

import { disabledAttribute } from "./definition";
import { ATTRIBUTE_HIDE_UPDATED, AttributeUpdatedDetail } from "../hide/component";
import { supportsVisibilityAction } from "@/const/flow";
import { VisibilityAction } from "@/types/flow";
import { EntityKey } from "@/types/form-builder";

export const ATTRIBUTE_DISABLED_UPDATED = "attribute-disabled-updated";

export const DisabledAttribute = createAttributeComponent(
  disabledAttribute,
  function DisabledAttribute(props) {
    const supportsEditable = supportsVisibilityAction(
      props.entity.type as EntityKey,
      VisibilityAction.EDITABLE,
    );
    const [isHide, setIsHide] = useState(
      (props.entity.attributes.hide as boolean) ?? false,
    );
    const [isRequiredAttr, setIsRequiredAttr] = useState(
      (props.entity.attributes.required as boolean) ?? false,
    );
    const [isReadonlyAttr, setIsReadonlyAttr] = useState(
      (props.entity.attributes.readonly as boolean) ?? false,
    );

    useEffect(() => {
      setIsHide((props.entity.attributes.hide as boolean) ?? false);
      setIsRequiredAttr((props.entity.attributes.required as boolean) ?? false);
      setIsReadonlyAttr((props.entity.attributes.readonly as boolean) ?? false);

      const handleHideUpdate = (event: Event) => {
        const customEvent = event as CustomEvent<AttributeUpdatedDetail>;
        if (customEvent.detail.entityId === props.entity.id) {
          setIsHide(customEvent.detail.value);
        }
      };

      const handleRequiredUpdate = (event: Event) => {
        const customEvent = event as CustomEvent<AttributeUpdatedDetail>;
        if (customEvent.detail.entityId === props.entity.id) {
          setIsRequiredAttr(customEvent.detail.value);
        }
      };

      const handleReadonlyUpdate = (event: Event) => {
        const customEvent = event as CustomEvent<AttributeUpdatedDetail>;
        if (customEvent.detail.entityId === props.entity.id) {
          setIsReadonlyAttr(customEvent.detail.value);
        }
      };

      window.addEventListener(ATTRIBUTE_HIDE_UPDATED, handleHideUpdate);
      window.addEventListener("attribute-required-updated", handleRequiredUpdate);
      window.addEventListener("attribute-readonly-updated", handleReadonlyUpdate);

      return () => {
        window.removeEventListener(ATTRIBUTE_HIDE_UPDATED, handleHideUpdate);
        window.removeEventListener(
          "attribute-required-updated",
          handleRequiredUpdate,
        );
        window.removeEventListener(
          "attribute-readonly-updated",
          handleReadonlyUpdate,
        );
      };
    }, [props.entity.id]);

    if (isHide) return null;

    return (
      <div>
        <div className="flex items-center gap-2.5">
          <Checkbox
            // id={props.attribute.name}
            checked={props.attribute.value || false}
            disabled={isRequiredAttr || (supportsEditable && !isReadonlyAttr)}
            onCheckedChange={(checked) => {
              props.setValue(checked);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent<AttributeUpdatedDetail>(
                    ATTRIBUTE_DISABLED_UPDATED,
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
            Disabled
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
