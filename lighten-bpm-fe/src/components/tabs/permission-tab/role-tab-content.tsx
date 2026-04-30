import { useState } from "react";
import { RoleIcon, UserIcon } from "@/components/icons";
import { useDebounce } from "@/hooks/useDebounce";
import { useOrgRoles } from "@/hooks/useMasterData";
import {
  PermissionAction,
  PermissionGranteeType,
  PermissionItem,
} from "@/types/permission";
import { Checkbox } from "@ui/checkbox";
import { Input } from "@ui/input";

type Props = {
  data: PermissionItem[];
  onChange: (data: PermissionItem[]) => void;
};

export default function RoleTabContent({ data, onChange }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const { roles, isLoading } = useOrgRoles(debouncedSearchQuery);

  function toggleRole(checked: boolean, roleId: string) {
    if (checked) {
      onChange([
        ...data,
        {
          granteeType: PermissionGranteeType.ROLE,
          actions: [PermissionAction.USE],
          value: roleId,
        } satisfies PermissionItem,
      ]);
    } else {
      onChange(data.filter((entry) => entry.value !== roleId));
    }
  }

  return (
    <>
      <Input
        placeholder="Search role name"
        data-test-id="permission-role-search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
      />

      <div className="flex-1 min-h-0 w-full rounded-lg border border-stroke inline-flex flex-col justify-start items-start overflow-y-auto">
        {isLoading && (
          <div className="py-10 text-primary-text mx-auto">loading...</div>
        )}
        {roles?.map((role) => (
          <div
            key={role.id}
            className="self-stretch min-w-0 px-5 py-3 border-b border-stroke inline-flex justify-start items-center gap-4 last:border-b-0"
          >
            <Checkbox
              id={role.id}
              data-test-id={`permission-role-list-${role.id}`}
              checked={!!data.find((entry) => entry.value === role.id)}
              onCheckedChange={(checked) =>
                toggleRole(Boolean(checked), role.id)
              }
            />
            <RoleTile name={role.name} membersCount={role.members?.length} />
          </div>
        ))}
      </div>
    </>
  );
}

type RoleTileProps = {
  name: string;
  membersCount?: number;
};

export function RoleTile({ name, membersCount = 0 }: RoleTileProps) {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-2.5">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gray-2 flex items-center justify-center">
          <RoleIcon className="text-primary-text size-4.5" />
        </div>

        <div
          className="min-w-0 flex-1 truncate text-dark text-sm font-medium"
          title={name}
        >
          {name}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <UserIcon className="text-primary-text" />
        <div className="justify-start text-primary-text text-xs font-normal">
          {membersCount}
        </div>
      </div>
    </div>
  );
}
