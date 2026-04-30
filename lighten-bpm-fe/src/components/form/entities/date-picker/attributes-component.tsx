import { DateTimeIcon } from "@/components/icons";
import { DefaultDateValueAttribute } from "../../attributes/default-date-value/component";
import { LabelAttribute } from "../../attributes/label/component";
import AttributePanelHeader from "../attribute-panel-header";
import { EntityKey } from "@/types/form-builder";
import Accordion from "@ui/accordion";
import { NameAttribute } from "../../attributes/name/component";
import { FlowTypeAttribute } from "../../attributes/flow-type/component";
import { DateSubtypeAttribute } from "../../attributes/date-subtype/component";
import { ValidatorAttribute } from "../../attributes/validator/component";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function DatePickerFieldAttributes() {
  return (
    <>
      <AttributePanelHeader
        icon={<DateTimeIcon className="text-yellow fill-yellow-dark" />}
        componentType={EntityKey.datePickerField}
      />
      <Accordion
        key={EntityKey.datePickerField}
        defaultOpenAll
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <NameAttribute />
                <LabelAttribute />
                <DefaultDateValueAttribute />
                <DateSubtypeAttribute />
                <VisibilityAttributes type={EntityKey.datePickerField} />
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
    </>
  );
}
