import { Input } from "@/components/ui/input";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { labelAttribute } from "./definition";
import { useRefWithErrorFocus } from "@/utils/error-focus";
import CodeToggle from "@ui/code-toggle";
import CodeEditButton from "@ui/button/code-edit-button";

export const LabelAttribute = createAttributeComponent(
  labelAttribute,
  function LabelAttribute(props) {
    const inputRef = useRefWithErrorFocus<HTMLInputElement>(
      props.attribute.error,
    );

    return (
      <div>
        <div className="flex flex-row items-center justify-between pb-1.5">
          <label
            htmlFor={props.attribute.name}
            aria-required
            className="text-dark font-medium text-sm"
          >
            Label
          </label>
          <CodeToggle
            value={props.attribute.value.isReference ? "code" : "manual"}
            onChange={(value) => {
              props.setValue({
                isReference: value === "code",
                value: "",
              });
            }}
          />
        </div>
        {!props.attribute.value.isReference && (
          <Input
            ref={inputRef}
            id={props.attribute.name}
            name={props.attribute.name}
            value={props.attribute.value.value ?? ""}
            placeholder={
              props.attribute.value.isReference ? "fx" : "Input label"
            }
            onChange={(e) => {
              props.setValue({
                isReference: false,
                value: e.target.value,
              });
            }}
            required
          />
        )}
        {props.attribute.value.isReference && (
          <CodeEditButton
            variant="reference"
            value={props.attribute.value.reference}
            trigger={props.attribute.value.reference}
            onSave={(value) => {
              props.setValue({
                isReference: true,
                reference: value,
              });
            }}
          />
        )}
        <ValidationError>
          {
            formatError(props.attribute.value, props.attribute.error)?.value
              ?._errors?.[0]
          }
        </ValidationError>
      </div>
    );
  },
);
