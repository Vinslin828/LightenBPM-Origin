import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { useEffect, useState } from "react";

import { defaultDateValueAttribute } from "./definition";
import { DatePicker, DateTimePicker, TimePicker } from "@ui/datetime-selector";
import { DateSubtype, DATE_SUBTYPE_EVENT } from "../date-subtype/definition";
import CodeToggle from "@ui/code-toggle";
import { useCodeBuilder } from "@/hooks/useCode/useCodeBuilder";
import CodeEditButton from "@ui/button/code-edit-button";

export const DefaultDateValueAttribute = createAttributeComponent(
  defaultDateValueAttribute,
  function DefaultDateValueAttribute(props) {
    const { validateReference } = useCodeBuilder();
    const [expressionError, setExpressionError] = useState<string | undefined>(
      undefined,
    );
    const subtypeFromEntity =
      (props.entity?.attributes?.dateSubtype as DateSubtype | undefined) ||
      "date";
    const [currentSubtype, setCurrentSubtype] =
      useState<DateSubtype>(subtypeFromEntity);
    const attributeValue = props.attribute.value ?? {
      isReference: false,
      value: undefined,
      reference: "",
    };

    useEffect(() => {
      setCurrentSubtype(subtypeFromEntity);
    }, [subtypeFromEntity]);

    useEffect(() => {
      if (typeof window === "undefined") return;
      const handler = (
        event: CustomEvent<{ entityId?: string; subtype: DateSubtype }>,
      ) => {
        const detail = event.detail;
        if (!detail) return;
        if (detail.entityId && detail.entityId !== props.entity?.id) return;
        setCurrentSubtype(detail.subtype);
        props.setValue({ isReference: false, value: undefined });
      };
      const listener = handler as EventListener;
      window.addEventListener(DATE_SUBTYPE_EVENT, listener);
      return () => {
        window.removeEventListener(DATE_SUBTYPE_EVENT, listener);
      };
    }, [props.entity?.id, props.setValue]);

    const value =
      typeof attributeValue.value === "number"
        ? attributeValue.value
        : undefined;

    const renderPicker = () => {
      const pickerProps = {
        name: props.attribute.name,
        value,
        onChange: (timestamp?: number) => {
          setExpressionError(undefined);
          props.setValue({ isReference: false, value: timestamp });
        },
      };

      switch (currentSubtype) {
        case "time":
          return <TimePicker {...pickerProps} />;
        case "datetime":
          return <DateTimePicker {...pickerProps} />;
        case "date":
        default:
          return <DatePicker {...pickerProps} />;
      }
    };

    return (
      <div>
        <div className="flex flex-row items-center justify-between pb-1.5">
          <Label htmlFor={props.attribute.name}>Default Value</Label>
          <CodeToggle
            value={attributeValue.isReference ? "code" : "manual"}
            onChange={(value) => {
              setExpressionError(undefined);
              props.setValue({
                isReference: value === "code",
                value: undefined,
                reference: "",
              });
            }}
          />
        </div>
        {attributeValue.isReference ? (
          <CodeEditButton
            variant="reference"
            value={String(attributeValue.reference ?? "")}
            trigger={attributeValue.reference}
            onSave={(nextValue) => {
              const result = validateReference(nextValue);
              if (!result.isValid) {
                setExpressionError(result.errors[0]);
                return;
              }
              setExpressionError(undefined);
              props.setValue({
                ...attributeValue,
                reference: nextValue,
              });
            }}
          />
        ) : (
          renderPicker()
        )}
        <ValidationError>
          {expressionError ??
            formatError(props.attribute.value, props.attribute.error)
              ?._errors?.[0]}
        </ValidationError>
      </div>
    );
  },
);
