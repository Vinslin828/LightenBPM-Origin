"use client";

import { useMemo, type ReactNode } from "react";
import { OverallStatus, ReviewStatus } from "@/types/application";
import Menu from "@/components/ui/menu";
import {
  ApplicationStatusTag,
  ReviewStatusTag,
} from "@/components/application-status-tag";
import { cn } from "@/utils/cn";
import { ChevronDown } from "lucide-react";

type StatusValue<T extends string> = T | null;

interface BaseSelectProps<T extends string> {
  value?: StatusValue<T>;
  onValueChange?: (value: StatusValue<T>) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  hasAllOption?: boolean;
}

type Option<T extends string> = {
  value: StatusValue<T>;
  label: ReactNode;
};

const Trigger = ({
  label,
  disabled,
  error,
}: {
  label: React.ReactNode;
  disabled?: boolean;
  error?: boolean;
}) => (
  <button
    type="button"
    disabled={disabled}
    className={cn(
      "flex h-12 w-full items-center justify-between rounded-[6px] border border-stroke bg-white px-4 text-left",
      "text-base font-normal text-dark",
      "focus:border-[1.5px] focus:border-lighten-blue focus:outline-none",
      disabled &&
        "bg-gray-2 text-primary-text border-gray-2 cursor-not-allowed",
      error && "border-[1.5px] border-red focus:border-red",
    )}
  >
    <span className="flex items-center gap-2">{label}</span>
    <ChevronDown className="h-4 w-4 text-secondary-text" />
  </button>
);

const StatusSelect = <T extends string>({
  options,
  value,
  onValueChange,
  placeholder = "All",
  disabled,
  error,
  className,
}: BaseSelectProps<T> & { options: Option<T>[] }) => {
  const selected =
    options.find((opt) => opt.value === value) ??
    options.find((opt) => opt.value === null);

  const items = options.map((opt) => ({
    label: opt.label,
    onClick: () => onValueChange?.(opt.value),
  }));

  return (
    <div className={cn("w-full", className)}>
      <Menu
        items={items}
        disabled={disabled}
        trigger={
          <Trigger
            label={selected?.label ?? placeholder ?? "All"}
            disabled={disabled}
            error={error}
          />
        }
      />
    </div>
  );
};

export function OverallStatusSelect({
  value,
  onValueChange,
  placeholder = "All",
  disabled,
  error,
  className,
  hasAllOption = true,
}: BaseSelectProps<OverallStatus>) {
  const options = useMemo<Option<OverallStatus>[]>(() => {
    const statusOptions = Object.values(OverallStatus).map((status) => ({
      value: status,
      label: <ApplicationStatusTag status={status} />,
    }));
    return hasAllOption
      ? [{ value: null, label: "All" }, ...statusOptions]
      : statusOptions;
  }, [hasAllOption]);

  return (
    <StatusSelect
      options={options}
      value={value ?? null}
      onValueChange={onValueChange}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      className={className}
    />
  );
}

export function ReviewStatusSelect({
  value,
  onValueChange,
  placeholder = "All",
  disabled,
  error,
  className,
  hasAllOption = true,
}: BaseSelectProps<ReviewStatus>) {
  const reviewStatuses: ReviewStatus[] = useMemo(
    () => [
      ReviewStatus.Approved,
      ReviewStatus.Pending,
      ReviewStatus.Rejected,
      ReviewStatus.Canceled,
    ],
    [],
  );

  const options = useMemo<Option<ReviewStatus>[]>(() => {
    const statusOptions = reviewStatuses.map((status) => ({
      value: status,
      label: <ReviewStatusTag status={status} />,
    }));
    return hasAllOption
      ? [{ value: null, label: "All" }, ...statusOptions]
      : statusOptions;
  }, [hasAllOption, reviewStatuses]);

  return (
    <StatusSelect
      options={options}
      value={value ?? null}
      onValueChange={onValueChange}
      placeholder={placeholder}
      disabled={disabled}
      error={error}
      className={className}
    />
  );
}
