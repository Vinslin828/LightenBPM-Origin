import { cn } from "@/utils/cn";
import { HTMLAttributes } from "react";

interface TagProps extends HTMLAttributes<HTMLDivElement> {
  backgroundColor?: string;
  textColor?: string;
}

const DEFAULT_BG = "rgba(26,117,224,0.15)";
const DEFAULT_TEXT_COLOR = "#1a75e0";

export default function Tag({
  children,
  className,
  backgroundColor = DEFAULT_BG,
  textColor = DEFAULT_TEXT_COLOR,
  style,
  ...props
}: TagProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-[4px] px-2 py-1.5 w-fit",
        backgroundColor,
        className,
      )}
      // style={{ backgroundColor, ...style }}
      {...props}
    >
      <span className={cn("text-xs font-medium", textColor)}>{children}</span>
    </div>
  );
}
