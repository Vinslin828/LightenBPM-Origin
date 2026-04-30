import { useState, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { X, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/utils/cn";
import { useOrgUnits } from "@/hooks/useOrganization";
import {
  useCreateMembership,
  useDeleteMembership,
  useUpdateMembership,
  useUpdateUserDefaultOrg,
} from "@/hooks/useUser";
import { useToast } from "@/components/ui/toast";
import { Unit } from "@/types/domain";
import { OrgMembership } from "@/types/user-management";
import { formatDateShort } from "@/utils/format-date";

interface DurationOverride {
  startDate: string;
  endDate?: string;
  isIndefinite: boolean;
}

interface UserOrgAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  existingMemberships: OrgMembership[];
  defaultOrgCode?: string;
}

interface TreeNode extends Unit {
  children?: TreeNode[];
}

function buildTree(units: Unit[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  const roots: TreeNode[] = [];

  units.forEach((u) => {
    map.set(u.id, { ...u, children: [] });
  });

  units.forEach((u) => {
    const node = map.get(u.id)!;
    if (u.parent) {
      const parent = map.get(u.parent.id);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
        return;
      }
    }
    roots.push(node);
  });

  return roots;
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
  if (!query) return nodes;
  const q = query.toLowerCase();

  function matches(node: TreeNode): boolean {
    if (
      node.name.toLowerCase().includes(q) ||
      node.code.toLowerCase().includes(q)
    )
      return true;
    return (node.children || []).some(matches);
  }

  return nodes.filter(matches).map((n) => ({
    ...n,
    children: n.children ? filterTree(n.children, query) : [],
  }));
}

// ─── Duration Popover (floating card) ───────────────────────────────

function DurationPopover({
  startDate: initialStart,
  endDate: initialEnd,
  isIndefinite: initialIndefinite,
  onSave,
  onCancel,
  onClear,
}: {
  startDate: string;
  endDate?: string;
  isIndefinite: boolean;
  onSave: (d: DurationOverride) => void;
  onCancel: () => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const [startDate, setStartDate] = useState(
    initialStart ? initialStart.slice(0, 10) : "",
  );
  const [endDate, setEndDate] = useState(
    initialEnd ? initialEnd.slice(0, 10) : "",
  );
  const [isIndefinite, setIsIndefinite] = useState(initialIndefinite);

  const hasDateError =
    !isIndefinite && startDate !== "" && endDate !== "" && startDate > endDate;
  const isMissingEndDate = !isIndefinite && endDate === "";
  const canSave = !hasDateError && !isMissingEndDate;

  return (
    <div className="bg-white border border-stroke rounded-lg shadow-lg p-4 w-[260px]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">
          {t("user_management.set_org_duration")}
        </h4>
        <button
          onClick={onClear}
          className="text-xs text-red-400 hover:text-red-500"
        >
          {t("user_management.clear")}
        </button>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-xs text-gray-600 mb-1">
            {t("user_management.start_date")}
          </div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600">
              {t("user_management.end_date")}
            </span>
            <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
              <input
                type="checkbox"
                checked={isIndefinite}
                onChange={(e) => {
                  setIsIndefinite(e.target.checked);
                  if (e.target.checked) setEndDate("");
                }}
                className="rounded border-gray-300 h-3 w-3"
              />
              {t("user_management.no_end_date")}
            </label>
          </div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={isIndefinite}
            className={cn(
              "w-full px-2 py-1.5 text-sm border rounded focus:outline-none focus:ring-1 disabled:bg-gray-50 disabled:text-gray-400 disabled:border-gray-200",
              hasDateError
                ? "border-red-500 focus:ring-red-500"
                : "border-blue-400 focus:ring-blue-500",
            )}
          />
          {hasDateError && (
            <p className="text-xs text-red-500 mt-1">
              {t("user_management.date_range_error")}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-4">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onCancel}
          className="flex-1"
        >
          {t("buttons.cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!canSave}
          onClick={() =>
            onSave({
              startDate: startDate
                ? new Date(startDate).toISOString()
                : new Date().toISOString(),
              endDate:
                isIndefinite || !endDate
                  ? undefined
                  : new Date(endDate).toISOString(),
              isIndefinite,
            })
          }
          className="flex-1"
        >
          {t("buttons.save")}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Modal ─────────────────────────────────────────────────────

export default function UserOrgAssignmentModal({
  isOpen,
  onClose,
  userId,
  existingMemberships,
  defaultOrgCode,
}: UserOrgAssignmentModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { units } = useOrgUnits();
  const createMembership = useCreateMembership();
  const deleteMembership = useDeleteMembership();
  const updateMembership = useUpdateMembership();
  const updateDefaultOrg = useUpdateUserDefaultOrg();

  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  // Expand all org codes by default
  const [expandedCodes, setExpandedCodes] = useState<Set<string>>(() => {
    return new Set(units.filter((u) => u.type !== "ROLE").map((u) => u.code));
  });

  // Use orgUnitCode as key (not orgUnitId) because backend doesn't always return id
  const [checkedCodes, setCheckedCodes] = useState<Set<string>>(() => {
    return new Set(existingMemberships.map((m) => m.orgUnitCode));
  });
  const [durationOverrides, setDurationOverrides] = useState<
    Map<string, DurationOverride>
  >(() => {
    const map = new Map<string, DurationOverride>();
    existingMemberships.forEach((m) => {
      map.set(m.orgUnitCode, {
        startDate: m.startDate,
        endDate: m.endDate,
        isIndefinite: m.isIndefinite,
      });
    });
    return map;
  });
  const [defaultCode, setDefaultCode] = useState<string>(defaultOrgCode ?? "");
  const [durationPopoverCode, setDurationPopoverCode] = useState<string | null>(
    null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = useCallback(() => {
    setSearchQuery("");
    setShowOnlySelected(false);
    setExpandedCodes(
      new Set(units.filter((u) => u.type !== "ROLE").map((u) => u.code)),
    );
    setCheckedCodes(new Set(existingMemberships.map((m) => m.orgUnitCode)));
    const map = new Map<string, DurationOverride>();
    existingMemberships.forEach((m) => {
      map.set(m.orgUnitCode, {
        startDate: m.startDate,
        endDate: m.endDate,
        isIndefinite: m.isIndefinite,
      });
    });
    setDurationOverrides(map);
    setDefaultCode(defaultOrgCode ?? "");
    setDurationPopoverCode(null);
  }, [existingMemberships, defaultOrgCode, units]);

  const orgTree = useMemo(() => {
    const orgUnits = units.filter((u) => u.type !== "ROLE");
    return buildTree(orgUnits);
  }, [units]);

  const filteredTree = useMemo(() => {
    let tree = filterTree(orgTree, searchQuery);

    if (showOnlySelected) {
      function filterSelected(nodes: TreeNode[]): TreeNode[] {
        return nodes
          .filter(
            (n) =>
              checkedCodes.has(n.code) ||
              (n.children && filterSelected(n.children).length > 0),
          )
          .map((n) => ({
            ...n,
            children: n.children ? filterSelected(n.children) : [],
          }));
      }
      tree = filterSelected(tree);
    }

    return tree;
  }, [orgTree, searchQuery, showOnlySelected, checkedCodes]);

  const toggleExpand = (code: string) => {
    setExpandedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const toggleCheck = (code: string) => {
    setCheckedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
        setDurationOverrides((dm) => {
          const nm = new Map(dm);
          nm.delete(code);
          return nm;
        });
        if (defaultCode === code) setDefaultCode("");
        if (durationPopoverCode === code) setDurationPopoverCode(null);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const handleOk = async () => {
    setIsSubmitting(true);
    try {
      const existingCodes = new Set(
        existingMemberships.map((m) => m.orgUnitCode),
      );

      // Orgs to add (checked but not existing)
      const toAdd = [...checkedCodes].filter(
        (code) => !existingCodes.has(code),
      );

      // Orgs to remove (existing but unchecked)
      const toRemove = existingMemberships.filter(
        (m) => !checkedCodes.has(m.orgUnitCode),
      );

      // Existing memberships with changed duration
      const toUpdate = existingMemberships.filter((m) => {
        if (!checkedCodes.has(m.orgUnitCode)) return false;
        const override = durationOverrides.get(m.orgUnitCode);
        if (!override) return false;
        return (
          override.startDate !== m.startDate ||
          override.endDate !== m.endDate ||
          override.isIndefinite !== m.isIndefinite
        );
      });

      // Process removals, additions, and updates in parallel
      await Promise.all([
        ...toRemove.map((m) =>
          deleteMembership.mutateAsync({ membershipId: m.id, userId }),
        ),
        ...toAdd.map((code) => {
          const duration = durationOverrides.get(code);
          return createMembership.mutateAsync({
            orgUnitCode: code,
            userId,
            startDate: duration?.startDate ?? new Date().toISOString(),
            endDate: duration?.endDate,
            isIndefinite: duration?.isIndefinite ?? true,
          });
        }),
        ...toUpdate.map((m) => {
          const override = durationOverrides.get(m.orgUnitCode)!;
          return updateMembership.mutateAsync({
            membershipId: m.id,
            userId,
            data: {
              startDate: override.startDate,
              endDate: override.endDate,
              isIndefinite: override.isIndefinite,
            },
          });
        }),
      ]);

      // Update default org if changed (must run after memberships are created)
      if (defaultCode && defaultCode !== defaultOrgCode) {
        await updateDefaultOrg.mutateAsync({
          userId,
          orgUnitCode: defaultCode,
        });
      }

      toast({ title: t("user_management.membership_created") });
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? "";
      toast({
        variant: "destructive",
        title: t("user_management.membership_error"),
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetState();
      onClose();
    }
  };

  const renderNode = (node: TreeNode, depth: number = 0): React.ReactNode => {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isExpanded = expandedCodes.has(node.code);
    const isChecked = checkedCodes.has(node.code);
    const isDefault = defaultCode === node.code;
    const duration = durationOverrides.get(node.code);
    const membership = existingMemberships.find(
      (m) => m.orgUnitCode === node.code,
    );
    const isExpiredMembership = membership?.isExpired ?? false;

    const dateLabel = duration
      ? duration.isIndefinite
        ? `${formatDateShort(duration.startDate)}-${t("user_management.no_end_date_label")}`
        : `${formatDateShort(duration.startDate)}-${formatDateShort(duration.endDate)}`
      : "";

    return (
      <div key={node.code}>
        <div
          className="flex items-center gap-1 py-1.5 hover:bg-gray-50 rounded relative"
          style={{ paddingLeft: `${depth * 24 + 8}px` }}
        >
          {/* Expand/collapse */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(node.code)}
              className="p-0.5 text-gray-400"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <span className="w-[18px]" />
          )}

          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => toggleCheck(node.code)}
            className="rounded border-gray-300 mr-1"
          />

          {/* Name + duration link */}
          <div className="flex-1 min-w-0">
            <span className="text-sm text-gray-900">{node.name}</span>
            {isChecked && (
              <div>
                {dateLabel ? (
                  <button
                    onClick={() =>
                      setDurationPopoverCode(
                        durationPopoverCode === node.code ? null : node.code,
                      )
                    }
                    className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer"
                  >
                    {dateLabel}
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      setDurationPopoverCode(
                        durationPopoverCode === node.code ? null : node.code,
                      )
                    }
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    {t("user_management.set_org_duration")}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Default / Set as default */}
          {isChecked && !isExpiredMembership && (
            <>
              {isDefault ? (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded mr-1">
                  {t("user_management.default_label")}
                </span>
              ) : (
                <button
                  onClick={() => setDefaultCode(node.code)}
                  className="text-xs text-blue-600 hover:text-blue-700 mr-1"
                >
                  {t("user_management.set_as_default")}
                </button>
              )}
            </>
          )}
          {isChecked && isExpiredMembership && (
            <span className="text-xs text-gray-400 mr-1">
              {t("user_management.expired")}
            </span>
          )}
        </div>

        {/* Children */}
        {hasChildren &&
          isExpanded &&
          node.children!.map((child) => renderNode(child, depth + 1))}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal + floating duration popover container */}
      <div className="relative flex items-start gap-3">
        {/* Main modal */}
        <div className="relative bg-white rounded-lg shadow-xl w-[640px] max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-900 w-full text-center">
              {t("user_management.org_modal_title")}
            </h2>
          </div>

          {/* Search + Filters */}
          <div className="px-6">
            <Input
              placeholder={t("user_management.search_org_placeholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
              hasClearIcon
            />
            <div className="flex items-center gap-4 mt-3">
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOnlySelected}
                  onChange={(e) => setShowOnlySelected(e.target.checked)}
                  className="rounded border-gray-300"
                />
                {t("user_management.show_only_selected")}
              </label>
            </div>
          </div>

          {/* Tree */}
          <div className="flex-1 overflow-y-auto px-6 py-3 min-h-[300px] max-h-[50vh]">
            <div className="border border-stroke rounded p-2">
              {filteredTree.length === 0 ? (
                <div className="text-sm text-gray-400 py-8 text-center">
                  {t("user_management.no_user")}
                </div>
              ) : (
                filteredTree.map((node) => renderNode(node))
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-center gap-4 p-6 border-t">
            <Button
              variant="secondary"
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-[190px]"
            >
              {t("buttons.cancel")}
            </Button>
            <Button
              onClick={handleOk}
              loading={isSubmitting}
              className="w-[190px]"
            >
              {t("buttons.ok")}
            </Button>
          </div>
        </div>

        {/* Floating duration popover — positioned to the right of the modal */}
        {durationPopoverCode && (
          <div className="absolute right-0 top-[120px] translate-x-[calc(100%+12px)] z-[60]">
            <DurationPopover
              startDate={
                durationOverrides.get(durationPopoverCode)?.startDate ??
                new Date().toISOString()
              }
              endDate={durationOverrides.get(durationPopoverCode)?.endDate}
              isIndefinite={
                durationOverrides.get(durationPopoverCode)?.isIndefinite ?? true
              }
              onSave={(data) => {
                setDurationOverrides((dm) => {
                  const nm = new Map(dm);
                  nm.set(durationPopoverCode, data);
                  return nm;
                });
                setDurationPopoverCode(null);
              }}
              onCancel={() => setDurationPopoverCode(null)}
              onClear={() => {
                setDurationOverrides((dm) => {
                  const nm = new Map(dm);
                  nm.delete(durationPopoverCode);
                  return nm;
                });
                setDurationPopoverCode(null);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
