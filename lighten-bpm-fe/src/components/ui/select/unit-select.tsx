"use client";

import { useOrgUnits } from "@/hooks/useMasterData";
import { SingleSelect } from "@ui/select/single-select";
import { useEffect, useMemo } from "react";
import { Unit } from "@/types/domain";

interface UnitSelectProps {
  value?: Unit | string;
  onValueChange?: (id?: string, unit?: Unit) => void;
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

export default function UnitSelect({
  value,
  onValueChange,
  placeholder = "Select an department",
  disabled,
  error,
  name,
  onBlur,
  hasAllOption = false,
}: UnitSelectProps) {
  console.debug("unit-select", value);

  const { units, isLoading, error: fetchError } = useOrgUnits();
  const unitOptions = useMemo(() => {
    if (!units) return [];
    return units.map((unit) => ({
      label: `${unit.name} (${unit.code})`,
      value: unit.id,
      key: unit.id,
    }));
  }, [units]);

  useEffect(() => {
    if (units && value && typeof value === "string") {
      onValueChange?.(
        value,
        units.find((u) => u.id === value),
      );
    }
  }, [units]);

  if (isLoading) {
    return (
      <SingleSelect placeholder="Loading..." disabled={true} options={[]} />
    );
  }

  if (fetchError) {
    return (
      <SingleSelect
        placeholder="Error loading organizations"
        disabled={true}
        hasError={true}
        options={[]}
      />
    );
  }

  return (
    <SingleSelect
      value={typeof value === "string" ? value : value?.id}
      onChange={(value) =>
        onValueChange?.(
          value,
          units?.find((unit) => unit.id === value),
        )
      }
      options={hasAllOption ? [allOption, ...unitOptions] : unitOptions}
      placeholder={placeholder}
      disabled={disabled}
      hasError={error}
      name={name}
      onBlur={onBlur}
    />
  );
}
