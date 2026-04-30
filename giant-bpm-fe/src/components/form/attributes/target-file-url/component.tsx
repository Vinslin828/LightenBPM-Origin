import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { targetFileUrlAttribute } from "./definition";

export const TargetFileUrlAttribute = createAttributeComponent(
  targetFileUrlAttribute,
  function TargetFileUrlAttribute(props) {
    return (
      <div>
        <Label htmlFor={props.attribute.name}>Target file URL</Label>
        <Input
          id={props.attribute.name}
          name={props.attribute.name}
          value={props.attribute.value ?? ""}
          placeholder="https://"
          onChange={(e) => {
            props.setValue(e.target.value || undefined);
          }}
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
