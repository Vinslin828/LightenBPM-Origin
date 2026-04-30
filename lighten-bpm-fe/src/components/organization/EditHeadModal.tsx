import { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/datetime-selector";
import { Checkbox } from "@/components/ui/checkbox";
import { ValidationError } from "@/components/ui/validation-error";
import { User } from "@/types/domain";
import { OrgHead } from "@/types/organization";
import { cn } from "@/utils/cn";
import { Search, X, Trash2 } from "lucide-react";

interface EditHeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgUnitId: string;
  currentHeads: OrgHead[];
  allUsers: User[];
  onCreateHead: (input: {
    userId: string;
    startDate: string;
    endDate?: string;
  }) => Promise<void>;
  onUpdateHead: (input: {
    headId: string;
    startDate: string;
    endDate?: string;
  }) => Promise<void>;
  onDeleteHead: (input: { headId: string }) => Promise<void>;
  onSaveSuccess?: () => void;
  onSaveError?: () => void;
}

interface PendingHead {
  userId: string;
  userName: string;
  userEmail: string;
  startDate: number | undefined;
  endDate: number | undefined;
  noEndDate: boolean;
}

const NO_END_DATE_ISO = new Date(Date.UTC(9999, 0, 1)).toISOString();
const NO_END_DATE_MS = new Date(NO_END_DATE_ISO).getTime();

const toMillis = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.getTime();
};

const isNoEndDateValue = (value?: string) => {
  const ms = toMillis(value);
  if (!ms) return false;
  return ms >= NO_END_DATE_MS;
};

const toDateLabel = (value?: string) => {
  if (!value || isNoEndDateValue(value)) return "-";
  const ms = toMillis(value);
  if (!ms) return "-";
  return dayjs(ms).format("YYYY/MM/DD");
};

export default function EditHeadModal({
  isOpen,
  onClose,
  orgUnitId,
  currentHeads,
  allUsers,
  onCreateHead,
  onUpdateHead,
  onDeleteHead,
  onSaveSuccess,
  onSaveError,
}: EditHeadModalProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingAdditions, setPendingAdditions] = useState<PendingHead[]>([]);
  const [pendingDeletionIds, setPendingDeletionIds] = useState<Set<string>>(
    new Set(),
  );
  const [pendingEdits, setPendingEdits] = useState<
    Map<
      string,
      {
        startDate: number | undefined;
        endDate: number | undefined;
        noEndDate: boolean;
      }
    >
  >(new Map());
  const [editingHeadId, setEditingHeadId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sortedHeads = useMemo(() => {
    return [...currentHeads].sort((a, b) => {
      const aTime = toMillis(a.startDate) ?? 0;
      const bTime = toMillis(b.startDate) ?? 0;
      return aTime - bTime;
    });
  }, [currentHeads]);

  const editingHead = useMemo(
    () => currentHeads.find((head) => head.id === editingHeadId),
    [currentHeads, editingHeadId],
  );

  // Users available for selection (not already a head and not pending addition)
  const availableUsers = useMemo(() => {
    const headUserIds = new Set(currentHeads.map((h) => String(h.user.id)));
    const pendingUserIds = new Set(pendingAdditions.map((p) => p.userId));
    const deletedHeadUserIds = new Set(
      currentHeads
        .filter((h) => pendingDeletionIds.has(h.id))
        .map((h) => String(h.user.id)),
    );
    return allUsers.filter((u) => {
      const uid = String(u.id);
      if (pendingUserIds.has(uid)) return false;
      if (headUserIds.has(uid) && !deletedHeadUserIds.has(uid)) return false;
      return true;
    });
  }, [allUsers, currentHeads, pendingAdditions, pendingDeletionIds]);

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return availableUsers;
    return availableUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query),
    );
  }, [availableUsers, searchQuery]);

  // Get date error for a pending addition, checking overlap with existing heads and other pending items
  const getPendingDateError = useCallback(
    (pending: PendingHead, index: number) => {
      if (!pending.startDate) return "";

      if (!pending.noEndDate && !pending.endDate) {
        return t("organization.head_end_required");
      }

      if (
        !pending.noEndDate &&
        pending.endDate &&
        pending.endDate < pending.startDate
      ) {
        return t("organization.head_date_invalid");
      }

      const newStart = pending.startDate;
      const newEnd = pending.noEndDate
        ? Number.POSITIVE_INFINITY
        : (pending.endDate ?? Number.POSITIVE_INFINITY);

      // Check overlap with existing heads (excluding pending deletions)
      const hasHeadOverlap = currentHeads.some((head) => {
        if (pendingDeletionIds.has(head.id)) return false;
        const editForHead = pendingEdits.get(head.id);
        const headStart = editForHead?.startDate ?? toMillis(head.startDate);
        if (!headStart) return false;
        const headEnd = editForHead
          ? editForHead.noEndDate
            ? Number.POSITIVE_INFINITY
            : (editForHead.endDate ?? Number.POSITIVE_INFINITY)
          : head.endDate && !isNoEndDateValue(head.endDate)
            ? toMillis(head.endDate)
            : Number.POSITIVE_INFINITY;
        if (!headEnd) return false;
        return newStart <= headEnd && headStart <= newEnd;
      });

      if (hasHeadOverlap) return t("organization.head_date_overlap");

      // Check overlap with other pending additions
      const hasPendingOverlap = pendingAdditions.some((other, i) => {
        if (i === index) return false;
        if (!other.startDate) return false;
        const pStart = other.startDate;
        const pEnd = other.noEndDate
          ? Number.POSITIVE_INFINITY
          : (other.endDate ?? Number.POSITIVE_INFINITY);
        return newStart <= pEnd && pStart <= newEnd;
      });

      if (hasPendingOverlap) return t("organization.head_date_overlap");

      return "";
    },
    [currentHeads, pendingDeletionIds, pendingEdits, pendingAdditions, t],
  );

  /** Resolve the effective start/end for a head (using pendingEdit if present, otherwise original). */
  const resolveHeadRange = useCallback(
    (head: OrgHead) => {
      const edit = pendingEdits.get(head.id);
      if (edit) {
        return {
          start: edit.startDate,
          end: edit.noEndDate
            ? Number.POSITIVE_INFINITY
            : (edit.endDate ?? Number.POSITIVE_INFINITY),
        };
      }
      const start = toMillis(head.startDate);
      const end =
        head.endDate && !isNoEndDateValue(head.endDate)
          ? (toMillis(head.endDate) ?? Number.POSITIVE_INFINITY)
          : Number.POSITIVE_INFINITY;
      return { start, end };
    },
    [pendingEdits],
  );

  /**
   * Row-level error for ANY existing head (edited or not).
   * Checks:
   *  1. If edited: basic validation (missing end date, end < start)
   *  2. Overlap with other existing heads (using their effective dates)
   *  3. Overlap with pending additions
   */
  const getHeadRowError = useCallback(
    (headId: string) => {
      const head = currentHeads.find((h) => h.id === headId);
      if (!head) return "";
      if (pendingDeletionIds.has(headId)) return "";

      const edit = pendingEdits.get(headId);

      // Edited head: validate its own dates first
      if (edit) {
        if (!edit.startDate) return "";
        if (!edit.noEndDate && !edit.endDate) {
          return t("organization.head_end_required");
        }
        if (!edit.noEndDate && edit.endDate && edit.endDate < edit.startDate) {
          return t("organization.head_date_invalid");
        }
      }

      const { start: myStart, end: myEnd } = resolveHeadRange(head);
      if (!myStart) return "";

      // Overlap with other existing heads
      const hasHeadOverlap = currentHeads.some((other) => {
        if (other.id === headId) return false;
        if (pendingDeletionIds.has(other.id)) return false;
        const { start: oStart, end: oEnd } = resolveHeadRange(other);
        if (!oStart) return false;
        return myStart <= oEnd && oStart <= myEnd;
      });

      if (hasHeadOverlap) return t("organization.head_date_overlap");

      // Overlap with pending additions
      const hasPendingOverlap = pendingAdditions.some((pending) => {
        if (!pending.startDate) return false;
        const pStart = pending.startDate;
        const pEnd = pending.noEndDate
          ? Number.POSITIVE_INFINITY
          : (pending.endDate ?? Number.POSITIVE_INFINITY);
        return myStart <= pEnd && pStart <= myEnd;
      });

      if (hasPendingOverlap) return t("organization.head_date_overlap");

      return "";
    },
    [
      currentHeads,
      pendingAdditions,
      pendingDeletionIds,
      pendingEdits,
      resolveHeadRange,
      t,
    ],
  );

  const resetState = () => {
    setSearchQuery("");
    setPendingAdditions([]);
    setPendingDeletionIds(new Set());
    setPendingEdits(new Map());
    setEditingHeadId(null);
  };

  useEffect(() => {
    if (!isOpen) return;
    resetState();
  }, [isOpen, orgUnitId]);

  const handleAddUser = (user: User) => {
    setPendingAdditions((prev) => [
      ...prev,
      {
        userId: String(user.id),
        userName: user.name,
        userEmail: user.email,
        startDate: undefined,
        endDate: undefined,
        noEndDate: true,
      },
    ]);
  };

  const removePendingAddition = (userId: string) => {
    setPendingAdditions((prev) => prev.filter((p) => p.userId !== userId));
  };

  const updatePendingAddition = (
    userId: string,
    update: Partial<Pick<PendingHead, "startDate" | "endDate" | "noEndDate">>,
  ) => {
    setPendingAdditions((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, ...update } : p)),
    );
  };

  const handleEditHead = (head: OrgHead) => {
    setEditingHeadId(head.id);
    // Initialize pendingEdits entry if not already present
    if (!pendingEdits.has(head.id)) {
      const start = toMillis(head.startDate);
      const end =
        head.endDate && !isNoEndDateValue(head.endDate)
          ? toMillis(head.endDate)
          : undefined;
      setPendingEdits((prev) => {
        const next = new Map(prev);
        next.set(head.id, {
          startDate: start,
          endDate: end,
          noEndDate: !head.endDate || isNoEndDateValue(head.endDate),
        });
        return next;
      });
    }
  };

  const updatePendingEdit = (
    headId: string,
    update: Partial<{
      startDate: number | undefined;
      endDate: number | undefined;
      noEndDate: boolean;
    }>,
  ) => {
    setPendingEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(headId);
      if (current) next.set(headId, { ...current, ...update });
      return next;
    });
  };

  const handleMarkForDeletion = (headId: string) => {
    setPendingDeletionIds((prev) => {
      const next = new Set(prev);
      next.add(headId);
      return next;
    });
    if (editingHeadId === headId) {
      setEditingHeadId(null);
    }
  };

  const handleUnmarkDeletion = (headId: string) => {
    setPendingDeletionIds((prev) => {
      const next = new Set(prev);
      next.delete(headId);
      return next;
    });
  };

  const hasAdditionErrors = pendingAdditions.some(
    (p, i) => !p.startDate || Boolean(getPendingDateError(p, i)),
  );

  const hasEditErrors = Array.from(pendingEdits.entries()).some(
    ([headId, edit]) => !edit.startDate || Boolean(getHeadRowError(headId)),
  );

  const hasPendingErrors = hasAdditionErrors || hasEditErrors;

  const handleSave = async () => {
    if (hasPendingErrors) return;

    setIsSaving(true);
    try {
      const promises: Promise<void>[] = [];

      for (const headId of pendingDeletionIds) {
        promises.push(onDeleteHead({ headId }));
      }

      for (const [headId, edit] of pendingEdits) {
        if (!edit.startDate) continue;
        promises.push(
          onUpdateHead({
            headId,
            startDate: new Date(edit.startDate).toISOString(),
            endDate:
              edit.noEndDate || !edit.endDate
                ? NO_END_DATE_ISO
                : new Date(edit.endDate).toISOString(),
          }),
        );
      }

      for (const pending of pendingAdditions) {
        if (!pending.startDate) continue;
        promises.push(
          onCreateHead({
            userId: pending.userId,
            startDate: new Date(pending.startDate).toISOString(),
            endDate:
              pending.noEndDate || !pending.endDate
                ? NO_END_DATE_ISO
                : new Date(pending.endDate).toISOString(),
          }),
        );
      }

      await Promise.all(promises);
      resetState();
      onClose();
      onSaveSuccess?.();
    } catch {
      onSaveError?.();
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const hasPendingChanges =
    pendingAdditions.length > 0 ||
    pendingDeletionIds.size > 0 ||
    pendingEdits.size > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] min-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("organization.edit_heads")}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Current Heads */}
          <div>
            <Label>{t("organization.current_heads")}</Label>
            {sortedHeads.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">
                {t("organization.no_active_head")}
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {sortedHeads.map((head) => {
                  const isMarkedForDeletion = pendingDeletionIds.has(head.id);
                  const pendingEdit = pendingEdits.get(head.id);
                  const isEdited = !!pendingEdit;
                  const rowDateError = getHeadRowError(head.id);

                  // Show pending edit dates if available, otherwise original
                  const displayStart = pendingEdit?.startDate
                    ? dayjs(pendingEdit.startDate).format("YYYY/MM/DD")
                    : toDateLabel(head.startDate);
                  const displayEnd = pendingEdit
                    ? pendingEdit.noEndDate
                      ? t("organization.no_end_date")
                      : pendingEdit.endDate
                        ? dayjs(pendingEdit.endDate).format("YYYY/MM/DD")
                        : "-"
                    : head.endDate && !isNoEndDateValue(head.endDate)
                      ? toDateLabel(head.endDate)
                      : t("organization.no_end_date");

                  return (
                    <div
                      key={head.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-md border",
                        isMarkedForDeletion
                          ? "border-red-200 bg-red-50 opacity-60"
                          : rowDateError
                            ? "border-red-300 bg-red-50/50"
                            : isEdited
                              ? "border-blue-200 bg-blue-50/50"
                              : "border-gray-200",
                      )}
                    >
                      <Avatar name={head.user.name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-sm font-medium truncate",
                              isMarkedForDeletion
                                ? "text-gray-400 line-through"
                                : "text-gray-900",
                            )}
                          >
                            {head.user.name}
                          </span>
                          {head.isActive && !isMarkedForDeletion && (
                            <Badge
                              variant="secondary"
                              className="bg-green-50 text-green-700 border-green-200 text-xs"
                            >
                              {t("organization.active")}
                            </Badge>
                          )}
                          {isMarkedForDeletion && (
                            <Badge
                              variant="secondary"
                              className="bg-red-50 text-red-700 border-red-200 text-xs"
                            >
                              {t("organization.pending_delete")}
                            </Badge>
                          )}
                          {isEdited && !isMarkedForDeletion && (
                            <Badge
                              variant="secondary"
                              className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                            >
                              {t("organization.modified")}
                            </Badge>
                          )}
                        </div>
                        <div
                          className={cn(
                            "text-xs truncate",
                            isMarkedForDeletion
                              ? "text-gray-400"
                              : "text-gray-600",
                          )}
                        >
                          {head.user.email}
                        </div>
                        <div
                          className={cn(
                            "text-xs",
                            isMarkedForDeletion
                              ? "text-gray-400"
                              : "text-gray-500",
                          )}
                        >
                          {displayStart} → {displayEnd}
                        </div>
                        {rowDateError && (
                          <p className="text-xs text-red-600 mt-0.5">
                            {rowDateError}
                          </p>
                        )}
                      </div>
                      {isMarkedForDeletion ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleUnmarkDeletion(head.id)}
                        >
                          {t("buttons.undo")}
                        </Button>
                      ) : isEdited ? (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditHead(head)}
                          >
                            {t("buttons.edit")}
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setPendingEdits((prev) => {
                                const next = new Map(prev);
                                next.delete(head.id);
                                return next;
                              });
                            }}
                          >
                            {t("buttons.undo")}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleEditHead(head)}
                          >
                            {t("buttons.edit")}
                          </Button>
                          <button
                            onClick={() => handleMarkForDeletion(head.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title={t("organization.delete_head")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Edit existing head inline */}
          {editingHead &&
            pendingEdits.has(editingHead.id) &&
            (() => {
              const edit = pendingEdits.get(editingHead.id)!;
              const dateError = getHeadRowError(editingHead.id);
              return (
                <div className="space-y-3 rounded-md border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <Label>{t("organization.edit_head")}</Label>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditingHeadId(null)}
                    >
                      {t("buttons.close")}
                    </Button>
                  </div>
                  <div className="flex items-center gap-3">
                    <Avatar name={editingHead.user.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {editingHead.user.name}
                      </div>
                      <div className="text-xs text-gray-600 truncate">
                        {editingHead.user.email}
                      </div>
                    </div>
                  </div>
                  <Label>{t("organization.head_start_date")}</Label>
                  <DatePicker
                    name="edit-head-start-date"
                    value={edit.startDate}
                    onChange={(val) =>
                      updatePendingEdit(editingHead.id, { startDate: val })
                    }
                    placeholder="YYYY-MM-DD"
                  />
                  <div className="flex items-center justify-between">
                    <Label>{t("organization.head_end_date")}</Label>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Checkbox
                        checked={edit.noEndDate}
                        onCheckedChange={(checked) => {
                          updatePendingEdit(editingHead.id, {
                            noEndDate: checked,
                            ...(checked ? { endDate: undefined } : {}),
                          });
                        }}
                      />
                      <span>{t("organization.no_end_date")}</span>
                    </div>
                  </div>
                  <DatePicker
                    name="edit-head-end-date"
                    value={edit.endDate}
                    onChange={(val) =>
                      updatePendingEdit(editingHead.id, { endDate: val })
                    }
                    placeholder="YYYY-MM-DD"
                    disabled={edit.noEndDate}
                  />
                  <ValidationError>{dateError}</ValidationError>
                </div>
              );
            })()}

          {/* Pending Additions with editable dates */}
          {pendingAdditions.length > 0 && (
            <div>
              <Label>
                {t("organization.pending_additions")} ({pendingAdditions.length}
                )
              </Label>
              <div className="mt-2 space-y-3">
                {pendingAdditions.map((pending, index) => {
                  const dateError = getPendingDateError(pending, index);
                  return (
                    <div
                      key={`pending-${pending.userId}`}
                      className="rounded-md border border-green-200 bg-green-50/50 p-4 space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={pending.userName} size="sm" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {pending.userName}
                          </div>
                          <div className="text-xs text-gray-600 truncate">
                            {pending.userEmail}
                          </div>
                        </div>
                        <button
                          onClick={() => removePendingAddition(pending.userId)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title={t("organization.remove_user")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <Label>{t("organization.head_start_date")}</Label>
                      <DatePicker
                        name={`pending-start-${pending.userId}`}
                        value={pending.startDate}
                        onChange={(val) =>
                          updatePendingAddition(pending.userId, {
                            startDate: val,
                          })
                        }
                        placeholder="YYYY-MM-DD"
                      />
                      <div className="flex items-center justify-between">
                        <Label>{t("organization.head_end_date")}</Label>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Checkbox
                            checked={pending.noEndDate}
                            onCheckedChange={(checked) => {
                              updatePendingAddition(pending.userId, {
                                noEndDate: checked,
                                ...(checked ? { endDate: undefined } : {}),
                              });
                            }}
                          />
                          <span>{t("organization.no_end_date")}</span>
                        </div>
                      </div>
                      <DatePicker
                        name={`pending-end-${pending.userId}`}
                        value={pending.endDate}
                        onChange={(val) =>
                          updatePendingAddition(pending.userId, {
                            endDate: val,
                          })
                        }
                        placeholder="YYYY-MM-DD"
                        disabled={pending.noEndDate}
                      />
                      <ValidationError>{dateError}</ValidationError>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add Head - User List */}
          <div className="space-y-4">
            <Label>{t("organization.add_head")}</Label>
            <div className="mt-2">
              <Input
                placeholder={t("organization.search_user_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
                hasClearIcon
              />
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  {t("organization.no_users_found")}
                </p>
              ) : (
                filteredUsers.map((user) => (
                  <button
                    key={`head-user-${user.id}`}
                    type="button"
                    onClick={() => handleAddUser(user)}
                    className="w-full flex items-center gap-3 p-2 rounded-md border border-gray-200 text-left transition-colors hover:bg-gray-50"
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
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t">
          <Button variant="secondary" onClick={handleClose}>
            {t("buttons.close")}
          </Button>
          {hasPendingChanges && (
            <Button
              onClick={handleSave}
              loading={isSaving}
              disabled={hasPendingErrors}
            >
              {t("buttons.save")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
