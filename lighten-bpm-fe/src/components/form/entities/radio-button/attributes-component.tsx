import { LabelAttribute } from "../../attributes/label/component";
import { OptionsAttribute } from "../../attributes/options/component";
import { GroupDirectionAttribute } from "../../attributes/group-direction/component";
import { FlowTypeAttribute } from "../../attributes/flow-type/component";
import AttributePanelHeader from "../attribute-panel-header";
import { RadioIcon } from "@/components/icons";
import { EntityKey } from "@/types/form-builder";
import Accordion from "@ui/accordion";
import { NameAttribute } from "../../attributes/name/component";
import { DefaultOptionValueAttribute } from "../../attributes/default-option-value/component";
import { ValidatorAttribute } from "../../attributes/validator/component";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function RadioButtonAttributes() {
  return (
    <>
      <AttributePanelHeader
        icon={<RadioIcon className="fill-secondary" />}
        componentType={EntityKey.radioButton}
        className="bg-secondary/10 border-secondary"
      />
      <Accordion
        key={EntityKey.radioButton}
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <NameAttribute />
                <LabelAttribute />
                <VisibilityAttributes type={EntityKey.radioButton} />
              </div>
            ),
          },
          {
            key: "static-options",
            name: <div>Static Options </div>,
            content: (
              <div className="flex flex-col gap-4">
                <OptionsAttribute />
                <DefaultOptionValueAttribute />
              </div>
            ),
          },
          {
            key: "orientation",
            name: "Orientation",
            content: <GroupDirectionAttribute />,
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
