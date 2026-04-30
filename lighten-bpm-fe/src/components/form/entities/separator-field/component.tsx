import { createEntityComponent } from "@coltorapps/builder-react";
import { separatorFieldEntity } from "./definition";

export const SeparatorFieldEntity = createEntityComponent(
  separatorFieldEntity,
  function SeparatorFieldEntity({ entity }) {
    return (
      <div className="w-full" role="presentation" aria-hidden="true">
        <div className="relative flex items-center">
          <div className="flex-1 border-t border-stroke" />
          <div className="flex-1 border-t border-stroke" />
        </div>
      </div>
    );
  },
);
