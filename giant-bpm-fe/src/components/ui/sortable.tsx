import type { Active, DragEndEvent, UniqueIdentifier } from "@dnd-kit/core";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ChevronDown, ChevronUp, EditIcon, TrashIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import { DeleteIcon, DragIndicatorIcon, PenIcon } from "@/components/icons";

interface Props {
  id: UniqueIdentifier;
  title: ReactNode;
  children: ReactNode;
  expanded?: boolean;
  onExpand?: () => void;
  onRemove?: () => void;
  onEdit?: () => void;
}

export function SortableItem({
  id,
  children,
  expanded,
  onExpand,
  onRemove,
  onEdit,
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
          <DragIndicatorIcon className="fill-secondary-text" />
        </Button>
        <div className="w-full">{title}</div>
        {onEdit && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onEdit}
            className="text-secondary-text hover:text-giant-blue"
          >
            <PenIcon />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-secondary-text hover:text-giant-blue"
        >
          <DeleteIcon />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onExpand}
          className="text-primary-text"
        >
          {expanded ? (
            <ChevronUp className="w-6 h-6" />
          ) : (
            <ChevronDown className="w-6 h-6" />
          )}
        </Button>
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={(event) => {
        // Debug drag lifecycle to inspect ids/positions
        console.debug("sortable:onDragEnd", {
          active: event.active.id,
          over: event.over?.id,
          items: items.map((i) => i.id),
        });
        onDragEnd(event);
      }}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-4">{children}</div>
      </SortableContext>
    </DndContext>
  );
}

// const SortableList: FC = (): JSX.Element => {
//   const getItemContent = (value: ReactNode, index: number): JSX.Element => {
//     const lines = Math.floor(Math.random() * 4) + 1;
//     const range = createRange(lines);

//     return (
//       <div key={`item-${index}`}>
//         {range.map((idx) => (
//           <span key={`items-${index}`}>
//             {value}
//             <br />
//           </span>
//         ))}
//       </div>
//     );
//   };

//   const [items, setItems] = useState<string[]>(
//     createRange<string>(16, (index) => (index + 1).toString())
//   );

//   const [itemsContent, setItemsContent] = useState<ReactNode[]>(
//     items.map((value, index) => getItemContent(value, index))
//   );

//   const [activeId, setActiveId] = useState<string | null>(null);
//   const sensors = useSensors(
//     useSensor(MouseSensor, {
//       activationConstraint:  undefined,
//     }),
//     useSensor(TouchSensor, {
//       activationConstraint: undefined,
//     }),
//     useSensor(KeyboardSensor, {
//       // Disable smooth scrolling in Cypress automated tests
//       scrollBehavior: 'Cypress' in window ? 'auto' : undefined,
//       coordinateGetter: sortableKeyboardCoordinates,
//     })
//   );
//   const isFirstAnnouncement = useRef(true);
//   const getIndex = items.indexOf.bind(items);
//   const getPosition = (id: string) => getIndex(id) + 1;
//   const activeIndex = activeId ? getIndex(activeId) : -1;
//   const handleRemove = (id: string) => {
//     const idx = items.findIndex((item) => item === id);

//     setItems((items) => items.filter((item, i) => i !== idx));
//     setItemsContent((items) => items.filter((item, i) => i !== idx));
//   };
//   const announcements: Announcements = {
//     onDragStart(id) {
//       return `Picked up sortable item ${id}. Sortable item ${id} is in position ${getPosition(
//         id
//       )} of ${items.length}`;
//     },
//     onDragOver(id, overId) {
//       // In this specific use-case, the picked up item's `id` is always the same as the first `over` id.
//       // The first `onDragOver` event therefore doesn't need to be announced, because it is called
//       // immediately after the `onDragStart` announcement and is redundant.
//       if (isFirstAnnouncement.current === true) {
//         isFirstAnnouncement.current = false;
//         return;
//       }

//       if (overId) {
//         return `Sortable item ${id} was moved into position ${getPosition(
//           overId
//         )} of ${items.length}`;
//       }

//       return;
//     },
//     onDragEnd(id, overId) {
//       if (overId) {
//         return `Sortable item ${id} was dropped at position ${getPosition(
//           overId
//         )} of ${items.length}`;
//       }

//       return;
//     },
//     onDragCancel(id) {
//       return `Sorting was cancelled. Sortable item ${id} was dropped and returned to position ${getPosition(
//         id
//       )} of ${items.length}.`;
//     },
//   };

//   useEffect(() => {
//     if (!activeId) {
//       isFirstAnnouncement.current = true;
//     }
//   }, [activeId]);

//   const measuring = {
//     droppable: {
//       strategy: MeasuringStrategy.Always,
//     },
//   };

//   const animateLayoutChanges: AnimateLayoutChanges = (args) =>
//     args.isSorting || args.wasDragging
//       ? defaultAnimateLayoutChanges(args)
//       : true;

//   // const isDisabled = (id: UniqueIdentifier): boolean => false;

//   return (
//     <DndContext
//       announcements={announcements}
//       screenReaderInstructions={screenReaderInstructions}
//       sensors={sensors}
//       collisionDetection={closestCenter}
//       onDragStart={({ active }) => {
//         if (!active) {
//           return;
//         }

//         setActiveId(active.id);
//       }}
//       onDragEnd={({ over }) => {
//         setActiveId(null);

//         if (over) {
//           const overIndex = getIndex(over.id);
//           if (activeIndex !== overIndex) {
//             setItems((items) => arrayMove(items, activeIndex, overIndex));
//             setItemsContent((items) =>
//               arrayMove(items, activeIndex, overIndex)
//             );
//           }
//         }
//       }}
//       onDragCancel={() => setActiveId(null)}
//       measuring={measuring}
//       // modifiers={undefined}
//     >
//       <Wrapper>
//         <SortableContext items={items} strategy={verticalListSortingStrategy}>
//           <List>
//             {items.map((value, index) => {
//               return (
//                 <SortableItem
//                   key={value}
//                   id={value}
//                   // useDragOverlay={true}
//                   // index={index}
//                   // disabled={isDisabled(value)}
//                   onRemove={handleRemove}
//                   animateLayoutChanges={animateLayoutChanges}
//                   // getNewIndex={undefined}
//                   value={itemsContent[index]}
//                 />
//               );
//             })}
//           </List>
//         </SortableContext>
//       </Wrapper>
//       {createPortal(
//         <DragOverlay
//           adjustScale={false}
//           dropAnimation={defaultDropAnimationConfig}
//         >
//           {activeId ? (
//             <Item isInDragOverlay={true} value={itemsContent[activeIndex]} />
//           ) : null}
//         </DragOverlay>,
//         document.body
//       )}
//     </DndContext>
//   );
// };
