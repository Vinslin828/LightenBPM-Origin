import { Dispatch, SetStateAction } from "react";
import { BuilderStore } from "@coltorapps/builder";
import { basicFormBuilder } from "./definition";
import AttributesPanel from "./attributes-panel";
import Palette from "./palette";
import Canvas from "./canvas";
import { DndContainer } from "@/components/dnd";
import { formBuilderConfig, getDefaultAttributes } from "@/const/form-builder";

type Props = {
  builderStore: BuilderStore<typeof basicFormBuilder>;
  activeEntityId: string | null;
  setActiveEntityId: Dispatch<SetStateAction<string | null>>;
};

export function BasicFormBuilder({
  builderStore,
  activeEntityId,
  setActiveEntityId,
}: Props) {
  return (
    <DndContainer
      builderStore={builderStore}
      onPaletteDrop={(entityType, index) => {
        const entityKey = entityType as keyof typeof formBuilderConfig;
        const newEntity = builderStore.addEntity({
          type: entityKey,
          attributes: getDefaultAttributes(entityKey),
          index,
        } as Parameters<typeof builderStore.addEntity>[0]);
        setActiveEntityId(newEntity.id);
      }}
    >
      {({ draggingId, paletteDropIndex }) => (
        <div className="flex flex-row h-full">
          <Palette
            addEntity={builderStore.addEntity}
            formTemplates={[]}
            setActiveEntityId={setActiveEntityId}
            activeEntityId={activeEntityId}
            builderStore={builderStore}
          />
          <Canvas
            activeEntityId={activeEntityId}
            setActiveEntityId={setActiveEntityId}
            builderStore={builderStore}
            draggingId={draggingId}
            paletteDropIndex={paletteDropIndex}
          />
          <AttributesPanel
            activeEntityId={activeEntityId}
            builderStore={builderStore}
          />
        </div>
      )}
    </DndContainer>
  );
}
