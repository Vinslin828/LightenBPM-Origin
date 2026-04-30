"use client";

import * as React from "react";
import { cn } from "@/utils/cn";
import { SelectOption } from "./single-select";
import { Check, ChevronDown, XIcon } from "lucide-react";

export interface MultiSelectProps<T extends string | number = string> {
  options: SelectOption<T>[];
  value?: T[];
  onChange?: (value: T[]) => void;
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  hasError?: boolean;
  className?: string;
  name?: string;
  onBlur?: () => void;
}

function MultiSelectInner<T extends string | number = string>(
  {
    options,
    value = [],
    onChange,
    placeholder = "Select options",
    disabled,
    readonly,
    hasError,
    className,
    name,
    onBlur,
  }: MultiSelectProps<T>,
  ref: React.Ref<HTMLDivElement>,
) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = (node: HTMLDivElement | null) => {
    containerRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref && "current" in (ref as React.RefObject<HTMLDivElement>)) {
      (ref as React.RefObject<HTMLDivElement | null>).current = node;
    }
  };

  const selectedValues = value ?? [];
  const selectedLabels = options
    .filter((opt) =>
      selectedValues.some((val) => String(val) === String(opt.value)),
    )
    .map((opt) => opt.label);

  const toggleOpen = () => {
    if (disabled || readonly) return;
    setOpen((prev) => !prev);
  };

  const handleSelect = (optionValue: T) => {
    if (disabled || readonly) return;
    const exists = selectedValues.some(
      (val) => String(val) === String(optionValue),
    );
    const nextValues = exists
      ? selectedValues.filter((val) => String(val) !== String(optionValue))
      : [...selectedValues, optionValue];
    onChange?.(nextValues);
  };

  React.useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onBlur]);

  React.useEffect(() => {
    if (disabled || readonly) {
      setOpen(false);
    }
  }, [disabled, readonly]);

  return (
    <div ref={mergedRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        aria-readonly={readonly}
        className={cn(
          "flex h-12 w-full items-center rounded-[6px] border border-stroke bg-white pl-5 pr-10 py-3 text-left",
          "text-base font-normal text-dark",
          "focus:border-[1.5px] focus:border-giant-blue focus:outline-none",
          disabled &&
            "bg-gray-2 text-primary-text border-gray-2 cursor-not-allowed",
          readonly && "cursor-default",
          hasError && "border-[1.5px] border-red focus:border-red",
        )}
      >
        <span
          className={cn(
            "flex flex-wrap gap-1 truncate",
            selectedLabels.length === 0 && "text-secondary-text",
          )}
        >
          {/* {selectedLabels.length > 0 ? selectedLabels.join(", ") : placeholder} */}
          {selectedLabels.length > 0 ? (
            <div className="flex flex-row gap-1">
              {selectedLabels.map((label, idx) => (
                <div
                  key={`${label}-${idx}`}
                  className="bg-giant-blue/10 flex flex-row gap-2.5 pl-[15px] pr-2.5 h-9 items-center rounded-sm"
                >
                  {label}
                  <XIcon
                    className="h-4 w-4 text-primary-text"
                    onClick={() => {
                      if (readonly || disabled) return;
                      const option = options.find(
                        (opt) => String(opt.label) === String(label),
                      );
                      const optionValue =
                        option?.value ??
                        selectedValues.find(
                          (val) => String(val) === String(label),
                        );
                      if (optionValue === undefined) return;
                      onChange?.(
                        selectedValues.filter(
                          (val) => String(val) !== String(optionValue),
                        ),
                      );
                    }}
                  />
                </div>
              ))}
            </div>
          ) : (
            placeholder
          )}
        </span>
      </button>
      <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
        <ChevronDown className="h-5 w-5 text-secondary-text" />
      </span>

      {open && (
        <div className="absolute z-20 mt-2 max-h-60 w-full overflow-auto rounded-[6px] border border-stroke bg-white shadow-md">
          {options.map((option) => {
            const isSelected = selectedValues.some(
              (val) => String(val) === String(option.value),
            );
            return (
              <button
                key={String(option.value)}
                type="button"
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2 text-left text-base text-dark",
                  "hover:bg-gray-1",
                  isSelected && "bg-giant-blue/10",
                )}
                onClick={() => handleSelect(option.value)}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border border-stroke",
                    isSelected && "border-giant-blue bg-giant-blue text-white",
                  )}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </span>
                <span>{option.label}</span>
              </button>
            );
          })}
          {options.length === 0 && (
            <div className="px-4 py-3 text-sm text-secondary-text">
              No options
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const MultiSelect = React.forwardRef(MultiSelectInner) as <
  T extends string | number = string,
>(
  props: MultiSelectProps<T> & { ref?: React.Ref<HTMLDivElement> },
) => React.JSX.Element;
