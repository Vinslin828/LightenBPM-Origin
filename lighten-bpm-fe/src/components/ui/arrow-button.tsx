import { cn } from "@/utils/cn";
import { ChevronDown, ChevronUp } from "lucide-react";

type BtnArrowProps = {
  className?: string;
  direction?: "up" | "down";
  onClick?: () => void;
};
const BtnArrow = ({
  className,
  direction = "down",
  onClick,
}: BtnArrowProps) => (
  <button
    onClick={onClick}
    className={cn(
      "h-6 w-6 rounded hover:bg-gray-2 flex items-center justify-center",
      className,
    )}
  >
    {direction === "up" ? (
      <ChevronUp className="text-primary-text" />
    ) : (
      <ChevronDown className="text-primary-text" />
    )}
  </button>
);

export default BtnArrow;
