import { DepartmentIcon, TrashIcon, UserIcon } from "@/components/icons";
import {
  AllPermissionData,
  PermissionItem,
  PermissionTabKey,
} from "@/types/permission";
import { UserTile } from "./user-tab-content";
import { useOrgRoles, useOrgUnits, useUsers } from "@/hooks/useMasterData";
import { RoleTile } from "./role-tab-content";
import { useMemo } from "react";

type Props = {
  data: AllPermissionData;
  onChange: (data: AllPermissionData) => void;
  setCurrentTab: (tab: PermissionTabKey) => void;
};
export default function AllTabContent({
  data,
  onChange,
  setCurrentTab,
}: Props) {
  const hasData = useMemo(
    () => data.org.length > 0 || data.user.length > 0 || data.user.length > 0,
    [data],
  );
  return (
    <>
      <div className="inline-flex flex-col justify-start items-start gap-2.5 overflow-y-hidden">
        <div className="self-stretch pr-5 inline-flex justify-start items-center gap-5">
          <div className="flex-1 justify-start text-gray-900 text-base font-medium">
            Access list
          </div>
          {hasData && (
            <button onClick={() => onChange({ user: [], role: [], org: [] })}>
              <TrashIcon className="size-5 text-secondary-text" />
            </button>
          )}
        </div>
        {!hasData && (
          <div className="flex flex-row text-secondary-text text-sm ">
            No one can access yet. Click{" "}
            <span
              className="text-giant-blue pl-1.5 underline-offset-2 underline decoration-giant-blue cursor-pointer"
              onClick={() => setCurrentTab(PermissionTabKey.USER)}
            >
              User
            </span>
            ,
            <span
              className="text-giant-blue px-1.5 underline-offset-2 underline decoration-giant-blue cursor-pointer"
              onClick={() => setCurrentTab(PermissionTabKey.ROLE)}
            >
              Role
            </span>
            or
            <span
              className="text-giant-blue px-1.5 underline-offset-2 underline decoration-giant-blue cursor-pointer"
              onClick={() => setCurrentTab(PermissionTabKey.ORG)}
            >
              Organization
            </span>
            tab to configure.
          </div>
        )}
        <AllList data={data} onChange={onChange} />
      </div>
    </>
  );
}

export function AllList({
  data,
  onChange,
}: {
  data: AllPermissionData;
  onChange: (data: AllPermissionData) => void;
}) {
  return (
    <div className="overflow-y-auto w-full space-y-2.5">
      {data.user.length > 0 && (
        <UserList
          data={data.user}
          onRemove={(value) =>
            onChange({
              ...data,
              user: data.user.filter((item) => item.value !== value),
            })
          }
        />
      )}
      {data.role.length > 0 && (
        <RoleList
          data={data.role}
          onRemove={(value) =>
            onChange({
              ...data,
              role: data.role.filter((item) => item.value !== value),
            })
          }
        />
      )}
      {data.org.length > 0 && (
        <OrgList
          data={data.org}
          onRemove={(value) =>
            onChange({
              ...data,
              org: data.org.filter((item) => item.value !== value),
            })
          }
        />
      )}
    </div>
  );
}

function UserList({
  data,
  onRemove,
}: {
  data: PermissionItem[];
  onRemove: (value: string) => void;
}) {
  const { users } = useUsers();
  return (
    <div className="rounded-lg border border-stroke flex flex-col justify-start items-start overflow-hidden divide-y divide-stroke w-full bg-white">
      {data.map((entry) => {
        const user = users.find((item) => item.id === entry.value);
        if (!user) {
          return null;
        }
        return (
          <div
            key={entry.value}
            className="flex flex-row gap-2.5 px-5 py-3 items-center justify-between w-full"
          >
            <div className="min-w-0 flex-1">
              <UserTile user={user} />
            </div>

            <button onClick={() => onRemove(entry.value)}>
              <TrashIcon className="size-5 text-secondary-text" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
function RoleList({
  data,
  onRemove,
}: {
  data: PermissionItem[];
  onRemove: (value: string) => void;
}) {
  const { roles } = useOrgRoles();
  return (
    <div className="rounded-lg border border-stroke flex flex-col justify-start items-start overflow-hidden divide-y divide-stroke w-full bg-white">
      {data.map((entry) => {
        const role = roles?.find((item) => item.id === entry.value);
        return (
          <div
            key={entry.value}
            className="flex flex-row gap-2.5 px-5 py-3 items-center justify-between w-full"
          >
            <RoleTile
              name={role?.name ?? "Unknown role"}
              membersCount={role?.members?.length ?? 0}
            />
            <button onClick={() => onRemove(entry.value)}>
              <TrashIcon className="size-5 text-secondary-text" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
function OrgList({
  data,
  onRemove,
}: {
  data: PermissionItem[];
  onRemove: (value: string) => void;
}) {
  const { units } = useOrgUnits();
  return (
    <div className="rounded-lg border border-stroke flex flex-col justify-start items-start overflow-hidden divide-y divide-stroke w-full bg-white">
      {data.map((entry) => {
        const unit = units?.find((item) => item.id === entry.value);
        if (!unit) {
          return null;
        }
        return (
          <div
            key={entry.value}
            className="flex flex-row gap-2.5 px-5 py-3 items-center justify-between w-full"
          >
            <OrgTile
              name={unit.name}
              membersCount={unit.members?.length ?? 0}
            />
            <button onClick={() => onRemove(entry.value)}>
              <TrashIcon className="size-5 text-secondary-text" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function OrgTile({
  name,
  membersCount,
}: {
  name: string;
  membersCount: number;
}) {
  return (
    <>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <DepartmentIcon className="text-primary-text size-4.5" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-end items-start">
          <div
            className="w-full truncate text-gray-900 text-sm font-medium"
            title={name}
          >
            {name}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <UserIcon className="text-primary-text" />
        <div className="justify-start text-gray-500 text-xs font-normal">
          {membersCount}
        </div>
      </div>
    </>
  );
}
