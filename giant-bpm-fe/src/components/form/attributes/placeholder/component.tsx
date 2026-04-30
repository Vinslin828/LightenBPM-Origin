import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@coltorapps/builder-react";
import { useState } from "react";

import { placeholderAttribute } from "./definition";
import CodeToggle from "@ui/code-toggle";
import { useCodeBuilder } from "@/hooks/useCode/useCodeBuilder";
import CodeEditButton from "@ui/button/code-edit-button";

export const PlaceholderAttribute = createAttributeComponent(
  placeholderAttribute,
  function PlaceholderAttribute(props) {
    const attributeValue = props.attribute.value ?? {
      isReference: false,
      value: "",
      reference: "",
    };

    return (
      <div>
        <div className="flex flex-row items-center justify-between pb-1.5">
          <Label htmlFor={props.attribute.name}>Placeholder</Label>
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
                ...attributeValue,
                reference: nextValue,
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
                ...attributeValue,
                value: e.target.value,
              });
            }}
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
