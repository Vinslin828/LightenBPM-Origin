import { ReactNode, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/utils/cn";

type Props = {
  header: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  showArrow?: boolean;
};

export default function Collapse({
  header,
  children,
  actions,
  defaultOpen = true,
  open,
  onOpenChange,
  className,
  headerClassName,
  contentClassName,
  showArrow = true,
}: Props) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = useMemo(
    () => (isControlled ? open : uncontrolledOpen),
    [isControlled, open, uncontrolledOpen],
  );

  const toggle = () => {
    const next = !isOpen;
    if (!isControlled) {
      setUncontrolledOpen(next);
    }
    onOpenChange?.(next);
  };

  return (
    <div className={cn("rounded-md border border-stroke bg-white", className)}>
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b border-stroke px-3 py-2",
          headerClassName,
        )}
      >
        <button
          type="button"
          onClick={toggle}
          className="flex flex-1 items-center gap-2 text-left"
          aria-expanded={isOpen}
        >
          {header}
        </button>
        <div className="flex items-center gap-2">
          {actions}
          {showArrow && (
            <button
              type="button"
              onClick={toggle}
              aria-label={isOpen ? "Collapse" : "Expand"}
              className="rounded p-1 text-gray-500 hover:text-gray-700"
            >
              <ChevronDown
                className={cn("h-5 w-5 transition-transform", {
                  "rotate-180": isOpen,
                })}
              />
            </button>
          )}
        </div>
      </div>
      {isOpen && <div className={cn("p-3", contentClassName)}>{children}</div>}
    </div>
  );
}
