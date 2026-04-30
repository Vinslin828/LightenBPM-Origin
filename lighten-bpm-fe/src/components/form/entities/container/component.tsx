import React, {
  useEffect,
  useRef,
  useCallback,
  useId,
  useMemo,
  useContext,
} from "react";
import { createEntityComponent } from "@coltorapps/builder-react";
import { containerEntity } from "./definition";
import { useAtom, useAtomValue } from "jotai";
import { activeEntityIdAtom, activeSlotAtom, builderStoreAtom } from "@/store";
import { cn } from "@/utils/cn";
import { useTranslation } from "react-i18next";
import { FormBuilderModeContext } from "@/components/form/builder/canvas";

export const ContainerEntity = createEntityComponent(
  containerEntity,
  function ContainerEntity(props) {
    const id = useId();
    const { t } = useTranslation("translation", {
      keyPrefix: "form_builder",
    });
    const isFormBuilderMode = useContext(FormBuilderModeContext);
    const builderStore = useAtomValue(builderStoreAtom);
    const containerRef = useRef<HTMLDivElement>(null);
    const columns = (props.entity.attributes.containerColumns as number) ?? 2;
    const columnRatios =
      (props.entity.attributes.columnWidths as number[]) ||
      Array(columns).fill(1);

    const [activeSlot, setActiveSlot] = useAtom(activeSlotAtom);
    const activeSlotRef = useRef(activeSlot);
    activeSlotRef.current = activeSlot;
    const [activeEntityId, setActiveEntityId] = useAtom(activeEntityIdAtom);
    const slotMap =
      (props.entity.attributes.slotMapping as Record<string, number>) ?? {};

    const childrenIds = props.entity.children ?? [];

    const isSelectedEntity = activeEntityId === props.entity.id;

    const getChildForSlot = (
      slotIndex: number,
    ): { node: React.ReactNode; entityId: string } | null => {
      const childIdx = childrenIds.findIndex(
        (childId, idx) =>
          (childId in slotMap ? slotMap[childId] : idx) === slotIndex,
      );

      if (childIdx === -1 || !props.children) return null;
      return {
        node: props.children[childIdx],
        entityId: childrenIds[childIdx],
      };
    };

    const activeSlotIndex = useMemo(() => {
      // 1. 如果有明確指定的 activeSlot（通常是點擊空格子時）
      if (activeSlot?.entityId === props.entity.id) return activeSlot.slotIndex;
      // 2. 如果目前選中的實體是我的子元件，則自動顯示該子元件所在的格子手把
      if (activeEntityId && childrenIds.includes(activeEntityId)) {
        return slotMap[activeEntityId] ?? -1;
      }
      return -1;
    }, [
      activeSlot,
      activeEntityId,
      childrenIds,
      slotMap,
      props.entity.id,
      isSelectedEntity,
    ]);

    const handleSlotClick = (e: React.MouseEvent, index: number) => {
      if (!isFormBuilderMode) return;
      e.stopPropagation();
      setActiveEntityId(props.entity.id);
      setActiveSlot({ entityId: props.entity.id, slotIndex: index });
    };

    const handleResize = useCallback(
      (leftIndex: number, deltaPx: number, startRatios: number[]) => {
        if (!containerRef.current) return;
        const containerWidth = containerRef.current.offsetWidth;
        const totalGapWidth = (columns - 1) * 8; // gap-2 is 8px
        const availableWidth = containerWidth - totalGapWidth;

        if (availableWidth <= 0) return;

        const totalRatio = startRatios.reduce((a, b) => a + b, 0);
        const ratioPerPx = totalRatio / availableWidth;
        const deltaRatio = deltaPx * ratioPerPx;

        const nextRatios = [...startRatios];
        let leftR = startRatios[leftIndex] + deltaRatio;
        let rightR = startRatios[leftIndex + 1] - deltaRatio;

        const minRatio = (120 / availableWidth) * totalRatio;

        // 強迫鉗制數值，確保總和不變且不低於最小值，避免影響其他欄位比例
        if (leftR < minRatio) {
          leftR = minRatio;
          rightR =
            startRatios[leftIndex] + startRatios[leftIndex + 1] - minRatio;
        } else if (rightR < minRatio) {
          rightR = minRatio;
          leftR =
            startRatios[leftIndex] + startRatios[leftIndex + 1] - minRatio;
        }

        nextRatios[leftIndex] = leftR;
        nextRatios[leftIndex + 1] = rightR;

        builderStore?.setEntityAttribute(
          props.entity.id,
          "columnWidths",
          nextRatios,
        );
      },
      [columns, builderStore, props.entity.id],
    );

    useEffect(() => {
      if (columnRatios.length !== columns) {
        // 當欄位數量改變時，重置為等比 (1:1:1...)
        const defaultRatios = Array(columns).fill(1);
        builderStore?.setEntityAttribute(
          props.entity.id,
          "columnWidths",
          defaultRatios,
        );

        // 清理超出新欄位數量的 orphaned slotMapping
        const hasOrphaned = Object.values(slotMap).some((s) => s >= columns);
        if (hasOrphaned) {
          const cleaned = Object.fromEntries(
            Object.entries(slotMap).filter(([, s]) => s < columns),
          );
          builderStore?.setEntityAttribute(
            props.entity.id,
            "slotMapping",
            cleaned,
          );
        }
      }
    }, [columns, columnRatios.length, builderStore, props.entity.id, slotMap]);

    useEffect(() => {
      if (
        activeEntityId !== props.entity.id &&
        activeSlotRef.current?.entityId === props.entity.id
      ) {
        setActiveSlot(null);
      }
    }, [activeEntityId, props.entity.id, setActiveSlot]);

    return (
      <div
        ref={containerRef}
        className="flex gap-2 w-full items-stretch flex-1 flex-wrap"
        id={id}
      >
        {Array.from({ length: columns }, (_, index) => {
          const ratio = columnRatios[index] ?? 1;
          const isThisSlotActive = index === activeSlotIndex;

          const childResult = getChildForSlot(index);
          const hasChild = childResult !== null;

          return (
            <div
              key={index}
              onClick={(e) => handleSlotClick(e, index)}
              style={{ "--flex-ratio": ratio } as React.CSSProperties}
              className={cn(
                "relative rounded-md flex flex-col min-h-[100px]",
                "flex-[var(--flex-ratio)_0_0%] min-w-[120px]",
                "bg-white/60",
                !isFormBuilderMode
                  ? "border-transparent"
                  : "border transition-[border-color,background-color]",
                isFormBuilderMode && hasChild && "border-0 bg-white",
                isFormBuilderMode &&
                  !hasChild &&
                  "border-dashed items-center justify-center cursor-pointer",
                isFormBuilderMode &&
                  isThisSlotActive &&
                  "border-blue-500 border-solid bg-white",
                isFormBuilderMode &&
                  !isThisSlotActive &&
                  !hasChild &&
                  "border-gray-300 hover:bg-white",
              )}
            >
              {hasChild ? (
                childResult.node
              ) : isFormBuilderMode ? (
                <p className="text-xs text-secondary-text text-center  pointer-events-none">
                  {t("container_slot_empty")}
                </p>
              ) : null}

              {/* Resize Handles */}
              {isFormBuilderMode && isThisSlotActive && index > 0 && (
                <ResizeHandle
                  side="left"
                  startRatios={columnRatios}
                  onResize={(d, start) => handleResize(index - 1, d, start)}
                />
              )}
              {isFormBuilderMode && isThisSlotActive && index < columns - 1 && (
                <ResizeHandle
                  side="right"
                  startRatios={columnRatios}
                  onResize={(d, start) => handleResize(index, d, start)}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  },
);

const ResizeHandle = ({
  onResize,
  startRatios,
  side,
}: {
  onResize: (delta: number, startRatios: number[]) => void;
  startRatios: number[];
  side: "left" | "right";
}) => {
  const [isResizing, setIsResizing] = React.useState(false);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const initialRatios = [...startRatios];

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      onResize(deltaX, initialRatios);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      setIsResizing(false);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);

      // 如果有位移，則捕捉並攔截接下來的 click 事件，避免觸發背景的 unselect
      const endX = upEvent.clientX;
      if (Math.abs(endX - startX) > 3) {
        const preventNextClick = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          window.removeEventListener("click", preventNextClick, true);
        };
        window.addEventListener("click", preventNextClick, true);
        // 100ms 後自動移除，防止意外攔截到真正的點擊
        setTimeout(() => {
          window.removeEventListener("click", preventNextClick, true);
        }, 100);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        "absolute top-1/2 -translate-y-1/2 w-4 h-12 flex items-center justify-center cursor-col-resize z-50 group",
        side === "left" ? "-left-2" : "-right-2",
      )}
    >
      <div
        className={cn(
          "w-1.5 h-12 bg-white border border-lighten-blue rounded-full flex flex-col items-center justify-center gap-0.5 shadow-sm transition-all",
          "group-hover:h-16",
          "group-hover:w-2",
          isResizing && "h-16 w-2 bg-lighten-blue",
        )}
      />
    </div>
  );
};
