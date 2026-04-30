import { SingleSelect } from "@ui/select/single-select";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { inputOptionsAttribute } from "./definition";

export const InputOptionsAttribute = createAttributeComponent(
  inputOptionsAttribute,
  function InputOptionsAttribute(props) {
    return (
      <div>
        <Label htmlFor={props.attribute.name}>Input Options</Label>
        <SingleSelect
          value={props.attribute.value ?? "default"}
          onChange={(value) =>
            props.setValue(value as "default" | "disabled" | "readonly")
          }
          options={[
            { label: "Default", value: "default", key: "default" },
            { label: "Disabled", value: "disabled", key: "disabled" },
            { label: "Read Only", value: "readonly", key: "readonly" },
          ]}
          placeholder="Select input option"
          hasError={
            !!formatError(props.attribute.value, props.attribute.error)
              ?._errors?.[0]
          }
          className="w-full"
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
