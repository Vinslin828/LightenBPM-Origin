import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { isButtonAttribute } from "./definition";
import { RadioGroup } from "@/components/ui/radio-group";

export const IsButtonAttribute = createAttributeComponent(
  isButtonAttribute,
  function IsButtonAttribute(props) {
    const isButton = props.attribute.value !== false; // defaults to true

    return (
      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">Button Type</Label>
        <RadioGroup
          name={`is-button-${props.attribute.name}`}
          value={isButton ? "button" : "text"}
          onChange={(val) => {
            props.setValue(val === "button");
          }}
          options={[
            { label: "Button Link", value: "button" },
            { label: "Text Link", value: "text" },
          ]}
          className="flex flex-col gap-2 pl-[2px]"
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
