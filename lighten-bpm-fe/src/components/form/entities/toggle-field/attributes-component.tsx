import { LabelAttribute } from "../../attributes/label/component";
import { DefaultBooleanValueAttribute } from "../../attributes/default-boolean-value/component";

import AttributePanelHeader from "../attribute-panel-header";
import { ToggleIcon } from "@/components/icons";
import { EntityKey } from "@/types/form-builder";
import Accordion from "@ui/accordion";
import { NameAttribute } from "../../attributes/name/component";
import { FlowTypeAttribute } from "../../attributes/flow-type/component";
import { ValidatorAttribute } from "../../attributes/validator/component";

import VisibilityAttributes from "../../attributes/visibility-attributes";

export function ToggleFieldAttributes() {
  return (
    <>
      <AttributePanelHeader
        icon={<ToggleIcon className="text-secondary" />}
        componentType={EntityKey.toggleField}
        className="bg-secondary/10 border-secondary"
      />
      <Accordion
        key={EntityKey.toggleField}
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <NameAttribute />
                <LabelAttribute />
                <DefaultBooleanValueAttribute />
                <VisibilityAttributes type={EntityKey.toggleField} />
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
