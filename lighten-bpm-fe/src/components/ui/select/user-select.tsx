"use client";

import { useUsersInfinite, useUsersByIds } from "@/hooks/useMasterData";
import { SearchableSelect } from "@ui/select/searchable-select";
import { useMemo, useRef, useState } from "react";
import { User } from "@/types/domain";

interface UserSelectSingleProps {
  multiple?: false;
  value?: User | string;
  onValueChange?: (id?: string, user?: User) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  name?: string;
  onBlur?: () => void;
  hasAllOption?: boolean;
}

interface UserSelectMultiProps {
  multiple: true;
  value?: (User | string)[];
  onValueChange?: (ids: string[], users: User[]) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  name?: string;
  onBlur?: () => void;
  hasAllOption?: boolean;
}

type UserSelectProps = UserSelectSingleProps | UserSelectMultiProps;

const allOption = {
  id: "all",
  value: "all",
  label: "All",
  key: "all",
};

export default function UserSelect(props: UserSelectProps) {
  const {
    multiple,
    value,
    onValueChange,
    placeholder = "Select a user",
    disabled,
    error,
    className,
    name,
    onBlur,
    hasAllOption = false,
  } = props;

  const [searchQuery, setSearchQuery] = useState("");
  const hasLoadedOnce = useRef(false);
  const {
    users,
    isLoading,
    error: fetchError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUsersInfinite(searchQuery.trim() || undefined);

  if (!isLoading && !fetchError && !hasLoadedOnce.current) {
    hasLoadedOnce.current = true;
  }

  // --- handle missing user objects ---
  const missingIds = useMemo(() => {
    if (multiple) {
      const vals = (value as (User | string)[] | undefined) ?? [];
      return vals.filter((v): v is string => typeof v === "string");
    } else {
      return typeof value === "string" ? [value] : [];
    }
  }, [value, multiple]);

  const { users: fetchedMissingUsers } = useUsersByIds(missingIds);

  // --- single-mode derived values ---
  const singleValue = multiple
    ? undefined
    : (value as User | string | undefined);
  const selectedId =
    typeof singleValue === "string" ? singleValue : singleValue?.id;

  const resolvedSingleUser =
    typeof singleValue === "string"
      ? fetchedMissingUsers.find((u) => u.id === singleValue)
      : singleValue;

  const selectedFromValue = !resolvedSingleUser
    ? undefined
    : {
        value: resolvedSingleUser.id,
        label: resolvedSingleUser.name,
        key: resolvedSingleUser.id,
      };

  // --- multi-mode derived values ---
  const multiValues = multiple
    ? ((value as (User | string)[] | undefined) ?? [])
    : [];
  const selectedIds = multiValues.map((v) =>
    typeof v === "string" ? v : v.id,
  );

  const passedUsers = multiValues.filter(
    (v): v is User => typeof v !== "string",
  );
  const resolvedMultiUsers = [...passedUsers, ...fetchedMissingUsers];

  const selectedFromValues = resolvedMultiUsers.map((u) => ({
    value: u.id,
    label: u.name,
    key: u.id,
  }));

  const userOptions = useMemo(() => {
    const options = users.map((user) => ({
      value: user.id,
      label: user.name,
      key: user.id,
    }));

    if (multiple) {
      // inject any selected users not yet in the fetched page
      const missingOptions = selectedFromValues.filter(
        (s) => !options.some((o) => o.value === s.value),
      );
      return [...missingOptions, ...options];
    }

    if (
      selectedFromValue &&
      !options.some((o) => o.value === selectedFromValue.value)
    ) {
      return [selectedFromValue, ...options];
    }
    return options;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [users, selectedFromValue, selectedIds.join(","), multiple]);

  if (isLoading && !hasLoadedOnce.current) {
    return (
      <SearchableSelect
        placeholder="Loading..."
        disabled
        options={[]}
        className={className}
      />
    );
  }

  if (fetchError && !hasLoadedOnce.current) {
    return (
      <SearchableSelect
        placeholder="Error fetching users"
        disabled
        hasError
        options={[]}
        className={className}
      />
    );
  }

  const sharedProps = {
    options: hasAllOption ? [allOption, ...userOptions] : userOptions,
    placeholder,
    disabled,
    hasError: error,
    className,
    name,
    onBlur,
    onSearchChange: setSearchQuery,
    onLoadMore: hasNextPage ? () => fetchNextPage() : undefined,
    isFetchingMore: isFetchingNextPage,
  };

  if (multiple) {
    return (
      <SearchableSelect
        {...sharedProps}
        multiple
        value={selectedIds}
        onChange={(ids: string[]) => {
          const selectedUsers = ids
            .map((id) => users.find((u) => u.id === id))
            .filter((u): u is User => u !== undefined);
          (onValueChange as UserSelectMultiProps["onValueChange"])?.(
            ids,
            selectedUsers,
          );
        }}
      />
    );
  }

  return (
    <SearchableSelect
      {...sharedProps}
      value={selectedId}
      onChange={(id: string) =>
        (onValueChange as UserSelectSingleProps["onValueChange"])?.(
          id,
          users.find((u) => u.id === id),
        )
      }
    />
  );
}
