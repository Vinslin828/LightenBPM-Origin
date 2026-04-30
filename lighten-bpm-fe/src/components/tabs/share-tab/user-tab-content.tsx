import { useState } from "react";
import { useUsers } from "@/hooks/useMasterData";
import { useDebounce } from "@/hooks/useDebounce";
import { User } from "@/types/domain";
import {
  PermissionAction,
  PermissionGranteeType,
  PermissionItem,
} from "@/types/permission";

import { Avatar } from "@ui/avatar";
import { Checkbox } from "@ui/checkbox";
import { Input } from "@ui/input";

type Props = {
  data: PermissionItem[];
  onChange: (data: PermissionItem[]) => void;
};

export default function UserTabContent({ data, onChange }: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const { users, isLoading } = useUsers(debouncedSearchQuery);

  function toggleUser(checked: boolean, uId: string) {
    if (checked) {
      onChange([
        ...data,
        {
          granteeType: PermissionGranteeType.USER,
          actions: [PermissionAction.USE],
          value: uId,
        } satisfies PermissionItem,
      ]);
    } else {
      onChange(data.filter((d) => d.value !== uId));
    }
  }

  console.debug({ data });

  return (
    <>
      <Input
        placeholder="Search user name or email"
        data-test-id="share-user-search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
      />

      <div className="flex-1 min-h-0 w-full rounded-lg border border-stroke inline-flex flex-col justify-start items-start overflow-y-auto divide-y divide-stroke">
        {isLoading && (
          <div className="py-10 text-primary-text mx-auto">loading...</div>
        )}
        {users.map((u) => (
          <div key={u.id} className="flex flex-row  px-5 py-3 gap-4 w-full">
            <Checkbox
              id={u.id}
              data-test-id={`permission-user-list-${u.id}`}
              checked={!!data.find((d) => d.value === u.id)}
              onCheckedChange={(checked) => toggleUser(checked, u.id)}
            />
            <UserTile user={u} />
          </div>
        ))}
      </div>
    </>
  );
}

type UserTileProps = {
  user: User;
};
export function UserTile({ user }: UserTileProps) {
  return (
    <div className="border-stroke inline-flex justify-start items-center gap-4">
      <div className="flex-1 flex justify-start items-center gap-2.5">
        <Avatar name={user.name} size="sm" colorScheme="blue" />
        <div className="flex-1 inline-flex flex-col justify-end items-start">
          <div className="justify-start text-dark text-base font-medium">
            {user.name}
          </div>
          <div className="justify-center text-primary-text text-xs font-normal">
            {user.email}
          </div>
        </div>
      </div>
    </div>
  );
}
