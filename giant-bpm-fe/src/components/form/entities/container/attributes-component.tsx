import { WidthAttribute } from "../../attributes/width/component";
import { ContainerColumnsAttribute } from "../../attributes/container-columns/component";
import AttributePanelHeader from "../attribute-panel-header";
import { EntityKey } from "@/types/form-builder";
import { ContainerIcon } from "@/components/icons";
import Accordion from "@ui/accordion";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function ContainerAttributes() {
  return (
    <>
      <AttributePanelHeader
        icon={<ContainerIcon className="text-gray-500" />}
        componentType={EntityKey.container}
        className="border-gray-500 bg-gray-500/10"
      />
      <Accordion
        key={EntityKey.container}
        defaultOpenAll
        items={[
          {
            key: "general",
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <WidthAttribute />
                <ContainerColumnsAttribute />
                <VisibilityAttributes type={EntityKey.container} />
              </div>
            ),
          },
        ]}
      />
    </>
  );
}
