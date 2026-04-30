import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@coltorapps/builder-react";

import { defaultBooleanValueAttribute } from "./definition";
import { Select } from "@ui/select";

export const DefaultBooleanValueAttribute = createAttributeComponent(
  defaultBooleanValueAttribute,
  function DefaultStringValueAttribute(props) {
    const attributeValue = props.attribute.value ?? {
      isReference: false,
      value: undefined,
      reference: "",
    };
    return (
      <div>
        <div className="flex items-center justify-between pb-1.5">
          <Label htmlFor={props.attribute.name} className="text-sm font-medium">
            Default Active
          </Label>
        </div>
        <Select
          mode="single"
          options={[
            { label: "Active", value: "true", key: "true" },
            { label: "Inactive", value: "false", key: "false" },
          ]}
          value={
            typeof attributeValue.value === "boolean"
              ? String(attributeValue.value)
              : undefined
          }
          placeholder="Select default"
          name={props.attribute.name}
          onChange={(value) => {
            if (value === "true") {
              props.setValue({ isReference: false, value: true });
            } else if (value === "false") {
              props.setValue({ isReference: false, value: false });
            } else {
              props.setValue({ isReference: false, value: undefined });
            }
          }}
          className={
            formatError(props.attribute.value, props.attribute.error)
              ?._errors?.[0]
              ? "border-red-500"
              : ""
          }
        />
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
