import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Search, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User } from "@/types/domain";
import { cn } from "@/utils/cn";

interface RoleAddUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUsers: User[];
  allUsers: User[];
  onAddUsers: (userIds: string[]) => Promise<void>;
  onRemoveUsers: (userIds: string[]) => Promise<void>;
}

export default function RoleAddUsersModal({
  isOpen,
  onClose,
  currentUsers,
  allUsers,
  onAddUsers,
  onRemoveUsers,
}: RoleAddUsersModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"user" | "all">("user");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [checkedUserIds, setCheckedUserIds] = useState<Set<string>>(new Set());
  const [uncheckedUserIds, setUncheckedUserIds] = useState<Set<string>>(
    new Set(),
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCheckedUserIds(new Set());
      setUncheckedUserIds(new Set());
      setSearchQuery("");
      setActiveTab("user");
    }
  }, [isOpen]);

  const currentUserIds = useMemo(
    () => new Set(currentUsers.map((u) => String(u.id))),
    [currentUsers],
  );

  // "All" tab: current users + newly checked, minus unchecked
  const allTabUsers = useMemo(() => {
    const kept = currentUsers.filter(
      (u) => !uncheckedUserIds.has(String(u.id)),
    );
    const newlyAdded = allUsers.filter(
      (u) =>
        checkedUserIds.has(String(u.id)) && !currentUserIds.has(String(u.id)),
    );
    return [...kept, ...newlyAdded];
  }, [
    currentUsers,
    allUsers,
    checkedUserIds,
    uncheckedUserIds,
    currentUserIds,
  ]);

  // In "User" tab: all users with checkbox state
  const filteredUsers = useMemo(() => {
    let users = allUsers;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      users = users.filter(
        (u) =>
          u.name.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query),
      );
    }
    return users;
  }, [allUsers, searchQuery]);

  const isUserChecked = (userId: string) => {
    const uid = String(userId);
    if (checkedUserIds.has(uid)) return true;
    if (uncheckedUserIds.has(uid)) return false;
    return currentUserIds.has(uid);
  };

  const handleCheckboxToggle = (userId: string) => {
    const uid = String(userId);
    const wasOriginallyAssigned = currentUserIds.has(uid);

    if (isUserChecked(uid)) {
      // Uncheck
      if (wasOriginallyAssigned) {
        setUncheckedUserIds((prev) => new Set([...Array.from(prev), uid]));
        setCheckedUserIds((prev) => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
      } else {
        setCheckedUserIds((prev) => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
      }
    } else {
      // Check
      if (wasOriginallyAssigned) {
        setUncheckedUserIds((prev) => {
          const next = new Set(prev);
          next.delete(uid);
          return next;
        });
      } else {
        setCheckedUserIds((prev) => new Set([...Array.from(prev), uid]));
      }
    }
  };

  const handleOk = async () => {
    const toAdd = Array.from(checkedUserIds).filter(
      (uid) => !currentUserIds.has(uid),
    );
    const toRemove = Array.from(uncheckedUserIds).filter((uid) =>
      currentUserIds.has(uid),
    );

    if (toAdd.length === 0 && toRemove.length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await Promise.all([
        toAdd.length > 0 ? onAddUsers(toAdd) : Promise.resolve(),
        toRemove.length > 0 ? onRemoveUsers(toRemove) : Promise.resolve(),
      ]);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const assignedCount = allTabUsers.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("role.add_users")}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-2">
          <button
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              activeTab === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            )}
            onClick={() => setActiveTab("all")}
          >
            {t("role.tab_all")}
            {assignedCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full bg-white/20 text-xs">
                {assignedCount}
              </span>
            )}
          </button>
          <button
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              activeTab === "user"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200",
            )}
            onClick={() => setActiveTab("user")}
          >
            {t("role.tab_user")}
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === "user" && (
            <>
              <Input
                placeholder={t("role.search_user_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
                hasClearIcon
              />
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {t("organization.no_users_found")}
                  </p>
                ) : (
                  filteredUsers.map((user) => (
                    <label
                      key={user.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isUserChecked(String(user.id))}
                        onChange={() => handleCheckboxToggle(String(user.id))}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <Avatar name={user.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-600 truncate">
                          {user.email}
                        </div>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </>
          )}

          {activeTab === "all" && (
            <>
              <div className="text-sm text-gray-600 mb-2">
                {t("role.user_list")}
              </div>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {allTabUsers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {t("role.no_members")}
                  </p>
                ) : (
                  allTabUsers.map((user) => {
                    const uid = String(user.id);
                    const isSaved = currentUserIds.has(uid);
                    return (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-2 bg-blue-50 rounded-md"
                      >
                        <Avatar name={user.name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {user.email}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (isSaved) {
                              // Mark as unchecked — will be removed on Save
                              setUncheckedUserIds(
                                (prev) => new Set([...Array.from(prev), uid]),
                              );
                              setCheckedUserIds((prev) => {
                                const next = new Set(prev);
                                next.delete(uid);
                                return next;
                              });
                            } else {
                              // Just uncheck — not yet saved to backend
                              setCheckedUserIds((prev) => {
                                const next = new Set(prev);
                                next.delete(uid);
                                return next;
                              });
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t">
          <Button variant="secondary" onClick={onClose}>
            {t("buttons.cancel")}
          </Button>
          <Button onClick={handleOk} loading={isSaving}>
            OK
          </Button>
        </div>
      </div>
    </div>
  );
}
