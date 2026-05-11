import { createAttributeComponent } from "@coltorapps/builder-react";

import CodeEditButton from "@ui/button/code-edit-button";
import { Label } from "@/components/ui/label";
import { Toggle } from "@/components/ui/toggle";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { dynamicStatusAttribute } from "./definition";

const DEFAULT_DYNAMIC_STATUS_EXPRESSION =
  "function expression() {\n  return [];\n}";

export const DynamicStatusAttribute = createAttributeComponent(
  dynamicStatusAttribute,
  function DynamicStatusAttribute(props) {
    const value = props.attribute.value ?? {
      enabled: false,
      expression: "",
    };
    const expression = value.expression?.trim()
      ? value.expression
      : DEFAULT_DYNAMIC_STATUS_EXPRESSION;

    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={props.attribute.name} className="text-sm font-medium">
            Dynamic Status
          </Label>
          <Toggle
            pressed={Boolean(value.enabled)}
            onPressedChange={(pressed) => {
              props.setValue({
                enabled: pressed,
                expression,
              });
            }}
          />
        </div>

        {value.enabled && (
          <CodeEditButton
            variant="validation"
            validationReturnType="any"
            showApiToggle={false}
            value={expression}
            trigger={expression}
            onSave={(nextExpression) => {
              props.setValue({
                enabled: true,
                expression: nextExpression,
              });
            }}
          />
        )}

        <p className="text-xs text-secondary-text">
          Return status codes: HD, SH, RQ, RO, DS.
        </p>

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
