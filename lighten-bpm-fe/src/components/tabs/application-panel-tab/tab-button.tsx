import { cn } from "@/utils/cn";
import { ComponentProps } from "react";

type Props = ComponentProps<"button"> & {
  active?: boolean;
};

export default function TabButton({ active, className, ...props }: Props) {
  return (
    <button
      className={cn(
        "px-4 py-[5px] rounded flex justify-center items-center gap-1.5 text-sm font-medium",
        active ? "bg-lighten-blue text-white" : "text-gray-500",
        className,
      )}
      type="button"
      {...props}
    />
  );
}
