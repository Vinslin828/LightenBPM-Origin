"use client";

import { useTags } from "@/hooks/useMasterData";
import { useMemo } from "react";
import { Tag } from "@/types/domain";
import { Select } from ".";

interface DepartmentSelectProps {
  value?: Tag | string;
  onValueChange?: (id?: string, department?: Tag) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  name?: string;
  onBlur?: () => void;
  hasAllOption?: boolean;
}

const allOption = {
  id: "all",
  value: "all",
  label: "All",
  key: "all",
};

export default function DepartmentSelect({
  value,
  onValueChange,
  placeholder = "Select a department",
  disabled,
  error,
  name,
  onBlur,
  hasAllOption = false,
}: DepartmentSelectProps) {
  const { tags: departments, isLoading, error: fetchError } = useTags();

  const departmentOptions = useMemo(() => {
    if (!departments) return [];
    return departments.map((department) => ({
      label: department.name,
      value: department.id,
      key: department.id,
    }));
  }, [departments]);

  if (isLoading) {
    return (
      <Select
        placeholder="Loading departments..."
        disabled={true}
        options={[]}
      />
    );
  }

  if (fetchError) {
    return (
      <Select
        placeholder="Error loading departments"
        disabled={true}
        hasError={true}
        options={[]}
      />
    );
  }

  return (
    <Select
      value={typeof value === "string" ? value : value?.id}
      mode="single"
      onChange={(value) =>
        onValueChange?.(
          value,
          departments?.find((department) => department.id === value),
        )
      }
      options={
        hasAllOption ? [allOption, ...departmentOptions] : departmentOptions
      }
      placeholder={placeholder}
      disabled={disabled}
      hasError={error}
      name={name}
      onBlur={onBlur}
    />
  );
}
