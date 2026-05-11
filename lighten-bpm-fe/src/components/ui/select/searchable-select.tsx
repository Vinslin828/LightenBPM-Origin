"use client";

import * as React from "react";
import { cn } from "@/utils/cn";
import { SelectOption } from "./single-select";
import { Check, ChevronDown, SearchIcon, X } from "lucide-react";
import { Input } from "@ui/input";

type BaseProps<T extends string | number> = {
  options: SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  readonly?: boolean;
  clearable?: boolean;
  hasError?: boolean;
  className?: string;
  name?: string;
  onBlur?: () => void;
  onSearchChange?: (search: string) => void;
  onLoadMore?: () => void;
  isFetchingMore?: boolean;
  onClear?: () => void;
};

type SingleModeProps<T extends string | number = string> = BaseProps<T> & {
  value?: T;
  onChange?: (value: T) => void;
  mode?: "single";
  multiple?: false;
};

type MultiModeProps<T extends string | number = string> = BaseProps<T> & {
  value?: T[];
  onChange?: (value: T[]) => void;
  mode?: "multiple";
  multiple?: true;
};

export type SearchableSelectProps<T extends string | number = string> =
  | SingleModeProps<T>
  | MultiModeProps<T>;

function isMultiMode<T extends string | number>(
  props: SearchableSelectProps<T>,
): props is MultiModeProps<T> {
  return props.mode === "multiple" || props.multiple === true;
}

export function SearchableSelect<T extends string | number = string>(
  props: SearchableSelectProps<T>,
) {
  const {
    options,
    placeholder = "Select an option",
    disabled,
    readonly,
    clearable,
    hasError,
    className,
    name,
    onBlur,
    onSearchChange,
    onLoadMore,
    isFetchingMore,
    onClear,
  } = props;
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);

  const handleListScroll = React.useCallback(() => {
    if (!listRef.current || !onLoadMore) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    if (scrollHeight - scrollTop - clientHeight < 60) {
      onLoadMore();
    }
  }, [onLoadMore]);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return options;
    const term = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        String(opt.value).toLowerCase().includes(term),
    );
  }, [options, search]);

  const selectedValues = React.useMemo<T[]>(() => {
    if (isMultiMode(props)) {
      return props.value ?? [];
    }
    return props.value !== undefined ? [props.value] : [];
  }, [props.mode, props.multiple, props.value]);

  const selectedLabels = React.useMemo(() => {
    if (isMultiMode(props)) {
      const selectedSet = new Set(
        ((props.value ?? []) as T[]).map((val) => String(val)),
      );
      return options
        .filter((opt) => selectedSet.has(String(opt.value)))
        .map((opt) => opt.label);
    }
    const singleValue = props.value;
    return singleValue === undefined
      ? []
      : options
          .filter((opt) => String(opt.value) === String(singleValue))
          .map((opt) => opt.label);
  }, [options, props.mode, props.multiple, props.value]);

  const toggleOpen = () => {
    if (disabled || readonly) return;
    setOpen((prev) => !prev);
  };

  const handleSelect = (selected: T) => {
    if (disabled || readonly) return;
    if (isMultiMode(props)) {
      const currentValues = props.value ?? [];
      const exists = currentValues.some(
        (val) => String(val) === String(selected),
      );
      const nextValues = exists
        ? currentValues.filter((val) => String(val) !== String(selected))
        : [...currentValues, selected];
      props.onChange?.(nextValues);
      return;
    }

    props.onChange?.(selected);
    setOpen(false);
  };

  const handleClear = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (disabled || readonly || isMultiMode(props)) return;
    onClear?.();
    setSearch("");
    setOpen(false);
  };

  React.useEffect(() => {
    if (disabled || readonly) {
      setOpen(false);
    }
  }, [disabled, readonly]);

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

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        onClick={toggleOpen}
        disabled={disabled}
        aria-readonly={readonly}
        className={cn(
          "flex h-12 w-full items-center justify-between rounded-[6px] border border-stroke bg-white px-4 text-left",
          "text-base font-normal text-dark",
          "focus:border-[1.5px] focus:border-lighten-blue focus:outline-none",
          disabled &&
            "bg-gray-2 text-primary-text border-gray-2 cursor-not-allowed",
          readonly && "cursor-default",
          hasError && "border-[1.5px] border-red focus:border-red",
          className,
        )}
      >
        <span
          className={cn(
            "flex-1 truncate text-left",
            selectedLabels.length === 0 && "text-secondary-text",
          )}
        >
          {selectedLabels.length > 0 ? selectedLabels.join(", ") : placeholder}
        </span>
        {!isMultiMode(props) &&
        clearable &&
        props.value !== undefined &&
        props.value !== "" ? (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear selection"
            className="ml-2 rounded p-1 text-secondary-text hover:text-dark focus:outline-none"
            onClick={handleClear}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                handleClear(event as unknown as React.MouseEvent<HTMLElement>);
              }
            }}
          >
            <X className="h-4 w-4" />
          </span>
        ) : (
          <ChevronDown className="h-4 w-4 text-secondary-text" />
        )}
      </button>

      {open && (
        <div className="absolute z-20 mt-2 w-full rounded-[6px] border border-stroke bg-white shadow-md">
          <div className="p-2">
            <Input
              // className="w-full rounded border border-stroke px-3 py-2 text-sm focus:border-lighten-blue focus:outline-none"
              value={search}
              icon={<SearchIcon className="w-5 h-5 text-gray-400" />}
              onChange={(e) => {
                if (readonly) return;
                setSearch(e.target.value);
                onSearchChange?.(e.target.value);
              }}
              placeholder="Search an options"
              autoFocus
              readOnly={readonly}
              disabled={disabled}
            />
          </div>
          <div
            ref={listRef}
            className="max-h-60 overflow-auto"
            onScroll={handleListScroll}
          >
            {filtered.map((option) => (
              <button
                key={String(option.value)}
                type="button"
                className={cn(
                  "flex w-full items-center px-4 py-2 text-left text-base text-dark hover:bg-gray-1",
                  selectedValues.some(
                    (val) => String(val) === String(option.value),
                  ) && "bg-lighten-blue/10",
                )}
                onClick={() => handleSelect(option.value)}
              >
                {isMultiMode(props) && (
                  <span
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded border border-stroke",
                      selectedValues.some(
                        (val) => String(val) === String(option.value),
                      ) && "border-lighten-blue bg-lighten-blue text-white",
                    )}
                  >
                    {selectedValues.some(
                      (val) => String(val) === String(option.value),
                    ) && <Check className="h-3 w-3" />}
                  </span>
                )}
                <span>{option.label}</span>
              </button>
            ))}
            {filtered.length === 0 && !isFetchingMore && (
              <div className="px-4 py-3 text-sm text-secondary-text">
                No options
              </div>
            )}
            {isFetchingMore && (
              <div className="px-4 py-3 text-sm text-secondary-text text-center">
                Loading...
              </div>
            )}
          </div>
        </div>
      )}

      {name &&
        (isMultiMode(props)
          ? selectedValues.map((val, idx) => (
              <input key={idx} type="hidden" name={name} value={String(val)} />
            ))
          : props.value !== undefined && (
              <input type="hidden" name={name} value={String(props.value)} />
            ))}
    </div>
  );
}
