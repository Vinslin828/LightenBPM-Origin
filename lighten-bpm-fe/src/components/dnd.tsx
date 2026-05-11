import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  closestCenter,
  type CollisionDetection,
  type DragEndEvent,
  type DragMoveEvent,
  DndContext,
  MouseSensor,
  pointerWithin,
  useSensor,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS as DndCSS } from "@dnd-kit/utilities";

import { type BuilderStore } from "@coltorapps/builder";
import { useBuilderStoreData } from "@coltorapps/builder-react";
import { cn } from "@/utils/cn";

export const CANVAS_DROP_ZONE_ID = "form-builder-canvas-drop-zone";
export const PALETTE_DRAG_PREFIX = "palette:";

type PaletteDragData = {
  type: "palette";
  entityType: string;
};

function getEventClientY(event: Event): number | null {
  if (event instanceof MouseEvent) {
    return event.clientY;
  }

  if (event instanceof TouchEvent) {
    const touch = event.touches[0] ?? event.changedTouches[0];
    return touch?.clientY ?? null;
  }

  return null;
}

function getPointerClientY(event: DragMoveEvent | DragEndEvent): number | null {
  const startY = getEventClientY(event.activatorEvent);
  if (startY === null) return null;
  return startY + event.delta.y;
}

function getCanvasDropIndex(
  pointerY: number | null,
  rootEntities: readonly string[],
): number {
  if (pointerY === null) {
    return rootEntities.length;
  }

  const rootElementRects = rootEntities
    .map((id) => {
      const element = document.querySelector<HTMLElement>(
        `[data-form-builder-entity-id="${window.CSS.escape(id)}"]`,
      );
      return element?.getBoundingClientRect();
    })
    .filter((rect): rect is DOMRect => Boolean(rect));

  if (!rootElementRects.length) {
    return 0;
  }

  const targetIndex = rootElementRects.findIndex(
    (rect) => pointerY < rect.top + rect.height / 2,
  );

  return targetIndex >= 0 ? targetIndex : rootElementRects.length;
}

const formBuilderCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  const directFieldCollisions = pointerCollisions.filter(
    (collision) => collision.id !== CANVAS_DROP_ZONE_ID,
  );

  if (directFieldCollisions.length > 0) {
    return directFieldCollisions;
  }

  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }

  return closestCenter(args);
};

export function DndItem(props: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  const {
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
    setNodeRef,
  } = useSortable({
    id: props.id,
  });

  const style = {
    transform: DndCSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(props.className, {
        "z-50": isDragging,
      })}
      aria-describedby="dnd"
      data-form-builder-entity-id={props.id}
    >
      {props.children}
    </div>
  );
}

export function DndContainer(props: {
  builderStore: BuilderStore;
  dragOverlay?: (props: { draggingId?: string | null }) => ReactNode;
  children: (props: {
    draggingId?: string | null;
    paletteDropIndex?: number | null;
  }) => ReactNode;
  calculateWidth?: (activeId: string, ids: string[]) => void;
  onPaletteDrop?: (entityType: string, index: number) => void;
}) {
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10,
    },
  });

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [paletteDropIndex, setPaletteDropIndex] = useState<number | null>(null);
  const pointerClientYRef = useRef<number | null>(null);

  const rootEntities = useBuilderStoreData(props.builderStore, (events) =>
    events.some(
      (event) => event.name === "RootUpdated" || event.name === "DataSet",
    ),
  ).schema.root;

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      pointerClientYRef.current = event.clientY;
    };
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0] ?? event.changedTouches[0];
      pointerClientYRef.current = touch?.clientY ?? null;
    };

    window.addEventListener("mousemove", handleMouseMove, true);
    window.addEventListener("touchmove", handleTouchMove, true);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove, true);
      window.removeEventListener("touchmove", handleTouchMove, true);
    };
  }, []);

  const updatePaletteDropIndex = (event: DragMoveEvent | DragEndEvent) => {
    const activeData = event.active.data.current as PaletteDragData | undefined;
    if (activeData?.type !== "palette" || !event.over) {
      setPaletteDropIndex(null);
      return null;
    }

    const root = props.builderStore.getSchema().root;
    const pointerY = pointerClientYRef.current ?? getPointerClientY(event);
    const index = getCanvasDropIndex(pointerY, root);
    setPaletteDropIndex(index);
    return index;
  };

  return (
    <DndContext
      id="dnd"
      sensors={[mouseSensor]}
      collisionDetection={formBuilderCollisionDetection}
      onDragStart={(e) => {
        if (typeof e.active.id === "string") {
          setDraggingId(e.active.id);
        }
        pointerClientYRef.current = getEventClientY(e.activatorEvent);
        setPaletteDropIndex(null);
      }}
      onDragMove={(e) => {
        updatePaletteDropIndex(e);
      }}
      onDragOver={(e) => {
        updatePaletteDropIndex(e);
      }}
      onDragEnd={(e) => {
        const overId = e.over?.id;

        setDraggingId(null);
        setPaletteDropIndex(null);

        if (typeof e.active.id !== "string") {
          return;
        }

        const activeData = e.active.data.current as PaletteDragData | undefined;

        if (!overId) {
          return;
        }

        if (activeData?.type === "palette") {
          const root = props.builderStore.getSchema().root;
          const pointerY = pointerClientYRef.current ?? getPointerClientY(e);
          props.onPaletteDrop?.(
            activeData.entityType,
            getCanvasDropIndex(pointerY, root),
          );
          return;
        }

        const index =
          overId === CANVAS_DROP_ZONE_ID
            ? rootEntities.length
            : rootEntities.findIndex((id) => id === overId);

        if (index < 0) {
          return;
        }

        props.builderStore.setEntityIndex(e.active.id, index);
      }}
    >
      <SortableContext
        id="sortable"
        items={[...rootEntities]}
        strategy={verticalListSortingStrategy}
      >
        {props.children({
          draggingId,
          paletteDropIndex,
        })}
      </SortableContext>
      {/* <DragOverlay>{draggingId ? props.dragOverlay({ draggingId }) : null}</DragOverlay> */}
    </DndContext>
  );
}
