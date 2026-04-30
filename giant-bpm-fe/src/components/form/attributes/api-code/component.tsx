import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { apiCodeAttribute } from "./definition";
import CodeEditButton from "@ui/button/code-edit-button";
import { ApiResponseType } from "@/hooks/useCode/types";

export const ApiCodeAttribute = createAttributeComponent(
  apiCodeAttribute,
  function ApiCodeAttribute(props) {
    const value = props.attribute.value || {
      returnType: "text",
      responseType: "json",
      code: "function getData() {\n  return '';\n}",
    };

    return (
      <div>
        <div>
          <Label htmlFor={props.attribute.name}>API Config</Label>
          <CodeEditButton
            variant="apiReturnType"
            value={value.code}
            apiResponseType={value.returnType as ApiResponseType}
            onSave={(code, _, __, ___, apiResponseType) => {
              props.setValue({
                ...value,
                code,
                returnType: (apiResponseType ?? value.returnType) as any,
              });
            }}
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
