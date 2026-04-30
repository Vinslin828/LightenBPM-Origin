"use client";

import * as React from "react";
import { cn } from "@/utils/cn";

interface CheckboxProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    "type" | "checked" | "onChange"
  > {
  checked?: boolean | "indeterminate";
  readonly?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, readonly, onCheckedChange, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null);
    React.useImperativeHandle(ref, () => internalRef.current!);

    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = checked === "indeterminate";
      }
    }, [checked]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (readonly) return;
      onCheckedChange?.(e.target.checked);
    };
    const isDisabled = Boolean(props.disabled);
    const isChecked = checked === true;

    return (
      <div className={cn("inline-flex items-center", className)}>
        <label
          className={cn(
            "relative flex items-center",
            readonly ? "cursor-default" : "cursor-pointer",
          )}
        >
          <input
            type="checkbox"
            ref={internalRef}
            checked={checked === true}
            onChange={handleChange}
            aria-readonly={readonly}
            className={cn(
              "peer h-5 w-5 appearance-none rounded border border-stroke transition-all checked:border-giant-blue checked:bg-giant-blue disabled:bg-gray-2 bg-white",
              isDisabled && isChecked && "disabled:border-giant-blue disabled:bg-giant-blue",
              readonly ? "cursor-default" : "cursor-pointer",
            )}
            {...props}
            disabled={props.disabled}
          />
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-checked:opacity-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
              stroke="currentColor"
              strokeWidth="1"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              ></path>
            </svg>
          </div>
          {/* Indeterminate state indicator */}
          <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 transition-opacity peer-indeterminate:opacity-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3.5 w-3.5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M4 9h12v2H4z" />
            </svg>
          </div>
        </label>
      </div>
    );
  },
);

Checkbox.displayName = "Checkbox";

export { Checkbox };
