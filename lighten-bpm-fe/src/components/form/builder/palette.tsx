import { useBuilderStore } from "@coltorapps/builder-react";
import PaletteTile from "../entities/paletteTile";
import { EntityKey, PaleteGroup } from "@/types/form-builder";
import {
  formBuilderConfig,
  getDefaultAttributes,
  getEntityLabelKey,
  groupConfigs,
} from "@/const/form-builder";
import { Tabs } from "@/components/tabs";
import { FormDefinition } from "@/types/domain";
import { useTranslation } from "react-i18next";
import { BuilderStore } from "@coltorapps/builder";
import { basicFormBuilder } from "./definition";
import { activeSlotAtom } from "@/store";
import { useAtom } from "jotai";
import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PALETTE_DRAG_PREFIX } from "@/components/dnd";

type Props = {
  formTemplates: FormDefinition[];
  addEntity: ReturnType<typeof useBuilderStore>["addEntity"];
  activeEntityId?: string | null;
  builderStore?: BuilderStore<typeof basicFormBuilder>;
  setActiveEntityId: Dispatch<SetStateAction<string | null>>;
};

export default function Palette({
  addEntity,
  setActiveEntityId,
  activeEntityId,
  builderStore,
}: Props) {
  const { t } = useTranslation("translation", {
    keyPrefix: "form_builder.tabs",
  });

  return (
    <div className="flex flex-col border-r border-gray-200 w-2xs bg-gray-2">
      <Tabs
        items={[
          {
            label: t("template"),
            key: "template",
            children: <TemplateTabContent />,
          },
          {
            label: t("component"),
            key: "component",
            children: (
              <ComponentTabContent
                addEntity={addEntity}
                setActiveEntityId={setActiveEntityId}
                activeEntityId={activeEntityId}
                builderStore={builderStore}
              />
            ),
          },
        ]}
        defaultValue="component"
      />
    </div>
  );
}

function TemplateTabContent() {
  return (
    <div className="p-4 bg-transparent">
      <div className="text-center py-12 text-gray-500">
        <p>Template functionality coming soon...</p>
      </div>
    </div>
  );
}

function ComponentTabContent({
  addEntity,
  setActiveEntityId,
  activeEntityId,
  builderStore,
}: {
  addEntity: ReturnType<typeof useBuilderStore>["addEntity"];
  activeEntityId?: string | null;
  builderStore?: BuilderStore<typeof basicFormBuilder>;
  setActiveEntityId: Dispatch<SetStateAction<string | null>>;
}) {
  type FormBuilderConfigKey = keyof typeof formBuilderConfig;
  const allGroups = Object.entries(groupConfigs);
  const [activeSlot, setActiveSlot] = useAtom(activeSlotAtom);

  const groupsToShow = allGroups;

  return (
    <div
      className="px-1 py-4 space-y-6"
      onClick={() => {
        setActiveEntityId(null);
      }}
    >
      {groupsToShow.map(([groupKey, config]) => {
        const components = Object.entries(formBuilderConfig)
          .filter(
            ([entityKey, builderConfig]) =>
              builderConfig.palette?.group === (groupKey as PaleteGroup),
          )
          .map(([key, builderConfig]) => ({
            key: key as FormBuilderConfigKey,
            icon: builderConfig.palette.icon,
            labelKey: getEntityLabelKey(key as EntityKey),
          }));

        return (
          <div key={groupKey} className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
              <h4 className="text-sm font-medium text-gray-900">
                {config.name}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {components.map((component) => (
                <DraggablePaletteTile
                  key={component.key}
                  entityType={component.key}
                  icon={component.icon}
                  labelKey={component.labelKey}
                  onClick={() => {
                    // 取得該元件的預設屬性
                    const attributes = getDefaultAttributes(component.key);

                    // 檢查目前是否有選中任何「格子 (Slot)」
                    if (activeSlot && builderStore) {
                      const activeEntity = builderStore.getEntity(
                        activeSlot.entityId,
                      );
                      const isChildrenAllowed =
                        activeEntity &&
                        builderStore.builder.entities.find(
                          (e) => e.name === activeEntity.type,
                        )?.childrenAllowed;

                      if (isChildrenAllowed) {
                        // 👉 有選中格子，而且是合法容器，就把元件加進去！
                        // 注意：不能把 containerSlotIndex 塞進 attributes，因為 builder 會驗證 attribute key
                        const newEntity = addEntity({
                          type: component.key,
                          attributes,
                          parentId: activeSlot.entityId,
                        });

                        // 👉 把格子索引存進 container 的 slotMapping attribute
                        const currentMapping =
                          ((activeEntity.attributes as Record<string, unknown>)
                            .slotMapping as
                            | Record<string, number>
                            | undefined) ?? {};
                        builderStore.setEntityAttribute(
                          activeSlot.entityId,
                          "slotMapping",
                          {
                            ...currentMapping,
                            [newEntity.id]: activeSlot.slotIndex,
                          },
                        );

                        // 新增成功後，清空選中狀態（讓格子的藍框消失）
                        setActiveSlot(null);
                        setActiveEntityId(activeSlot.entityId);
                        return; // 結束執行
                      }
                    }

                    // 👉 如果沒有選中格子，或是選中的不是容器，就走原本的邏輯，加在最外層
                    addEntity({
                      type: component.key,
                      attributes,
                    });
                  }}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DraggablePaletteTile({
  entityType,
  icon,
  labelKey,
  onClick,
}: {
  entityType: string;
  icon: Parameters<typeof PaletteTile>[0]["icon"];
  labelKey: string;
  onClick: () => void;
}) {
  const suppressClickRef = useRef(false);
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `${PALETTE_DRAG_PREFIX}${entityType}`,
      data: {
        type: "palette",
        entityType,
      },
    });

  useEffect(() => {
    if (!isDragging) return;
    suppressClickRef.current = true;
  }, [isDragging]);

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? "z-50 w-full opacity-70" : "w-full"}
    >
      <PaletteTile
        icon={icon}
        labelKey={labelKey}
        onClick={() => {
          if (suppressClickRef.current) {
            setTimeout(() => {
              suppressClickRef.current = false;
            }, 0);
            return;
          }
          onClick();
        }}
      />
    </div>
  );
}
