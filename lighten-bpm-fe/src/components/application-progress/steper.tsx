import { cn } from "@/utils/cn";

interface SteperProps {
  isCompleted?: boolean;
  isActive?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function Steper({
  isCompleted,
  isActive,
  icon,
  className,
}: SteperProps) {
  return (
    <div className={cn("relative size-8", className)}>
      <div
        className={cn(
          "absolute inset-0 rounded-full",
          isCompleted && "bg-lighten-blue",
          isActive && "bg-lighten-blue",
          !isCompleted && !isActive && "border border-[#dfe4ea]",
        )}
      />
      {icon && (
        <div className="absolute left-[6px] top-[6px] size-4 text-white">
          {icon}
        </div>
      )}
    </div>
  );
}
