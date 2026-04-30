import { Dispatch, SetStateAction } from "react";
import { BuilderStore } from "@coltorapps/builder";
import { basicFormBuilder } from "./definition";
import AttributesPanel from "./attributes-panel";
import Palette from "./palette";
import Canvas from "./canvas";

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
      />
      <AttributesPanel
        activeEntityId={activeEntityId}
        builderStore={builderStore}
      />
    </div>
  );
}
