import { NameAttribute } from "../../attributes/name/component";
import { LabelAttribute } from "../../attributes/label/component";
import { ButtonTextAttribute } from "../../attributes/button-text/component";
import { ApiCodeAttribute } from "../../attributes/api-code/component";
import AttributePanelHeader from "../attribute-panel-header";
import { CodeIcon } from "@/components/icons";
import { EntityKey } from "@/types/form-builder";
import Accordion from "@ui/accordion";
import { HideResponseDataAttribute } from "../../attributes/hide-response-data/component";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function ButtonApiAttributes() {
  return (
    <>
      <AttributePanelHeader
        icon={<CodeIcon className="text-purple" />}
        componentType={EntityKey.buttonApi}
        className="bg-purple/10 border-purple"
      />
      <Accordion
        key={EntityKey.buttonApi}
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <NameAttribute />
                <LabelAttribute />
                <ButtonTextAttribute />
                <ApiCodeAttribute />
                <HideResponseDataAttribute />
                <VisibilityAttributes type={EntityKey.buttonApi} />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
