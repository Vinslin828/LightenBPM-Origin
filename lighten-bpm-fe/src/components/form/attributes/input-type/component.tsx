import { createAttributeComponent } from "@coltorapps/builder-react";

import { RadioGroup } from "@/components/ui/radio-group";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { inputTypeAttribute } from "./definition";

const inputTypes = [
  { value: "text" as const, label: "Text" },
  { value: "password" as const, label: "Password" },
];

export const InputTypeAttribute = createAttributeComponent(
  inputTypeAttribute,
  function InputTypeAttribute(props) {
    const currentValue = props.attribute.value ?? "text";

    return (
      <div>
        <RadioGroup
          name={props.attribute.name}
          value={currentValue}
          onChange={(value) =>
            props.setValue(value as (typeof inputTypes)[number]["value"])
          }
          options={inputTypes}
          className="space-y-2"
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
