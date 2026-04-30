import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@coltorapps/builder-react";

import { minAttribute } from "./definition";

export const MinAttribute = createAttributeComponent(
  minAttribute,
  function MinAttribute(props) {
    return (
      <div>
        <Label htmlFor={props.attribute.name}>Minimum Value</Label>
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
          placeholder="No minimum value"
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
