import { createAttributeComponent } from "@coltorapps/builder-react";
import CodeEditButton from "@ui/button/code-edit-button";
import { ValidationError, formatError } from "@ui/validation-error";
import { expressionAttribute } from "./definition";

export const ExpressionAttribute = createAttributeComponent(
  expressionAttribute,
  function ExpressionAttribute(props) {
    const formattedError = formatError(
      props.attribute.value,
      props.attribute.error,
    );
    const fieldError =
      formattedError?._errors?.[0] ??
      (props.attribute.error instanceof Error
        ? props.attribute.error.message
        : undefined);

    return (
      <div className="flex flex-col gap-1.5">
        <div className="text-dark text-base font-medium">Expression</div>
        <CodeEditButton
          variant="reference"
          title="Expression"
          value={
            props.attribute.value ?? "function expression(){\n return any;\n}"
          }
          trigger={
            props.attribute.value?.trim()
              ? props.attribute.value.trim()
              : "Click to open code editor."
          }
          onSave={(value) => {
            props.setValue(value || "");
          }}
        />

        <ValidationError>{fieldError}</ValidationError>
      </div>
    );
  },
);
