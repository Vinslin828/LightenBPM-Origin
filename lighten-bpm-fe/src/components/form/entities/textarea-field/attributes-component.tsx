import Accordion from "@ui/accordion";
import { DefaultStringValueAttribute } from "../../attributes/default-string-value/component";
import { DisabledAttribute } from "../../attributes/disabled/component";
import { FlowTypeAttribute } from "../../attributes/flow-type/component";
import { LabelAttribute } from "../../attributes/label/component";
import { NameAttribute } from "../../attributes/name/component";
import { PlaceholderAttribute } from "../../attributes/placeholder/component";
import { ReadonlyAttribute } from "../../attributes/readonly/component";
import { RequiredAttribute } from "../../attributes/required/component";
import { WidthAttribute } from "../../attributes/width/component";
import { TextareaIcon } from "@/components/icons";
import AttributePanelHeader from "../attribute-panel-header";
import { EntityKey } from "@/types/form-builder";
import { ValidatorAttribute } from "../../attributes/validator/component";
import { HideAttribute } from "../../attributes/hide/component";
import { VISIBILITY_OPTIONS, DEFAULT_VISIBILITY_OPTIONS } from "@/const/flow";
import { VisibilityAction } from "@/types/flow";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function TextareaFieldAttributes() {
  const visibilityOptions =
    VISIBILITY_OPTIONS[EntityKey.textField] ?? DEFAULT_VISIBILITY_OPTIONS;
  return (
    <>
      <WidthAttribute />
      <AttributePanelHeader
        icon={<TextareaIcon className="text-yellow fill-yellow-dark" />}
        componentType={EntityKey.textareaField}
      />
      <Accordion
        key={EntityKey.textareaField}
        defaultOpenAll
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <NameAttribute />
                <LabelAttribute />
                <PlaceholderAttribute />
                <DefaultStringValueAttribute />
                <VisibilityAttributes type={EntityKey.textareaField} />
              </div>
            ),
          },
          {
            key: "validator",
            name: "Validation",
            content: <ValidatorAttribute />,
          },
          {
            key: "flow-type",
            name: "Flow Type",
            content: <FlowTypeAttribute />,
          },
        ]}
      />

      {/* <InputTypeAttribute />
      <FlowTypeAttribute /> */}
    </>
  );
}
