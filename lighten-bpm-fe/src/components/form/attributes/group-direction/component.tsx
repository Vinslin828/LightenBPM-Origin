import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { groupDirectionAttribute } from "./definition";
import { RadioGroup } from "@ui/radio-group";

const directions = [
  { value: "vertical", label: "Vertical" },
  { value: "horizontal", label: "Horizontal" },
] as const;

export const GroupDirectionAttribute = createAttributeComponent(
  groupDirectionAttribute,
  function GroupDirectionAttribute(props) {
    const currentValue = props.attribute.value ?? "vertical";

    return (
      <div>
        <Label className="text-sm font-medium mb-3 block">
          Group Direction
        </Label>
        <div className="space-y-2">
          <RadioGroup
            name={props.attribute.name}
            value={currentValue}
            onChange={(val) => props.setValue(val as "vertical" | "horizontal")}
            options={directions.map((direction) => ({
              label: direction.label,
              value: direction.value,
            }))}
          />
        </div>
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
