import { WidthAttribute } from "../../attributes/width/component";
import { NameAttribute } from "../../attributes/name/component";
import { LabelAttribute } from "../../attributes/label/component";
import { InputTypeAttribute } from "../../attributes/input-type/component";
import { PlaceholderAttribute } from "../../attributes/placeholder/component";
import { DefaultStringValueAttribute } from "../../attributes/default-string-value/component";
import { FlowTypeAttribute } from "../../attributes/flow-type/component";
import Accordion from "@ui/accordion";
import { ManualIcon } from "@/components/icons";
import AttributePanelHeader from "../attribute-panel-header";
import { EntityKey } from "@/types/form-builder";
import { ValidatorAttribute } from "../../attributes/validator/component";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function TextFieldAttributes() {
  return (
    <>
      <WidthAttribute />
      <AttributePanelHeader
        icon={<ManualIcon className="text-yellow fill-yellow-dark" />}
        componentType={EntityKey.textField}
      />
      <Accordion
        key={EntityKey.textField}
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
                <VisibilityAttributes type={EntityKey.textField} />
              </div>
            ),
          },
          { key: "type", name: "Type", content: <InputTypeAttribute /> },

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
