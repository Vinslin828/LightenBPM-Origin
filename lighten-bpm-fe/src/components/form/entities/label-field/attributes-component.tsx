import { WidthAttribute } from "../../attributes/width/component";
import { NameAttribute } from "../../attributes/name/component";
import { RichTextAttributeComponent } from "../../attributes/rich-text/component";
import AttributePanelHeader from "../attribute-panel-header";
import { EntityKey } from "@/types/form-builder";
import { InputIcon } from "@/components/icons";
import Accordion from "@ui/accordion";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function LabelFieldAttributes() {
  return (
    <>
      <WidthAttribute />
      <AttributePanelHeader
        icon={<InputIcon className="text-yellow fill-yellow-dark" />}
        componentType={EntityKey.labelField}
      />
      <Accordion
        key={EntityKey.labelField}
        defaultOpenAll
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <NameAttribute />
                <RichTextAttributeComponent />
                <VisibilityAttributes type={EntityKey.labelField} />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
