import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChevronRightIcon } from "@/components/icons";
import { cn } from "@/utils/cn";
import { type MenuItem as MenuItemType } from "@/types/shared";
import is from "zod/v4/locales/is.cjs";

interface MenuItemProps {
  item: MenuItemType;
  isActive: boolean;
  isCollapsed: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}

export const MenuItem = ({
  item,
  isActive,
  isCollapsed,
  isExpanded,
  onToggle,
}: MenuItemProps) => {
  const { t } = useTranslation();
  const hasSubItems = item.items && item.items.length > 0;

  if (hasSubItems) {
    return (
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center justify-between w-full px-2 py-2 text-sm font-medium transition-colors group rounded-lg",
          isActive
            ? "bg-lighten-blue text-white"
            : "text-gray-700 hover:bg-gray-2",
        )}
        title={isCollapsed ? t(item.labelKey) : ""}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0">{item.icon({})}</div>
          {!isCollapsed && (
            <span className="ml-3 truncate">{t(item.labelKey)}</span>
          )}
        </div>
        {!isCollapsed && (
          <ChevronRightIcon
            className={cn(
              "transition-transform",
              isExpanded ? "transform rotate-90" : "",
            )}
          />
        )}
      </button>
    );
  }

  return (
    <Link
      to={item.path}
      className={cn(
        "flex items-center px-2 py-2 text-sm font-medium transition-colors group rounded-lg",
        isActive
          ? "bg-lighten-blue text-white"
          : "text-primary-text hover:bg-gray-2",
        isCollapsed ? "rounded-lg" : "rounded-md",
      )}
      title={isCollapsed ? t(item.labelKey) : ""}
    >
      <div
        className={cn(
          "flex-shrink-0",
          isActive ? "fill-white" : "fill-primary-text",
        )}
      >
        {item.icon({ className: "w-7 h-7" })}
      </div>
      {!isCollapsed && (
        <span className="ml-3 truncate">{t(item.labelKey)}</span>
      )}
    </Link>
  );
};
