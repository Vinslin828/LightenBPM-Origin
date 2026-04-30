import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@coltorapps/builder-react";

import { maxAttribute } from "./definition";

export const MaxAttribute = createAttributeComponent(
  maxAttribute,
  function MaxAttribute(props) {
    return (
      <div>
        <Label htmlFor={props.attribute.name}>Maximum Value</Label>
        <Input
          id={props.attribute.name}
          name={props.attribute.name}
          type="number"
          value={props.attribute.value ?? ""}
          onChange={(e) => {
            props.setValue(
              e.target.value ? parseFloat(e.target.value) : undefined,
            );
          }}
          placeholder="No maximum value"
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
