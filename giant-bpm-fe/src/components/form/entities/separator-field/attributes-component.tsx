import { WidthAttribute } from "../../attributes/width/component";
import { LabelAttribute } from "../../attributes/label/component";
import { NameAttribute } from "../../attributes/name/component";
import AttributePanelHeader from "../attribute-panel-header";
import { EntityKey } from "@/types/form-builder";
import { SeparatorIcon } from "@/components/icons";
import Accordion from "@ui/accordion";
import { HideAttribute } from "../../attributes/hide/component";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function SeparatorFieldAttributes() {
  return (
    <>
      <AttributePanelHeader
        icon={<SeparatorIcon className="text-secondary-text" />}
        componentType={EntityKey.separatorField}
        className="border-secondary-text bg-gray-2"
      />
      <Accordion
        key={EntityKey.textareaField}
        defaultOpenAll
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <WidthAttribute />
                <NameAttribute />
                <LabelAttribute />
                <VisibilityAttributes type={EntityKey.separatorField} />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
