import AttributePanelHeader from "../attribute-panel-header";
import { EntityKey } from "@/types/form-builder";
import { LabelAttribute } from "../../attributes/label/component";
import { NameAttribute } from "../../attributes/name/component";
import { DecimalDigitsAttribute } from "../../attributes/decimal-digits/component";
import { DefaultCurrencyValueAttribute } from "../../attributes/default-currency-value/component";
import { CurrencyListAttribute } from "../../attributes/currency-list/component";
import { CurrencyCodeAttribute } from "../../attributes/currency-code/component";
import { AllowCurrencyChangeAttribute } from "../../attributes/allow-currency-change/component";
import Accordion from "@ui/accordion";
import { CurrencyIcon } from "@/components/icons";
import { FlowTypeAttribute } from "../../attributes/flow-type/component";
import { ValidatorAttribute } from "../../attributes/validator/component";

import VisibilityAttributes from "../../attributes/visibility-attributes";

export function CurrencyFieldAttributes() {
  return (
    <>
      <AttributePanelHeader
        icon={<CurrencyIcon className="text-yellow" />}
        componentType={EntityKey.currencyField}
        className="bg-yellow-light border-yellow"
      />
      <Accordion
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <NameAttribute />
                <LabelAttribute />
                <CurrencyListAttribute />
                <CurrencyCodeAttribute />
                <AllowCurrencyChangeAttribute />
                <DecimalDigitsAttribute />
                <DefaultCurrencyValueAttribute />
                <VisibilityAttributes type={EntityKey.currencyField} />
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
