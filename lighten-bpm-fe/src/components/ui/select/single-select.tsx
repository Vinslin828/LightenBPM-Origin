"use client";

import * as React from "react";
import { cn } from "@/utils/cn";
import { ChevronDown } from "lucide-react";

export interface SelectOption<T extends string | number = string> {
  label: string;
  value: T;
  key: string;
}

interface BaseProps<T extends string | number = string> {
  options: SelectOption<T>[];
  hasError?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  readonly?: boolean;
  clearable?: boolean;
  name?: string;
  onBlur?: () => void;
  onClear?: () => void;
}

export type SingleSelectProps<T extends string | number = string> =
  BaseProps<T> & {
    value?: SelectOption<T>["value"];
    onChange?: (value: SelectOption<T>["value"]) => void;
  };

function SingleSelectInner<T extends string | number = string>(
  {
    value,
    disabled = false,
    readonly = false,
    clearable = false,
    options = [],
    hasError = false,
    placeholder,
    className,
    name,
    onBlur,
    onClear,
    onChange,
  }: SingleSelectProps<T>,
  ref: React.Ref<HTMLSelectElement>,
) {
  const displayValue = value ?? "";

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (readonly) return;
    const selected = e.target.value;
    if (selected === "") {
      onClear?.();
      return;
    }
    const typedValue =
      options.find((opt) => String(opt.value) === selected)?.value ??
      (selected as unknown as SelectOption<T>["value"]);
    onChange?.(typedValue);
  };

  // A placeholder option with an empty value also works as a clear option.
  const placeholderOption = placeholder ? (
    <option value="" disabled={!clearable}>
      {placeholder}
    </option>
  ) : null;

  return (
    <div className={cn("relative w-full", className)}>
      <select
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        aria-readonly={readonly}
        name={name}
        onBlur={onBlur}
        onMouseDown={(event) => {
          if (readonly) {
            event.preventDefault();
          }
        }}
        // onKeyDown={(event) => {
        //   if (readonly) {
        //     event.preventDefault();
        //   }
        // }}
        className={cn(
          "appearance-none h-12 w-full rounded-[6px] bg-white pl-5 pr-10 py-3",
          "border border-stroke text-base font-normal",
          "focus:border-[1.5px] focus:border-lighten-blue focus:outline-none",
          "text-dark",
          // Apply placeholder color if value is empty
          displayValue === "" && "text-secondary-text",
          disabled &&
            "bg-gray-2 text-primary-text border-gray-2 cursor-not-allowed",
          readonly && "cursor-default",
          hasError && "border-[1.5px] border-red focus:border-red",
          className,
        )}
      >
        {placeholderOption}
        {options.map((option, index) => (
          <option key={`${String(option.value)}-${index}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
        <ChevronDown className="h-5 w-5 text-secondary-text" />
      </span>
    </div>
  );
}

type SingleSelectComponent = <T extends string | number = string>(
  props: SingleSelectProps<T> & { ref?: React.Ref<HTMLSelectElement> },
) => React.JSX.Element;

const SingleSelect = React.forwardRef(
  SingleSelectInner,
) as SingleSelectComponent & {
  displayName?: string;
};

SingleSelect.displayName = "SingleSelect";

export { SingleSelect };
