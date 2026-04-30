import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAtom } from "jotai";
import {
  sidebarCollapsedAtom,
  expandedGroupsAtom,
  userAtom,
} from "@/store/atoms";
import { MenuIcon } from "@/components/icons";
import { cn } from "@/utils/cn";
import { MenuItem as MenuItemType } from "@/types/shared";
import { menuItems } from "@/const/menu";
import { MenuItem } from "./menu-item";
import { SubMenuItem } from "./submenu-item";

interface SidebarProps {
  className?: string;
}

export const Sidebar = ({ className }: SidebarProps) => {
  const { t } = useTranslation();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useAtom(sidebarCollapsedAtom);
  const [expandedGroups, setExpandedGroups] = useAtom(expandedGroupsAtom);
  const [user] = useAtom(userAtom);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  const isGroupActive = (item: MenuItemType): boolean => {
    if (item.items) {
      return item.items.some((subItem) => isActive(subItem.path));
    }
    return isActive(item.path);
  };

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);

  return (
    // wrapper
    <div
      className={cn(
        "fixed left-0 bg-white border-r border-gray-200 transition-all duration-300 z-50 flex flex-col overflow-hidden",
        isCollapsed ? "w-16" : "w-64",
        "h-[calc(100dvh-44px)]",
        className,
      )}
    >
      {/* Header */}
      {import.meta.env.DEV && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          {!isCollapsed && (
            <h2 className="text-lg font-semibold text-gray-800">
              {t("app_title")}
            </h2>
          )}
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
          >
            <MenuIcon
              className={cn(
                "transform transition-transform",
                isCollapsed && "rotate-180",
              )}
            />
          </button>
        </div>
      )}

      {/* Navigation Menu */}
      <nav className="px-3 py-4 space-y-1 overflow-y-auto flex-1 min-h-0">
        {menuItems
          .filter((item) => {
            if (user?.isAdmin) return true;

            return item.path === "/dashboard";
          })
          .map((item) => {
            const hasSubItems = item.items && item.items.length > 0;
            const isExpanded = expandedGroups.has(item.key);
            const itemIsActive = isGroupActive(item);

            return (
              <div key={item.key} className="space-y-1">
                <MenuItem
                  item={item}
                  isActive={itemIsActive}
                  isCollapsed={isCollapsed}
                  isExpanded={isExpanded}
                  onToggle={
                    hasSubItems ? () => toggleGroup(item.key) : undefined
                  }
                />

                {/* Submenu items */}
                {hasSubItems && !isCollapsed && isExpanded && (
                  <div className="space-y-1">
                    {item.items!.map((subItem) => (
                      <SubMenuItem
                        key={subItem.key}
                        item={subItem}
                        isActive={isActive(subItem.path)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
      </nav>

      {!isCollapsed && (
        <span className="text-secondary-text p-5 text-xs font-body-xs-regular">
          Version {import.meta.env.VITE_PUBLIC_BUILD_VERSION}
        </span>
      )}
    </div>
  );
};
