import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { X, Search, Trash2 } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User } from "@/types/domain";
import { cn } from "@/utils/cn";

interface AddUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgUnitId: string;
  currentUsers: User[];
  allUsers: User[];
  onAddUsers: (userIds: string[]) => Promise<void>;
  onRemoveUsers: (userIds: string[]) => Promise<void>;
}

/**
 * Modal for adding/removing users from an organization
 * Supports checkbox multi-selection for batch operations
 */
export default function AddUsersModal({
  isOpen,
  onClose,
  orgUnitId,
  currentUsers,
  allUsers,
  onAddUsers,
  onRemoveUsers,
}: AddUsersModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [pendingRemovalIds, setPendingRemovalIds] = useState<Set<string>>(
    new Set(),
  );
  const [pendingAdditionIds, setPendingAdditionIds] = useState<Set<string>>(
    new Set(),
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPendingAdditionIds(new Set());
      setSelectedUserIds(new Set());
      setPendingRemovalIds(new Set());
      setSearchQuery("");
    }
  }, [isOpen]);

  // Filter users not in current organization and not recently added
  const availableUsers = useMemo(() => {
    const currentUserIds = new Set(currentUsers.map((u) => String(u.id)));
    const excludedUserIds = new Set([
      ...Array.from(currentUserIds),
      ...Array.from(pendingAdditionIds),
    ]);
    // Users pending removal can be re-added, so we remove them from excludedUserIds
    pendingRemovalIds.forEach((id) => excludedUserIds.delete(id));
    return allUsers.filter((u) => !excludedUserIds.has(String(u.id)));
  }, [allUsers, currentUsers, pendingAdditionIds, pendingRemovalIds]);

  // Current users excluding those pending removal
  const displayedCurrentUsers = useMemo(() => {
    const existing = currentUsers.filter((u) => !pendingRemovalIds.has(String(u.id)));
    const pendingAdded = allUsers.filter((u) => pendingAdditionIds.has(String(u.id)));
    return [...existing, ...pendingAdded];
  }, [currentUsers, pendingRemovalIds, pendingAdditionIds, allUsers]);

  // Filter by search query
  const filteredAvailableUsers = useMemo(() => {
    if (!searchQuery) return availableUsers;
    const query = searchQuery.toLowerCase();
    return availableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query),
    );
  }, [availableUsers, searchQuery]);

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    const allFilteredIds = filteredAvailableUsers.map((u) => String(u.id));
    const allSelected = allFilteredIds.every((id) => selectedUserIds.has(id));
    if (allSelected) {
      setSelectedUserIds((prev) => {
        const next = new Set(prev);
        allFilteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedUserIds(
        (prev) => new Set([...Array.from(prev), ...allFilteredIds]),
      );
    }
  };

  const handleAddSelected = () => {
    if (selectedUserIds.size === 0) return;
    const idsToAdd = Array.from(selectedUserIds);
    const currentUserIds = new Set(currentUsers.map((u) => String(u.id)));

    setPendingRemovalIds((prev) => {
      const next = new Set(prev);
      idsToAdd.forEach((id) => next.delete(id));
      return next;
    });

    setPendingAdditionIds((prev) => {
      const next = new Set(prev);
      idsToAdd.forEach((id) => {
        if (!currentUserIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });

    setSelectedUserIds(new Set());
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const promises: Promise<void>[] = [];
      if (pendingAdditionIds.size > 0) {
        promises.push(onAddUsers(Array.from(pendingAdditionIds)));
      }
      if (pendingRemovalIds.size > 0) {
        promises.push(onRemoveUsers(Array.from(pendingRemovalIds)));
      }
      await Promise.all(promises);
      setPendingAdditionIds(new Set());
      setPendingRemovalIds(new Set());
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    setPendingAdditionIds(new Set());
    setSelectedUserIds(new Set());
    setPendingRemovalIds(new Set());
    onClose();
  };

  if (!isOpen) return null;

  const allFilteredSelected =
    filteredAvailableUsers.length > 0 &&
    filteredAvailableUsers.every((u) => selectedUserIds.has(String(u.id)));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] min-h-[70vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("organization.add_users")}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Available Users */}
          <div>
            <Label>{t("organization.user_list")}</Label>
            <div className="mt-2">
              <Input
                placeholder={t("organization.search_user_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
                hasClearIcon
              />
            </div>

            {/* Select all + Add selected bar */}
            {filteredAvailableUsers.length > 0 && (
              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  {t("organization.select_all")}
                </label>
                {selectedUserIds.size > 0 && (
                  <Button
                    size="sm"
                    onClick={handleAddSelected}
                  >
                    {t("organization.add_selected")} ({selectedUserIds.size})
                  </Button>
                )}
              </div>
            )}

            {/* User list with checkboxes */}
            <div className="mt-3 space-y-2 max-h-72 overflow-y-auto">
              {filteredAvailableUsers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {searchQuery
                    ? t("organization.no_users_found")
                    : t("organization.all_users_added")}
                </p>
              ) : (
                filteredAvailableUsers.map((user) => {
                  const userId = String(user.id);
                  const isChecked = selectedUserIds.has(userId);
                  return (
                    <label
                      key={`available-${user.id}`}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
                        isChecked
                          ? "bg-blue-50 border border-blue-200"
                          : "hover:bg-gray-50 border border-transparent",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleUser(userId)}
                        className="h-4 w-4 rounded border-gray-300"
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
                  );
                })
              )}
            </div>
          </div>

          {/* Current Users */}
          {displayedCurrentUsers.length > 0 && (
            <div>
              <Label>
                {t("organization.current_users")} (
                {displayedCurrentUsers.length})
              </Label>
              <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
                {displayedCurrentUsers.map((user) => (
                  <div
                    key={`current-${user.id}`}
                    className="flex items-center gap-3 p-2 bg-blue-50 rounded-md"
                  >
                    <Avatar name={user.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate break-all">
                        {user.name}
                      </div>
                      <div className="text-xs text-gray-600 truncate break-all">
                        {user.email}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const id = String(user.id);
                        if (pendingAdditionIds.has(id)) {
                          setPendingAdditionIds((prev) => {
                            const next = new Set(prev);
                            next.delete(id);
                            return next;
                          });
                        } else {
                          setPendingRemovalIds((prev) => {
                            const next = new Set(prev);
                            next.add(id);
                            return next;
                          });
                        }
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title={t("organization.remove_user")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t">
          <Button variant="secondary" onClick={handleClose}>
            {t("buttons.close")}
          </Button>
          {(pendingRemovalIds.size > 0 || pendingAdditionIds.size > 0) && (
            <Button onClick={handleSave} loading={isSaving}>
              {t("buttons.save")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
