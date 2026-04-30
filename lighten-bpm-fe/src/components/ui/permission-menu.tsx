import { Permission, PermissionScope } from "@/types/permission";
import Menu from "./menu";
import PermissionButton from "./button/permission-button";
import { ChevronRight } from "lucide-react";

type Props = {
  permission: Permission;
  workflowId: string;
  onSave: (permission: Permission) => void;
};
export default function PermissionMenu(props: Props) {
  return (
    <Menu
      className="w-[201px]"
      items={[
        {
          label: (
            <div className="text-secondary-text text-xs font-medium">
              Permission
            </div>
          ),

          onClick: () => {},
          className: "h-7 hover:bg-transparent",
        },
        {
          label: <div className="text-dark text-base my-1">Admin only</div>,
          onClick: () => {
            props.onSave({
              scope: PermissionScope.ADMIN,
              permissions: {
                role: [],
                user: [],
                org: [],
              },
            });
          },
        },
        {
          label: (
            <>
              <div className="text-dark text-base my-1">Only those invited</div>
              <ChevronRight className="h5 w-5 text-primary-text" />
            </>
          ),
          className: "justify-between",
          onClick: () => {
            props.onSave({
              scope: PermissionScope.INVITED,
              permissions: {
                role: [],
                user: [],
                org: [],
              },
            });
          },
        },
        {
          label: <div className="text-dark text-base my-1">Everyone</div>,
          onClick: () => {
            props.onSave({
              scope: PermissionScope.EVERYONE,
              permissions: {
                role: [],
                user: [],
                org: [],
              },
            });
          },
        },
      ]}
      trigger={
        <PermissionButton permission={props.permission} onSave={() => {}} />
      }
    />
  );
}
