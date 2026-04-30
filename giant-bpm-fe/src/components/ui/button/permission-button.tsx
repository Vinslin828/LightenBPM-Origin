import { Permission } from "@/types/permission";
import { LockIcon } from "../../icons";

type Props = {
  permission: Permission;
  onSave: () => void;
};
export default function PermissionButton(props: Props) {
  return (
    <div className="h-7 px-2.5 border-stroke rounded-sm border text-sm text-dark font-medium text-center flex flex-row items-center gap-1 cursor-pointer">
      <LockIcon className="w-4 h-4 text-primary-text" />
      {props.permission.scope}
    </div>
  );
}
