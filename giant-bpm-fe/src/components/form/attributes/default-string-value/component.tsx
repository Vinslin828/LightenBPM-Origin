import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@coltorapps/builder-react";
import { useState } from "react";

import { defaultStringValueAttribute } from "./definition";
import CodeToggle from "@ui/code-toggle";
import { useCodeBuilder } from "@/hooks/useCode/useCodeBuilder";
import CodeEditButton from "@ui/button/code-edit-button";

export const DefaultStringValueAttribute = createAttributeComponent(
  defaultStringValueAttribute,
  function DefaultStringValueAttribute(props) {
    const attributeValue = props.attribute.value ?? {
      isReference: false,
      value: "",
    };

    console.debug(props.attribute.value);

    return (
      <div>
        <div className="flex flex-row items-center justify-between pb-1.5">
          <Label htmlFor={props.attribute.name}>Default Value</Label>
          <CodeToggle
            value={attributeValue.isReference ? "code" : "manual"}
            onChange={(value) => {
              props.setValue({
                isReference: value === "code",
                value: "",
                reference: "",
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
              props.setValue({
                isReference: true,
                reference: nextValue,
                value: undefined,
              });
            }}
          />
        ) : (
          <Input
            id={props.attribute.name}
            name={props.attribute.name}
            value={attributeValue.value ?? ""}
            onChange={(e) => {
              props.setValue({
                isReference: false,
                value: e.target.value,
              });
            }}
            placeholder="Default Value"
          />
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
