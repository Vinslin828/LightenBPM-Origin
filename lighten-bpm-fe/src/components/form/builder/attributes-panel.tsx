import { attributesPanelComponents } from "@/const/form-builder";
import {
  BuilderEntityAttributes,
  useBuilderStore,
} from "@coltorapps/builder-react";
import AttributePanelHeader from "../entities/attribute-panel-header";
import { SettingsIcon } from "@/components/icons";
import { EntityKey } from "@/types/form-builder";
import FormSetting from "./form-setting";

type Props = {
  activeEntityId: string | null;
  builderStore: ReturnType<typeof useBuilderStore>;
};

export default function AttributesPanel({
  activeEntityId,
  builderStore,
}: Props) {
  if (!activeEntityId || !builderStore.getEntity(activeEntityId)) {
    return <FormSetting />;
  }
  return (
    <div className="border-l border-gray-200 sticky right-0 flex-1 max-w-[360px] overflow-y-auto bg-white">
      <BuilderEntityAttributes
        entityId={activeEntityId}
        builderStore={builderStore}
        components={attributesPanelComponents}
      />
    </div>
  );
}
