import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { nameAttribute } from "./definition";

export const NameAttribute = createAttributeComponent(
  nameAttribute,
  function NameAttribute(props) {
    return (
      <div>
        <Label htmlFor={props.attribute.name} aria-required>
          Field Name
        </Label>
        <Input
          id={props.attribute.name}
          name={props.attribute.name}
          type="text"
          value={props.attribute.value ?? ""}
          onChange={(e) => {
            props.setValue(e.target.value ?? "");
          }}
          placeholder="Enter field name"
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
