import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Users } from "lucide-react";
import { cn } from "@/utils/cn";
import { Role } from "@/types/domain";

interface RoleListProps {
  roles: Role[];
  selectedId?: string;
  onSelect: (id: string) => void;
  searchQuery?: string;
}

export default function RoleList({
  roles,
  selectedId,
  onSelect,
  searchQuery = "",
}: RoleListProps) {
  const { t } = useTranslation();

  const filteredRoles = useMemo(() => {
    if (!searchQuery) return roles;
    const query = searchQuery.toLowerCase();
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(query) ||
        role.code.toLowerCase().includes(query),
    );
  }, [roles, searchQuery]);

  if (filteredRoles.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        {searchQuery
          ? t("role.no_role")
          : t("role.no_role")}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {filteredRoles.map((role) => {
        const isSelected = role.id === selectedId;

        return (
          <div
            key={role.id}
            className={cn(
              "flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-md transition-colors",
              isSelected && "bg-blue-50 border border-blue-300",
            )}
            onClick={() => onSelect(role.id)}
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 truncate">
                {role.name}
              </div>
              <div className="text-xs text-gray-500 truncate">{role.code}</div>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Users className="h-3 w-3" />
              {role.members?.length || 0}
            </div>
          </div>
        );
      })}
    </div>
  );
}
