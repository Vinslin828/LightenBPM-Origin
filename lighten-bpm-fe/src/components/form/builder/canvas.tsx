import { ReactNode, createContext, Dispatch, SetStateAction } from "react";
import { BuilderStore } from "@coltorapps/builder";
import {
  BuilderEntities,
  useBuilderStoreData,
} from "@coltorapps/builder-react";
import { useDroppable } from "@dnd-kit/core";

import { CANVAS_DROP_ZONE_ID, DndItem } from "@/components/dnd";
import { cn } from "@/utils/cn";
import { entitiesComponents, getEntityLabelKey } from "@/const/form-builder";
import { Button } from "@ui/button";
import { TrashIcon } from "@/components/icons";
import { useTranslation } from "react-i18next";
import { EntityKey, ContainerDefaults } from "@/types/form-builder";
import { basicFormBuilder } from "./definition";

export const FormBuilderModeContext = createContext<boolean>(false);

type Props = {
  builderStore: BuilderStore<typeof basicFormBuilder>;
  activeEntityId: string | null;
  setActiveEntityId: Dispatch<SetStateAction<string | null>>;
  draggingId?: string | null;
  paletteDropIndex?: number | null;
};

export default function Canvas({
  builderStore,
  activeEntityId,
  setActiveEntityId,
  draggingId,
  paletteDropIndex,
}: Props) {
  const { isOver, setNodeRef } = useDroppable({
    id: CANVAS_DROP_ZONE_ID,
  });
  const {
    schema: { root },
  } = useBuilderStoreData(builderStore, (events) =>
    events.some(
      (event) => event.name === "RootUpdated" || event.name === "DataSet",
    ),
  );

  return (
    <div className="flex-1 flex flex-col max-h-full overflow-y-auto bg-[size:25px_25px] bg-[radial-gradient(circle_at_2px_2px,#dfe0e4_2px,#E5E7EB_2px)]">
      <div
        ref={setNodeRef}
        className="flex-1 p-12"
        onClick={() => {
          setActiveEntityId(null);
        }}
      >
        {!root.length ? (
          <div
            className={cn(
              "h-full flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-transparent transition-colors relative",
              isOver && "border-lighten-blue bg-lighten-blue/10",
            )}
          >
            {paletteDropIndex !== null && <DropIndicator />}
            <span className="text-primary-text text-lg">Build your form</span>
            <span className="text-secondary-text text-base font-body-small-regular">
              Drag and drop components here to start designing.
            </span>
          </div>
        ) : (
          <FormBuilderModeContext.Provider value={true}>
            <div
              className={cn(
                "min-h-full rounded-lg border border-dashed border-transparent transition-colors",
                isOver && "border-lighten-blue bg-lighten-blue/5",
              )}
            >
              {paletteDropIndex === 0 && <DropIndicator />}
              <BuilderEntities
                builderStore={builderStore}
                components={entitiesComponents}
              >
                {(props) => {
                  const parentEntity = props.entity.parentId
                    ? builderStore.getEntity(props.entity.parentId)
                    : null;
                  const rootIndex = root.indexOf(props.entity.id);
                  const isRootEntity = rootIndex >= 0;

                  return (
                    <>
                      <DndItem
                        id={props.entity.id}
                        className={cn(
                          "bg-white first:rounded-t-md last:rounded-b-md flex-1 flex flex-col overflow-hidden",
                          {
                            "bg-transparent": props.entity.type === "container",
                            "rounded-md": parentEntity?.type === "container",
                          },
                        )}
                      >
                        <Entity
                          builderStore={builderStore}
                          entityId={props.entity.id}
                          isActive={
                            activeEntityId === props.entity.id &&
                            draggingId !== props.entity.id
                          }
                          isDragging={draggingId === props.entity.id}
                          onFocus={() =>
                            activeEntityId === props.entity.id
                              ? setActiveEntityId(null)
                              : setActiveEntityId(props.entity.id)
                          }
                          onDelete={() =>
                            builderStore.deleteEntity(props.entity.id)
                          }
                        >
                          {props.children}
                        </Entity>
                      </DndItem>
                      {isRootEntity && paletteDropIndex === rootIndex + 1 && (
                        <DropIndicator />
                      )}
                    </>
                  );
                }}
              </BuilderEntities>
            </div>
          </FormBuilderModeContext.Provider>
        )}
      </div>
    </div>
  );
}

function DropIndicator() {
  return (
    <div className="relative h-3 pointer-events-none">
      <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-lighten-blue" />
      <div className="absolute left-0 top-1/2 size-2 -translate-y-1/2 rounded-full bg-lighten-blue" />
    </div>
  );
}

function Entity(props: {
  entityId: string;
  children: ReactNode;
  isActive: boolean;
  isDragging: boolean;
  onFocus?: () => void;
  onDelete?: () => void;
  builderStore: BuilderStore<typeof basicFormBuilder>;
}) {
  const { entitiesAttributesErrors } = useBuilderStoreData(
    props.builderStore,
    (events) =>
      events.some(
        (event) =>
          (event.name === "EntityAttributeErrorUpdated" &&
            event.payload.entity.id === props.entityId) ||
          event.name === "DataSet",
      ),
  );
  const { t } = useTranslation("translation", {
    keyPrefix: "form_builder.entities",
  });
  const entity = props.builderStore.getEntity(props.entityId);

  if (!entity) return null;

  const { type, attributes } = entity;

  const isContainer = type === EntityKey.container;
  const columnLabel = isContainer
    ? ` (${t("n_columns", {
        count:
          (attributes as unknown as ContainerDefaults).containerColumns ?? 2,
      })})`
    : "";

  return (
    <div
      className={cn(
        "flex flex-col w-full min-w-full hover:inset-ring-2 hover:inset-ring-lighten-blue hover:rounded-md flex-1 p-4 bg-white",
        {
          "inset-ring-lighten-blue inset-ring-2 rounded-md bg-lighten-blue/10":
            props.isActive || props.isDragging,
          "border-destructive":
            !props.isActive &&
            entitiesAttributesErrors[props.entityId] &&
            !props.isDragging,
        },
      )}
      onFocusCapture={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        props.onFocus?.();
      }}
    >
      <div className="flex flex-row justify-between">
        {(props.isDragging || props.isActive) && (
          <span className="text-primary-text text-xs font-base pb-3">
            {`${t(getEntityLabelKey(type) ?? "unknown")}${columnLabel}`}
          </span>
        )}
        {props.isActive && (
          <Button
            variant="icon"
            icon={<TrashIcon className="text-red" />}
            className="p-0 bg-red-50 rounded-full h-5 w-5 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              props.onDelete?.();
            }}
            onPointerDown={(e) => {
              props.onDelete?.();
              e.stopPropagation();
            }}
          />
        )}
      </div>

      <div
        className={cn("flex-1 flex flex-col justify-start", {
          "pointer-events-none": !isContainer,
        })}
      >
        {!isContainer ? (
          <div className="flex justify-end pointer-events-auto min-w-0" />
        ) : null}
        {props.children}
      </div>
    </div>
  );
}
