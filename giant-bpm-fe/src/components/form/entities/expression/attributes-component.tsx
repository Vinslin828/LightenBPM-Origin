import Accordion from "@ui/accordion";

import { ExpressionIcon } from "@/components/icons";
import { NameAttribute } from "../../attributes/name/component";
import { LabelAttribute } from "../../attributes/label/component";
import AttributePanelHeader from "../attribute-panel-header";
import { EntityKey } from "@/types/form-builder";
import { ExpressionAttribute } from "../../attributes/expression/component";
import { DisabledAttribute } from "../../attributes/disabled/component";
import { HideAttribute } from "../../attributes/hide/component";
import { ReadonlyAttribute } from "../../attributes/readonly/component";
import { RequiredAttribute } from "../../attributes/required/component";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function ExpressionFieldAttributes() {
  return (
    <>
      <AttributePanelHeader
        icon={<ExpressionIcon className="text-secondary-text" />}
        componentType={EntityKey.expressionField}
        className="bg-gray-2 border-secondary-text"
      />
      <Accordion
        key={EntityKey.expressionField}
        defaultOpenAll
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <NameAttribute />
                <LabelAttribute />
                <ExpressionAttribute />
                <VisibilityAttributes type={EntityKey.expressionField} />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
