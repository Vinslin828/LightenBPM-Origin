import { useMemo, useState } from "react";
import AllTabContent from "./all-tab-content";
import OrgTabContent from "./org-tab-content";
import RoleTabContent from "./role-tab-content";
import UserTabContent from "./user-tab-content";
import {
  AllPermissionData,
  Permission,
  PermissionScope,
  PermissionTabKey,
} from "@/types/permission";
import { Button } from "@ui/button";
import { cn } from "@/utils/cn";

type Props = {
  initialData: Permission;
  onCancel: () => void;
  onSave: (permission: Permission) => void;
};

const TAB_ITEMS = [
  // TODO: i18n
  { key: PermissionTabKey.ALL, label: "All" },
  { key: PermissionTabKey.USER, label: "User" },
  { key: PermissionTabKey.ROLE, label: "Role" },
  { key: PermissionTabKey.ORG, label: "Organization" },
];

export default function PermissionTab({
  initialData: initialData,
  ...props
}: Props) {
  const [currentTab, setCurrentTab] = useState<PermissionTabKey>(
    PermissionTabKey.ALL,
  );
  const [allPermission, setAllPermission] = useState<AllPermissionData>(
    initialData["permissions"] ?? {
      role: [],
      user: [],
      org: [],
    },
  );

  const permissionData = useMemo(() => {
    return {
      [PermissionTabKey.ALL]: allPermission,
      [PermissionTabKey.USER]: allPermission.user,
      [PermissionTabKey.ROLE]: allPermission.role,
      [PermissionTabKey.ORG]: allPermission.org,
    };
  }, [allPermission]);

  const getTabCount = (tab: PermissionTabKey) => {
    if (tab !== PermissionTabKey.ALL) {
      return permissionData[tab].length;
    } else {
      const current = permissionData[tab];
      return current.org.length + current.role.length + current.user.length;
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
                      ? "bg-lighten-blue text-white"
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
                          ? "bg-white text-lighten-blue"
                          : "bg-lighten-blue text-white",
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
              onChange={(allPermission) => setAllPermission(allPermission)}
              setCurrentTab={setCurrentTab}
            />
          ) : null}
          {currentTab === PermissionTabKey.USER ? (
            <UserTabContent
              data={permissionData[PermissionTabKey.USER]}
              onChange={(userPermission) =>
                setAllPermission({ ...allPermission, user: userPermission })
              }
            />
          ) : null}
          {currentTab === PermissionTabKey.ROLE ? (
            <RoleTabContent
              data={permissionData[PermissionTabKey.ROLE]}
              onChange={(rolePermission) =>
                setAllPermission({ ...allPermission, role: rolePermission })
              }
            />
          ) : null}
          {currentTab === PermissionTabKey.ORG ? (
            <OrgTabContent
              data={permissionData[PermissionTabKey.ORG]}
              onChange={(orgPermission) =>
                setAllPermission({ ...allPermission, org: orgPermission })
              }
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
            props.onSave({
              scope: PermissionScope.INVITED,
              permissions: allPermission,
            });
          }}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
