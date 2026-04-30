import type { DragEndEvent, UniqueIdentifier } from "@dnd-kit/core";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, GripVertical, Trash2 } from "lucide-react";
import { ReactElement, ReactNode, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";

interface Props {
  id: UniqueIdentifier;
  title: ReactNode;
  children: ReactNode;
  expanded?: boolean;
  onExpand?: () => void;
  onRemove?: () => void;
}

export function SortableItem({
  id,
  children,
  expanded,
  onExpand,
  onRemove,
  title,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-white rounded-lg border border-[#DFE4EA] p-3",
        "transition-all duration-200",
        isDragging && "opacity-50",
      )}
    >
      <div className="flex flex-row items-center gap-2 text-[#111928]">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-grab hover:bg-transparent"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-6 h-6 text-[#8899A8]" />
        </Button>
        {title}
        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="text-[#8899A8] hover:text-red-500 hover:bg-transparent"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onExpand}
            className="text-[#8899A8] hover:bg-transparent"
          >
            {expanded ? (
              <ChevronUp className="w-6 h-6" />
            ) : (
              <ChevronDown className="w-6 h-6" />
            )}
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

interface SortableListProps {
  items: Array<{ id: UniqueIdentifier }>;
  children: ReactNode[];
  onDragEnd: (event: DragEndEvent) => void;
}

export function SortableList({
  items,
  children,
  onDragEnd,
}: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const activeItemProps = useMemo(() => {
    if (!activeId) return null;
    const child = children.find(
      (c) => (c as ReactElement<Props>).props.id === activeId,
    );
    return child ? (child as ReactElement<Props>).props : null;
  }, [activeId, children]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragEnd={(event) => {
        onDragEnd(event);
        setActiveId(null);
      }}
      onDragCancel={() => setActiveId(null)}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-4">{children}</div>
      </SortableContext>
      {createPortal(
        <DragOverlay adjustScale={false}>
          {activeId && activeItemProps ? (
            <div
              className={cn(
                "bg-white rounded-lg border border-[#DFE4EA] p-3",
                "shadow-lg",
              )}
            >
              <div className="flex flex-row items-center gap-2 text-[#111928]">
                <Button
                  variant="ghost"
                  size="icon"
                  className="cursor-grabbing hover:bg-transparent"
                >
                  <GripVertical className="w-6 h-6 text-[#8899A8]" />
                </Button>
                {activeItemProps.title}
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-[#8899A8] hover:text-red-500 hover:bg-transparent"
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-[#8899A8] hover:bg-transparent"
                  >
                    {activeItemProps.expanded ? (
                      <ChevronUp className="w-6 h-6" />
                    ) : (
                      <ChevronDown className="w-6 h-6" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                {activeItemProps.children}
              </div>
            </div>
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}