import { WidthAttribute } from "../../attributes/width/component";
import { LabelAttribute } from "../../attributes/label/component";
import { PlaceholderAttribute } from "../../attributes/placeholder/component";
import { RequiredAttribute } from "../../attributes/required/component";
import AttributePanelHeader from "../attribute-panel-header";
import { DropdownIcon } from "@/components/icons";
import { EntityKey } from "@/types/form-builder";
import { NameAttribute } from "../../attributes/name/component";
import { FlowTypeAttribute } from "../../attributes/flow-type/component";
import { DatasourceTypeAttribute } from "../../attributes/datasource/component";
import { SelectAdvancedSettingAttribute } from "../../attributes/select-advanced-setting/component";
import Accordion from "@ui/accordion";
import { ValidatorAttribute } from "../../attributes/validator/component";
import { DisabledAttribute } from "../../attributes/disabled/component";
import { HideAttribute } from "../../attributes/hide/component";
import { ReadonlyAttribute } from "../../attributes/readonly/component";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function SelectFieldAttributes() {
  return (
    <>
      <AttributePanelHeader
        icon={<DropdownIcon className="text-secondary" />}
        componentType={EntityKey.selectField}
        className="bg-secondary/10 border-secondary"
      />
      <Accordion
        key={EntityKey.selectField}
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <NameAttribute />
                <LabelAttribute />
                <PlaceholderAttribute />
                <VisibilityAttributes type={EntityKey.selectField} />
              </div>
            ),
          },
          {
            key: "data-source",
            name: <div>Data Source</div>,
            content: (
              <div className="flex flex-col gap-4">
                <DatasourceTypeAttribute />
              </div>
            ),
            contentClassName: "p-0",
          },
          {
            key: "select-advanced",
            name: "Advanced Setting",
            content: (
              <div className="flex flex-col gap-4">
                <SelectAdvancedSettingAttribute />
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
