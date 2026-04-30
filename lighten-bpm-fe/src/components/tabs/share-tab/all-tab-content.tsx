import { TrashIcon } from "@/components/icons";
import { PermissionItem, PermissionTabKey } from "@/types/permission";
import { UserTile } from "./user-tab-content";
import { useUsers } from "@/hooks/useMasterData";
import { useMemo } from "react";

type Props = {
  data: PermissionItem[];
  onChange: (data: PermissionItem[]) => void;
  setCurrentTab: (tab: PermissionTabKey) => void;
};
export default function AllTabContent({
  data,
  onChange,
  setCurrentTab,
}: Props) {
  const hasData = useMemo(() => data.length > 0, [data]);
  return (
    <>
      <div className="inline-flex flex-col justify-start items-start gap-2.5 overflow-y-hidden">
        <div className="self-stretch pr-5 inline-flex justify-start items-center gap-5">
          <div className="flex-1 justify-start text-gray-900 text-base font-medium">
            Access list
          </div>
          {hasData && (
            <button onClick={() => onChange([])}>
              <TrashIcon className="size-5 text-secondary-text" />
            </button>
          )}
        </div>
        {!hasData && (
          <div className="flex flex-row text-secondary-text text-sm ">
            No one can access yet. Click{" "}
            <span
              className="text-lighten-blue px-1.5 underline-offset-2 underline decoration-lighten-blue cursor-pointer"
              onClick={() => setCurrentTab(PermissionTabKey.USER)}
            >
              User
            </span>
            tab to configure.
          </div>
        )}
        <div className="overflow-y-auto w-full space-y-2.5">
          {data.length > 0 && (
            <UserList
              data={data}
              onRemove={(value) =>
                onChange(data.filter((item) => item.value !== value))
              }
            />
          )}
        </div>
      </div>
    </>
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
    <div className="rounded-lg border border-stroke flex flex-col justify-start items-start overflow-hidden divide-y divide-stroke w-full">
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
            <UserTile user={user} />
            <button onClick={() => onRemove(entry.value)}>
              <TrashIcon className="size-5 text-secondary-text" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
