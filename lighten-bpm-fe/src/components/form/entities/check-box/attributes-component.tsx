import { NameAttribute } from "../../attributes/name/component";
import { LabelAttribute } from "../../attributes/label/component";
import { OptionsAttribute } from "../../attributes/options/component";
import { FlowTypeAttribute } from "../../attributes/flow-type/component";
import AttributePanelHeader from "../attribute-panel-header";
import Accordion from "@ui/accordion";
import { CheckboxIcon } from "@/components/icons";
import { EntityKey } from "@/types/form-builder";
import { ValidatorAttribute } from "../../attributes/validator/component";
import { DefaultMultiOptionValueAttribute } from "../../attributes/default-multi-option-value/component";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function CheckboxFieldAttributes() {
  return (
    <>
      <AttributePanelHeader
        icon={<CheckboxIcon className="fill-secondary" />}
        componentType={EntityKey.checkboxField}
        className="bg-secondary/10 border-secondary"
      />
      <Accordion
        key={EntityKey.checkboxField}
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <NameAttribute />
                <LabelAttribute />
                <VisibilityAttributes type={EntityKey.checkboxField} />
              </div>
            ),
          },
          {
            key: "static-options",
            name: <div>Static Options </div>,
            content: (
              <div className="flex flex-col gap-4">
                <OptionsAttribute />
                <DefaultMultiOptionValueAttribute />
              </div>
            ),
          },
          {
            key: "validator",
            name: "Validation",
            content: <ValidatorAttribute />,
          },
          {
            key: "flow-related",
            name: "Flow Related",
            content: <FlowTypeAttribute />,
          },
        ]}
      />
    </>
  );
}
