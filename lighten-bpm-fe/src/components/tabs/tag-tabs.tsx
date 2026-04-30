import { useTags } from "@/hooks/useMasterData";
import { Tag } from "@/types/domain";
import { cn } from "@/utils/cn";
import { useLayoutEffect, useRef, useState } from "react";

const AllOption: Tag = {
  id: "all",
  name: "All",
  description: "",
  abbrev: "All",
  createdAt: "",
  createdBy: "",
};

export default function TagTabs({
  selectedTag,
  onSelect,
  className,
}: {
  selectedTag: string;
  onSelect: (tag: string) => void;
  className?: string;
}) {
  const { tags } = useTags();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftShadow, setShowLeftShadow] = useState(false);
  const [showRightShadow, setShowRightShadow] = useState(false);

  useLayoutEffect(() => {
    const scrollElement = scrollRef.current;

    const checkShadows = () => {
      if (scrollElement) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollElement;
        setShowLeftShadow(scrollLeft > 0);
        setShowRightShadow(scrollLeft < scrollWidth - clientWidth);
      }
    };

    if (scrollElement) {
      checkShadows();
      scrollElement.addEventListener("scroll", checkShadows);
      window.addEventListener("resize", checkShadows);

      // Observe content changes that affect scroll width
      const resizeObserver = new ResizeObserver(checkShadows);
      resizeObserver.observe(scrollElement);

      return () => {
        scrollElement.removeEventListener("scroll", checkShadows);
        window.removeEventListener("resize", checkShadows);
        resizeObserver.disconnect();
      };
    }
  }, [tags]);

  if (!tags) {
    return null;
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        className={cn(
          "flex gap-2.5 items-center flex-nowrap overflow-x-auto w-full min-w-0 max-w-full no-scrollbar",
          className,
        )}
      >
        {[AllOption, ...tags]?.map((dept) => (
          <button
            key={dept.id}
            onClick={() => onSelect(dept.id)}
            className={cn(
              "relative rounded-lg font-medium text-base leading-6 px-[22px] py-2.5 bg-clip-border h-11 flex-shrink-0",
              selectedTag === dept.id
                ? "bg-[#1A75E0] text-white"
                : "bg-white text-dark border border-[#DFE4EA]",
            )}
          >
            {selectedTag !== dept.id && dept.id !== "all" && (
              <div
                className="absolute left-0 top-0 w-1 h-full rounded-l-lg"
                style={{ backgroundColor: dept.color }}
              />
            )}
            {dept.name}
          </button>
        ))}
      </div>
      {showLeftShadow && (
        <div className="absolute inset-y-0 left-0 w-8 pointer-events-none bg-gradient-to-r from-gray-2 to-transparent" />
      )}
      {showRightShadow && (
        <div className="absolute inset-y-0 right-0 w-8 pointer-events-none bg-gradient-to-l from-gray-2 to-transparent" />
      )}
    </div>
  );
}
