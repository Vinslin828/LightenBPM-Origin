import { useMemo, useState } from "react";
import AllTabContent from "./all-tab-content";
import UserTabContent from "./user-tab-content";
import {
  AllPermissionData,
  Permission,
  PermissionItem,
  PermissionScope,
  PermissionTabKey,
} from "@/types/permission";
import { Button } from "@ui/button";
import { cn } from "@/utils/cn";

type Props = {
  initialData: PermissionItem[];
  onCancel: () => void;
  onSave: (permission: PermissionItem[]) => void;
};

const TAB_ITEMS = [
  // TODO: i18n
  { key: PermissionTabKey.ALL as const, label: "All" },
  { key: PermissionTabKey.USER as const, label: "User" },
];

export default function ShareTab({
  initialData: initialData,
  ...props
}: Props) {
  const [currentTab, setCurrentTab] = useState<PermissionTabKey>(
    PermissionTabKey.ALL,
  );
  const [userPermission, setUserPermission] = useState<PermissionItem[]>(
    initialData ?? [],
  );

  const permissionData = useMemo(() => {
    return {
      [PermissionTabKey.ALL]: userPermission,
      [PermissionTabKey.USER]: userPermission,
    };
  }, [userPermission]);

  const getTabCount = (tab: PermissionTabKey.ALL | PermissionTabKey.USER) => {
    if (tab !== PermissionTabKey.ALL) {
      return permissionData[tab].length;
    } else {
      const current = permissionData[tab];
      return current.length;
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-7.5 h-[600px] overflow-y-scroll">
        <div className="p-[30px] flex flex-col gap-5 max-w-full overflow-hidden">
          <div className="text-gray-900 text-2xl font-semibold text-center">
            Permission
          </div>
          <div className="flex flex-row w-full gap-2.5">
            {TAB_ITEMS.map((tab) => {
              const isActive = currentTab === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  className={cn(
                    "h-11 px-5 py-2 rounded-lg flex justify-center items-center gap-2.5 text-base font-medium w-full border border-stroke",
                    isActive
                      ? "bg-giant-blue text-white"
                      : "bg-white text-gray-900",
                  )}
                  onClick={() => setCurrentTab(tab.key)}
                >
                  <span>{tab.label}</span>
                  {getTabCount(tab.key) > 0 && (
                    <span
                      className={cn(
                        `w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium `,
                        isActive
                          ? "bg-white text-giant-blue"
                          : "bg-giant-blue text-white",
                      )}
                    >
                      {getTabCount(tab.key)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {currentTab === PermissionTabKey.ALL ? (
            <AllTabContent
              data={permissionData[PermissionTabKey.ALL]}
              onChange={(allPermission) => setUserPermission(allPermission)}
              setCurrentTab={setCurrentTab}
            />
          ) : null}
          {currentTab === PermissionTabKey.USER ? (
            <UserTabContent
              data={permissionData[PermissionTabKey.USER]}
              onChange={(userPermission) => setUserPermission(userPermission)}
            />
          ) : null}
        </div>
      </div>
      <div className="flex flex-row gap-4.5 px-7.5 pb-7.5 justify-center">
        <Button
          variant={"tertiary"}
          className="w-[190px]"
          onClick={() => props.onCancel()}
        >
          Cancel
        </Button>
        <Button
          variant={"default"}
          className="w-[190px]"
          onClick={() => {
            // props.onSave();
            props.onSave(userPermission);
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
