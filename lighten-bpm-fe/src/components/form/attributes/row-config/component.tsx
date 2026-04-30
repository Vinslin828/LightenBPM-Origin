import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

import { createAttributeComponent } from "@coltorapps/builder-react";

import { rowConfigAttribute } from "./definition";

export const RowConfigAttribute = createAttributeComponent(
  rowConfigAttribute,
  function RowConfigAttribute(props) {
    const current = props.attribute.value ?? {};
    const error = formatError(props.attribute.value, props.attribute.error);

    return (
      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor={`${props.attribute.name}-min`}>Min Rows</Label>
          <Input
            id={`${props.attribute.name}-min`}
            name={`${props.attribute.name}-min`}
            type="number"
            min={0}
            value={current.minRows ?? ""}
            onChange={(e) => {
              const next = e.target.value;
              props.setValue({
                ...current,
                minRows: next === "" ? undefined : Number(next),
              });
            }}
            placeholder="Min Rows"
          />
          <ValidationError>{error?.minRows?._errors?.[0]}</ValidationError>
        </div>

        <div>
          <Label htmlFor={`${props.attribute.name}-max`}>Max Rows</Label>
          <Input
            id={`${props.attribute.name}-max`}
            name={`${props.attribute.name}-max`}
            type="number"
            min={0}
            value={current.maxRows ?? ""}
            onChange={(e) => {
              const next = e.target.value;
              props.setValue({
                ...current,
                maxRows: next === "" ? undefined : Number(next),
              });
            }}
            placeholder="Max Rows"
          />
          <ValidationError>{error?.maxRows?._errors?.[0]}</ValidationError>
          <ValidationError>{error?._errors?.[0]}</ValidationError>
        </div>
      </div>
    );
  },
);
