import { cn } from "@/utils/cn";
import { ComponentProps, useState } from "react";
import { AndIcon, OrIcon } from "../../icons";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  active: boolean;
};
export function Button({ active = false, className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "h-[72px] w-full border border-stroke bg-white rounded-lg hover:bg-lighten-blue/10 text-dark text-xs font-medium",
        active && "border-lighten-blue bg-lighten-blue/10",
        className,
      )}
      {...props}
    />
  );
}

type Props = { value: "and" | "or"; onChange: (value: "and" | "or") => void };
export default function AndOrButton({ value, onChange }: Props) {
  return (
    <div className="flex flex-row gap-3">
      <Button
        active={value === "and"}
        onClick={() => onChange("and")}
        className="flex flex-col items-center justify-center gap-1"
      >
        <AndIcon className="text-primary-text" />
        AND
      </Button>
      <Button
        active={value === "or"}
        onClick={() => onChange("or")}
        className="flex flex-col items-center justify-center gap-1"
      >
        <OrIcon className="text-primary-text" />
        OR
      </Button>
    </div>
  );
}
