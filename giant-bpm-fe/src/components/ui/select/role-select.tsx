"use client";

import { useOrgRoles } from "@/hooks/useMasterData";
import { SingleSelect } from "@ui/select/single-select";
import { useEffect, useMemo } from "react";
import { Role } from "@/types/domain";

interface RoleSelectProps {
  value?: Role | string;
  onValueChange?: (id?: string, role?: Role) => void;
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

export default function RoleSelect({
  value,
  onValueChange,
  placeholder = "Select a role",
  disabled,
  error,
  name,
  onBlur,
  hasAllOption = false,
}: RoleSelectProps) {
  const { roles, isLoading, error: fetchError } = useOrgRoles();

  const roleOptions = useMemo(() => {
    if (!roles) return [];
    return roles.map((role) => ({
      label: `${role.name} (${role.code})`,
      value: role.id,
      key: role.id,
    }));
  }, [roles]);

  useEffect(() => {
    if (roles && value && typeof value === "string") {
      onValueChange?.(
        value,
        roles.find((r) => r.id === value),
      );
    }
  }, [roles]);

  if (isLoading) {
    return (
      <SingleSelect
        placeholder="Loading roles..."
        disabled={true}
        options={[]}
      />
    );
  }

  if (fetchError) {
    return (
      <SingleSelect
        placeholder="Error loading roles"
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
          roles?.find((role) => role.id === value),
        )
      }
      options={hasAllOption ? [allOption, ...roleOptions] : roleOptions}
      placeholder={placeholder}
      disabled={disabled}
      hasError={error}
      name={name}
      onBlur={onBlur}
    />
  );
}
