import { WidthAttribute } from "../../attributes/width/component";
import { LabelAttribute } from "../../attributes/label/component";
import { ButtonTextAttribute } from "../../attributes/button-text/component";
import { TargetUrlAttribute } from "../../attributes/target-url/component";
import { IsButtonAttribute } from "../../attributes/is-button/component";
import { OpenNewTabAttribute } from "../../attributes/open-new-tab/component";
import { RequiredAttribute } from "../../attributes/required/component";
import AttributePanelHeader from "../attribute-panel-header";
import { UrlIcon } from "@/components/icons";
import { EntityKey } from "@/types/form-builder";
import Accordion from "@ui/accordion";
import { NameAttribute } from "../../attributes/name/component";
import { DisabledAttribute } from "../../attributes/disabled/component";
import { HideAttribute } from "../../attributes/hide/component";
import { ReadonlyAttribute } from "../../attributes/readonly/component";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function ButtonUrlAttributes() {
  return (
    <>
      <AttributePanelHeader
        icon={<UrlIcon className="text-purple" />}
        componentType={EntityKey.buttonUrl}
        className="bg-purple/10 border-purple"
      />
      <Accordion
        key={EntityKey.buttonUrl}
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
                <VisibilityAttributes type={EntityKey.buttonUrl} />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
