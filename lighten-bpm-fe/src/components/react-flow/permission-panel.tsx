import {
  useUpdateWorkflowPermissions,
  useWorkflowPermissions,
} from "@/hooks/usePermissions";
import { PermissionScope } from "@/types/permission";
import { useParams } from "react-router-dom";
import { Select, SelectOption } from "@/components/ui/select";
import { useModal } from "@/hooks/useModal";
import PermissionModal from "../modals/permission-modal";
import PermissionMenu from "@ui/permission-menu";
import { ChevronDown, ChevronRight } from "lucide-react";
import Menu from "@ui/menu";
import { cn } from "@/utils/cn";
import { V } from "framer-motion/dist/types.d-Cjd591yU";
import { AllList } from "../tabs/permission-tab/all-tab-content";

const PERMISSION_SCOPE_OPTIONS: SelectOption<PermissionScope>[] = [
  { label: "Everyone", value: PermissionScope.EVERYONE, key: "everyone" },
  {
    label: "Only those invited",
    value: PermissionScope.INVITED,
    key: "invited",
  },
  { label: "Admins only", value: PermissionScope.ADMIN, key: "admin" },
];

export default function PermissionPanel() {
  const { flowId } = useParams<{
    flowId: string;
  }>();

  const { permission } = useWorkflowPermissions(flowId);
  const { mutate: updatePermission } = useUpdateWorkflowPermissions();

  const modal = useModal();

  return (
    <div className="bg-white border-l border-stroke inline-flex flex-col max-w-full">
      <PermissionModal
        {...modal}
        permission={permission}
        onSave={(permissions) =>
          updatePermission({
            workflowId: flowId as string,
            permission: permissions,
          })
        }
      />
      <div className="px-5 bg-white flex justify-start items-center gap-2 h-[58px] text-gray-900 text-base font-semibold sticky top-0 z-10 w-full">
        Permission
      </div>
      <div className="flex flex-col px-5 py-4 bg-gray-100 border-b border-stroke gap-4 max-w-full">
        <div className="justify-start text-gray-500 text-sm font-medium">
          Configure access permission for this workflow, access is DENIED unless
          explicitly granted.
        </div>
        <div
          data-arrow-down="true"
          data-arrow-up="false"
          data-expended="Off"
          data-label="On"
          data-state="Default"
          className="flex flex-col justify-start items-start gap-2.5"
        >
          <div className="inline-flex justify-start items-start gap-2.5">
            <div className="justify-start text-gray-900 text-base font-medium">
              Who can access
            </div>
          </div>

          {/* Permission Menu */}
          <Menu
            className="w-[319px]"
            items={[
              {
                label: (
                  <div className="text-dark text-base my-1">Admin only</div>
                ),
                onClick: () => {
                  updatePermission({
                    workflowId: flowId!,
                    permission: {
                      scope: PermissionScope.ADMIN,
                      permissions: {
                        role: [],
                        user: [],
                        org: [],
                      },
                    },
                  });
                },
              },
              {
                label: (
                  <>
                    <div className="text-dark text-base my-1">
                      Only those invited
                    </div>
                    <ChevronRight className="h5 w-5 text-primary-text" />
                  </>
                ),
                className: "justify-between",
                onClick: () => {
                  modal.open();
                },
              },
              {
                label: <div className="text-dark text-base my-1">Everyone</div>,
                onClick: () => {
                  updatePermission({
                    workflowId: flowId!,
                    permission: {
                      scope: PermissionScope.EVERYONE,
                      permissions: {
                        role: [],
                        user: [],
                        org: [],
                      },
                    },
                  });
                },
              },
            ]}
            trigger={
              <div
                className={cn(
                  "w-[319px] flex flex-row justify-between",
                  "appearance-none h-12 rounded-[6px] bg-white px-5 py-3",
                  "border border-stroke text-base font-normal",
                  "focus:border-[1.5px] focus:border-lighten-blue focus:outline-none",
                  "text-dark",
                )}
              >
                {
                  PERMISSION_SCOPE_OPTIONS.find(
                    (opt) => opt.value === permission.scope,
                  )?.label
                }
                <ChevronDown className="size-4 text-primary-text" />
              </div>
            }
          />
          <AllList
            data={permission.permissions}
            onChange={(permissions) =>
              updatePermission({
                workflowId: flowId!,
                permission: {
                  scope: PermissionScope.INVITED,
                  permissions,
                },
              })
            }
          />
        </div>
      </div>
    </div>
  );
}
