import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";
import { User } from "@/types/domain";

interface UserListProps {
  users: User[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function UserList({
  users,
  selectedId,
  onSelect,
}: UserListProps) {
  const { t } = useTranslation();

  if (users.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        {t("user_management.no_user")}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {users.map((user) => {
        const isSelected = user.id === selectedId;

        return (
          <div
            key={user.id}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 rounded-md transition-colors",
              isSelected && "bg-blue-50 border border-blue-300",
            )}
            onClick={() => onSelect(user.id)}
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-sm font-medium text-blue-700">
                  {getInitials(user.name)}
                </span>
              </div>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[10px] font-medium text-blue-700 bg-blue-50 rounded px-1">
                {user.jobGrade}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">
                {user.name}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {user.code}
                {user.defaultOrgCode ? `  ${user.defaultOrgCode}` : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
