import { ArrowRight } from "lucide-react";
import { useOrgRoles, useOrgUnits, useUsersByIds } from "@/hooks/useMasterData";
import { ApprovalNodeType, ApproverType } from "@/types/flow";
import { Avatar } from "@ui/avatar";
import { cn } from "@/utils/cn";
import { ReactNode } from "react";
import { ExpressionIcon } from "@/components/icons";

type ApproverTagProps = {
  data: ApprovalNodeType["data"];
};

const Tag = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "bg-green-light-6 text-green rounded-xs h-6 px-2 flex items-center text-xs font-medium whitespace-nowrap",
      className,
    )}
  >
    <span className="overflow-ellipsis overflow-hidden max-w-full whitespace-nowrap">
      {children}
    </span>
  </div>
);

export const ApproverTag = ({ data }: ApproverTagProps) => {
  const { units } = useOrgUnits();
  const { roles } = useOrgRoles();
  const su = data.specificUser as
    | { userId?: string; userIds?: string[] }
    | undefined;
  const userIds = su?.userIds ?? (su?.userId ? [su.userId] : []);
  const { users } = useUsersByIds(userIds);

  const renderReportingLineTag = () => {
    if (
      data.approver !== ApproverType.ApplicantReportLine &&
      data.approver !== ApproverType.UserReportLine
    ) {
      return null;
    }

    const method = data.approveMethod;
    if (!method) return null;

    if ("jobGrade" in method && method.jobGrade !== undefined) {
      return (
        <div className="flex flex-row gap-2 items-center justify-center pl-1.5">
          <ArrowRight className="text-primary-text w-4 h-4" />
          <Tag>L{method.jobGrade}</Tag>
        </div>
      );
    }

    if ("approveLevel" in method && method.approveLevel !== undefined) {
      return (
        <div className="flex flex-row gap-2 items-center justify-center text-primary-text pl-1.5">
          <div>&</div>
          <Tag>{method.approveLevel}L</Tag>
        </div>
      );
    }

    return null;
  };

  const renderDepartmentTag = () => {
    if (data.approver !== ApproverType.DepartmentSupervisor) return null;

    const department =
      data.departmentSupervisor?.department?.name ??
      units?.find((u) => u.id === data.departmentSupervisor?.departmentId)
        ?.name;

    if (!department) return null;

    return <Tag className="ml-1.5">{department}</Tag>;
  };

  const renderRoleTag = () => {
    if (data.approver !== ApproverType.Role) return null;

    const roleData = data.specificRole;
    if (!roleData) return null;

    const roleName =
      roleData.type === "reference"
        ? roleData.roleId
        : (roleData.role?.name ??
          roles?.find((r) => r.id === roleData.roleId)?.name ??
          roleData.roleId);

    if (!roleName) return null;

    return <Tag className="ml-1.5">{roleName}</Tag>;
  };

  const renderUserAvatar = () => {
    if (data.approver !== ApproverType.User) return null;

    if (users.length === 0) return null;

    return (
      <div className="ml-1.5 flex -space-x-2 items-center">
        {users.slice(0, 3).map((u, i) => (
          <Avatar
            key={u.id}
            name={u.name}
            size="xs"
            className="ring-2 ring-white relative"
            style={{ zIndex: 3 - i }}
          />
        ))}
        {users.length > 3 && (
          <div className="flex items-center justify-center h-6 w-6 rounded-full bg-gray-100 ring-2 ring-white text-[10px] font-medium text-gray-600 relative z-0 ml-2.5">
            +{users.length - 3}
          </div>
        )}
      </div>
    );
  };

  return (
    renderReportingLineTag() ??
    renderDepartmentTag() ??
    renderRoleTag() ??
    renderUserAvatar()
  );
};
