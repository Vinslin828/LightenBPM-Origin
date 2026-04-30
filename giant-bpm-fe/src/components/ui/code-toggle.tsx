import { CodeIcon, ManualIcon } from "@/components/icons";
import { cn } from "@/utils/cn";
import { useState } from "react";

type CodeToggleValue = "manual" | "code";

interface CodeToggleProps {
  value?: CodeToggleValue;
  onChange?: (value: CodeToggleValue) => void;
  disabled?: boolean;
  className?: string;
}

export default function CodeToggle({
  value = "manual",
  onChange: onChange,
  disabled,
  className,
}: CodeToggleProps) {
  const handleChange = (nextValue: CodeToggleValue) => {
    if (!disabled && nextValue !== value) {
      onChange?.(nextValue);
    }
  };

  const baseButtonClasses =
    "flex h-7 w-7 items-center justify-center rounded-[4px] p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-giant-blue focus-visible:ring-offset-2";

  return (
    <div
      role="group"
      aria-label="Expression mode"
      className={cn(
        "inline-flex items-center gap-1 rounded-[6px] border border-stroke bg-white p-0.5",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <button
        type="button"
        aria-pressed={value === "manual"}
        aria-label="Manual expression"
        disabled={disabled}
        onClick={() => handleChange("manual")}
        className={cn(
          baseButtonClasses,
          value === "manual"
            ? "bg-giant-blue text-white"
            : "bg-white text-primary-text",
        )}
      >
        <ManualIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-pressed={value === "code"}
        aria-label="Code expression"
        disabled={disabled}
        onClick={() => handleChange("code")}
        className={cn(
          baseButtonClasses,
          value === "code"
            ? "bg-giant-blue text-white"
            : "bg-white text-primary-text",
        )}
      >
        <CodeIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

export function useCodeToggle(initialValue: CodeToggleValue = "manual") {
  const [value, setValue] = useState<CodeToggleValue>(initialValue);

  return {
    value,
    onChange: setValue,
    setManual: () => setValue("manual"),
    setCode: () => setValue("code"),
  };
}
