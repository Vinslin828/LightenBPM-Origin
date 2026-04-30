import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import {
  dateSubtypeAttribute,
  type DateSubtype,
  DATE_SUBTYPE_EVENT,
} from "./definition";
import { SelectOption } from "@ui/select/single-select";
import { Select } from "@ui/select";

const options: SelectOption<string>[] = [
  { label: "Date", value: "date", key: "date" },
  { label: "Time", value: "time", key: "time" },
  { label: "Date & Time", value: "datetime", key: "datetime" },
];

export const DateSubtypeAttribute = createAttributeComponent(
  dateSubtypeAttribute,
  function DateSubtypeAttribute(props) {
    const handleChange = (val: string) => {
      const next = (val || "date") as DateSubtype;
      props.setValue(next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent(DATE_SUBTYPE_EVENT, {
            detail: {
              entityId: props.entity?.id,
              subtype: next,
            },
          }),
        );
      }
    };

    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={props.attribute.name}>Date Subtype</Label>
        <Select
          mode="single"
          // id={props.attribute.name}
          options={options}
          value={props.attribute.value ?? "date"}
          onChange={handleChange}
          placeholder="Select subtype"
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
