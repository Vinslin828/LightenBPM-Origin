import { WidthAttribute } from "../../attributes/width/component";
import { LabelAttribute } from "../../attributes/label/component";
import { ButtonTextAttribute } from "../../attributes/button-text/component";
import { TargetUrlAttribute } from "../../attributes/target-url/component";
import { IsButtonAttribute } from "../../attributes/is-button/component";
import { OpenNewTabAttribute } from "../../attributes/open-new-tab/component";
import { RequiredAttribute } from "../../attributes/required/component";
import AttributePanelHeader from "../attribute-panel-header";
import { ButtonIcon } from "@/components/icons";
import { EntityKey } from "@/types/form-builder";
import Accordion from "@ui/accordion";
import { NameAttribute } from "../../attributes/name/component";

export function ButtonUrlFieldAttributes() {
  return (
    <>
      <AttributePanelHeader
        icon={<ButtonIcon className="text-purple" />}
        componentType={EntityKey.buttonUrlField}
        className="bg-purple/10 border-purple"
      />
      <Accordion
        key={EntityKey.buttonUrlField}
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <NameAttribute />
                <LabelAttribute />
                <IsButtonAttribute />
                <ButtonTextAttribute />
                <TargetUrlAttribute />
                <OpenNewTabAttribute />
                {/* <RequiredAttribute /> */}
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
