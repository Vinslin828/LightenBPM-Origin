import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";

import { RadioGroup } from "@/components/ui/radio-group";
import { flowTypeAttribute } from "./definition";
import { Checkbox } from "@ui/checkbox";

const flowTypes = [
  { value: "split" as const, label: "Split" },
  { value: "recursive" as const, label: "Recursive" },
  { value: "others" as const, label: "Others" },
];

export const FlowTypeAttribute = createAttributeComponent(
  flowTypeAttribute,
  function FlowTypeAttribute(props) {
    const currentValue = props.attribute.value ?? ["split"];

    return (
      <div className="flex flex-col gap-4">
        {flowTypes.map((ft) => (
          <div className="flex flex-row gap-2 items-center" key={ft.value}>
            <Checkbox
              id={`checkbox-${ft.value}`}
              checked={currentValue.includes(ft.value)}
              onCheckedChange={(checked) => {
                if (checked) {
                  props.setValue([...currentValue, ft.value]);
                } else if (currentValue.includes(ft.value)) {
                  props.setValue(currentValue.filter((v) => v !== ft.value));
                }
              }}
            />
            <label
              htmlFor={`checkbox-${ft.value}`}
              className="text-sm font-normal cursor-pointer"
            >
              {ft.label}
            </label>
          </div>
        ))}
        {/* <RadioGroup
          name={props.attribute.name}
          value={currentValue}
          onChange={(value) =>
            props.setValue(value as (typeof flowTypes)[number]["value"])
          }
          options={flowTypes}
          className="space-y-2"
        /> */}
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
