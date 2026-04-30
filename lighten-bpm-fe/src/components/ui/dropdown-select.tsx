import React, { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowDownIcon } from "@/components/icons";
import { cn } from "@/utils/cn";

export interface DropdownSelectOption {
  label: string;
  value: string;
}

export interface DropdownSelectProps {
  id?: string;
  options: (string | DropdownSelectOption)[];
  value: string | string[];
  onChange: (value: any) => void;
  multiple?: boolean;
  placeholder?: string;
  hasError?: boolean;
  className?: string;
}

export function DropdownSelect({
  id,
  options,
  value,
  onChange,
  multiple = false,
  placeholder = "Select an option",
  hasError = false,
  className,
}: DropdownSelectProps) {
  const [open, setOpen] = useState(false);

  const normalizedOptions = useMemo(
    () =>
      options.map((opt) =>
        typeof opt === "string" ? { label: opt, value: opt } : opt,
      ),
    [options],
  );

  const isSelected = (val: string) => {
    if (multiple) {
      return Array.isArray(value) ? value.includes(val) : false;
    }
    return value === val;
  };

  const handleSelect = (val: string) => {
    if (multiple) {
      const arrayValue = Array.isArray(value) ? value : [];
      if (arrayValue.includes(val)) {
        onChange(arrayValue.filter((v) => v !== val));
      } else {
        onChange([...arrayValue, val]);
      }
    } else {
      onChange(val);
      setOpen(false); // Close popover on single select
    }
  };

  const selectedText = useMemo(() => {
    if (multiple) {
      const arrayValue = Array.isArray(value) ? value : [];
      if (arrayValue.length === 0) return placeholder;
      const labels = arrayValue.map(
        (v) => normalizedOptions.find((o) => o.value === v)?.label || v,
      );
      return labels.join(", ");
    } else {
      if (!value || (Array.isArray(value) && value.length === 0))
        return placeholder;
      return normalizedOptions.find((o) => o.value === value)?.label || value;
    }
  }, [value, multiple, normalizedOptions, placeholder]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            "flex h-[44px] w-full items-center justify-between rounded-[6px] border bg-white px-5 py-[10px] text-[16px] font-normal leading-[24px] text-[#111928] outline-none hover:bg-slate-50 transition-colors",
            hasError ? "border-red-500" : "border-[#dfe4ea]",
            open && "ring-1 ring-[#1a75e0] border-[#1a75e0]",
            (!value || (Array.isArray(value) && value.length === 0)) &&
              "text-[#637381]",
            className,
          )}
        >
          <span className="truncate">{selectedText}</span>
          <ArrowDownIcon
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-white rounded-[6px] shadow-[0px_5px_12px_0px_rgba(0,0,0,0.1)] border border-[#dfe4ea]"
        align="start"
        sideOffset={4}
      >
        <div className="flex flex-col max-h-[260px] overflow-y-auto py-2">
          {normalizedOptions.map((option) => {
            const checked = isSelected(option.value);
            return (
              <div
                key={option.value}
                className={cn(
                  "flex items-center gap-[10px] px-5 py-2 cursor-pointer transition-colors",
                  checked ? "bg-[#f3f4f6]" : "hover:bg-slate-50",
                )}
                onClick={() => handleSelect(option.value)}
              >
                {multiple && (
                  <Checkbox
                    checked={checked}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => handleSelect(option.value)}
                  />
                )}
                <span
                  className={cn(
                    "text-[16px] font-normal leading-[24px] text-[#111928] select-none",
                    !multiple && checked && "font-medium",
                  )}
                >
                  {option.label}
                </span>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
