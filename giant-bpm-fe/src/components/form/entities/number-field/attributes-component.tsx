import { WidthAttribute } from "../../attributes/width/component";
import { LabelAttribute } from "../../attributes/label/component";
import { DefaultNumberValueAttribute } from "../../attributes/default-number-value/component";
import { MinAttribute } from "../../attributes/min/component";
import { MaxAttribute } from "../../attributes/max/component";
import { NumberIcon } from "@/components/icons";
import { NameAttribute } from "../../attributes/name/component";
import Accordion from "@ui/accordion";
import { DecimalDigitsAttribute } from "../../attributes/decimal-digits/component";
import AttributePanelHeader from "../attribute-panel-header";
import { EntityKey } from "@/types/form-builder";
import { ValidatorAttribute } from "../../attributes/validator/component";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function NumberFieldAttributes() {
  return (
    <>
      <WidthAttribute />
      <AttributePanelHeader
        componentType={EntityKey.numberField}
        icon={<NumberIcon className="text-yellow fill-yellow-dark" />}
      />

      <Accordion
        key={EntityKey.numberField}
        defaultOpenAll
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <NameAttribute />
                <LabelAttribute />
                <DefaultNumberValueAttribute />
                <DecimalDigitsAttribute />
                {/* <PlaceholderAttribute /> */}
                <MinAttribute />
                <MaxAttribute />
                <VisibilityAttributes type={EntityKey.numberField} />
              </div>
            ),
          },
          {
            key: "validator",
            name: "Validation",
            content: <ValidatorAttribute />,
          },
        ]}
      />

      {/* <InputTypeAttribute />
      <FlowTypeAttribute /> */}
    </>
  );
}
