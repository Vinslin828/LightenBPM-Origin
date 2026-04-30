import { LabelAttribute } from "../../attributes/label/component";

import AttributePanelHeader from "../attribute-panel-header";
import { GridIcon } from "@/components/icons";
import { EntityKey } from "@/types/form-builder";
import Accordion from "@ui/accordion";
import { NameAttribute } from "../../attributes/name/component";
import { RowConfigAttribute } from "../../attributes/row-config/component";
import { GridHeaderAttribute } from "../../attributes/grid-header/component";
import { useAtom } from "jotai";
import { selectedGridHeaderAtom } from "@/store";
import HeaderItemAttribute from "./header-item-attribute";
import { HideAttribute } from "../../attributes/hide/component";
import { ReadonlyAttribute } from "../../attributes/readonly/component";
import VisibilityAttributes from "../../attributes/visibility-attributes";

export function GridAttributes() {
  return <GridAttributesContent />;
}

function GridAttributesContent() {
  const [selectedGridHeader] = useAtom(selectedGridHeaderAtom);

  if (selectedGridHeader) {
    return (
      <HeaderItemAttribute
        entityId={selectedGridHeader.entityId}
        headerKey={selectedGridHeader.headerKey}
      />
    );
  }
  return (
    <>
      <AttributePanelHeader
        icon={<GridIcon className="text-secondary-text" />}
        componentType={EntityKey.grid}
        className="bg-gray-2 border-secondary-text"
      />
      <Accordion
        key={EntityKey.grid}
        items={[
          {
            name: "General",
            content: (
              <div className="flex flex-col gap-4">
                <NameAttribute />
                <LabelAttribute />
                <RowConfigAttribute />
                <VisibilityAttributes type={EntityKey.grid} />
              </div>
            ),
            key: "general",
          },
          {
            name: "Header Items",
            content: (
              <div className="flex flex-col gap-4">
                <GridHeaderAttribute />
              </div>
            ),
            key: "header-items",
          },
        ]}
      />
    </>
  );
}
