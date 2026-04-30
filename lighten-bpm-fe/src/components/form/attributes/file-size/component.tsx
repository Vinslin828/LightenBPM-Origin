import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { fileSizeAttribute } from "./definition";

export const FileSizeAttribute = createAttributeComponent(
  fileSizeAttribute,
  function FileSizeAttribute(props) {
    const [localValue, setLocalValue] = useState<string>(
      String(props.attribute.value ?? 15),
    );

    useEffect(() => {
      setLocalValue(String(props.attribute.value ?? 15));
    }, [props.attribute.value]);

    const hasError =
      Number(localValue) > 100 ||
      !!formatError(props.attribute.value, props.attribute.error)?._errors?.[0];

    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor={props.attribute.name}>Each file size (MB)</Label>
        <Input
          id={props.attribute.name}
          type="number"
          min={1}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={() => {
            const input = Number(localValue);
            const clamped = input > 0 ? Math.min(input, 100) : 1;
            setLocalValue(String(clamped));
            props.setValue(clamped);
          }}
          error={hasError}
          className={hasError ? "focus:border-red" : ""}
          placeholder="1"
        />
        <ValidationError>
          {Number(localValue) > 100
            ? "Maximum each file size is 100MB"
            : formatError(props.attribute.value, props.attribute.error)
                ?._errors?.[0]}
        </ValidationError>
      </div>
    );
  },
);
