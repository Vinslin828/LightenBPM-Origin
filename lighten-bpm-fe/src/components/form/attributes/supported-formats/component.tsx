import React from "react";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { supportedFormatsAttribute } from "./definition";
import { DropdownSelect } from "@/components/ui/dropdown-select";

const AVAILABLE_FORMATS = ["PDF", "DOCX", "XLSX", "PPTX", "JPG", "JPEG", "PNG"];

export const SupportedFormatsAttribute = createAttributeComponent(
  supportedFormatsAttribute,
  function SupportedFormatsAttribute(props) {
    const value = Array.isArray(props.attribute.value)
      ? props.attribute.value
      : [];

    const hasError = !!formatError(props.attribute.value, props.attribute.error)
      ?._errors?.[0];

    return (
      <div className="flex flex-col gap-2 relative">
        <Label
          htmlFor={props.attribute.name}
          className="text-[16px] leading-[24px] font-medium text-[#111928] pb-0"
        >
          Supported file formats
        </Label>

        <DropdownSelect
          id={props.attribute.name}
          options={AVAILABLE_FORMATS}
          value={value}
          onChange={(newVal) => props.setValue(newVal)}
          multiple={true}
          placeholder="Select format"
          hasError={hasError}
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
