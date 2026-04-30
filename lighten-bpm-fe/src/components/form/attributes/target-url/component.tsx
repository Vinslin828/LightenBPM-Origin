import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { targetUrlAttribute } from "./definition";

export const TargetUrlAttribute = createAttributeComponent(
  targetUrlAttribute,
  function TargetUrlAttribute(props) {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={props.attribute.name}>Target URL</Label>
        <Input
          id={props.attribute.name}
          value={props.attribute.value || ""}
          onChange={(e) => {
            props.setValue(e.target.value);
          }}
          className={
            formatError(props.attribute.value, props.attribute.error)
              ?._errors?.[0]
              ? "border-red-500"
              : ""
          }
          placeholder="https://"
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
