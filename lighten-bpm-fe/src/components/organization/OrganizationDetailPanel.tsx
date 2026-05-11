import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import OrgHeadSection from "./OrgHeadSection";
import OrgUsersSection from "./OrgUsersSection";
import {
  useOrgUnits,
  useOrgUnitWithHeads,
  useUpdateOrgUnit,
  useDeleteOrgUnit,
} from "@/hooks/useOrganization";
import {
  DropdownSelect,
  DropdownSelectOption,
} from "@/components/ui/dropdown-select";
import { useToast } from "@/components/ui/toast";
import { Save, Trash2 } from "lucide-react";

interface OrganizationDetailPanelProps {
  orgUnitId: string;
  onDelete?: () => void;
}

/**
 * Right panel showing detailed information about a selected organization
 * Includes editable name/code, heads section, and users section
 */
export default function OrganizationDetailPanel({
  orgUnitId,
  onDelete,
}: OrganizationDetailPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { orgUnit, isLoading, error } = useOrgUnitWithHeads(orgUnitId);
  const { units: allOrgUnits } = useOrgUnits();
  const updateOrgUnitMutation = useUpdateOrgUnit();
  const deleteOrgUnitMutation = useDeleteOrgUnit();

  const NO_PARENT_VALUE = "__none__";

  // Local state for form inputs
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [parentCode, setParentCode] = useState<string>(NO_PARENT_VALUE);
  const [hasChanges, setHasChanges] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Collect all descendant IDs to prevent circular parent assignment
  const getDescendantIds = (unitId: string): Set<string> => {
    const ids = new Set<string>();
    const collect = (id: string) => {
      const children = allOrgUnits.filter((u) => u.parent?.id === id);
      for (const child of children) {
        ids.add(child.id);
        collect(child.id);
      }
    };
    collect(unitId);
    return ids;
  };

  // Build dropdown options: exclude self and descendants, use code as value
  const parentOptions: DropdownSelectOption[] = (() => {
    if (!orgUnit) return [];
    const descendantIds = getDescendantIds(orgUnit.id);
    const options: DropdownSelectOption[] = [
      { label: t("organization.no_parent"), value: NO_PARENT_VALUE },
    ];
    for (const unit of allOrgUnits) {
      if (unit.id === orgUnit.id) continue;
      if (descendantIds.has(unit.id)) continue;
      options.push({ label: `${unit.name} (${unit.code})`, value: unit.code });
    }
    return options;
  })();

  // Update form when org unit data loads (only when ID changes)
  useEffect(() => {
    if (orgUnit) {
      setName(orgUnit.defaultName ?? orgUnit.name);
      setCode(orgUnit.code);
      setParentCode(orgUnit.parent?.code ?? NO_PARENT_VALUE);
      setHasChanges(false);
    }
  }, [orgUnit?.id]); // Only reset when the org unit ID changes, not the object reference

  // Track changes
  const currentParentCode = orgUnit?.parent?.code ?? NO_PARENT_VALUE;
  useEffect(() => {
    if (orgUnit) {
      const changed =
        name !== (orgUnit.defaultName ?? orgUnit.name) ||
        code !== orgUnit.code ||
        parentCode !== currentParentCode;
      setHasChanges(changed);
    }
  }, [
    name,
    code,
    parentCode,
    orgUnit?.name,
    orgUnit?.defaultName,
    orgUnit?.code,
    currentParentCode,
  ]);

  const handleSave = async () => {
    if (!orgUnit || !hasChanges) return;

    try {
      await updateOrgUnitMutation.mutateAsync({
        orgUnitId: orgUnit.id,
        data: {
          name,
          code,
          parentCode: parentCode === NO_PARENT_VALUE ? null : parentCode,
        },
      });
      toast({
        title: t("organization.saved"),
      });
      setHasChanges(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("organization.save_error"),
      });
      console.error("Failed to update org unit:", error);
    }
  };

  const handleDelete = async () => {
    if (!orgUnit) return;

    try {
      await deleteOrgUnitMutation.mutateAsync(orgUnit.id);
      toast({
        title: t("organization.delete_success"),
      });
      setIsDeleteDialogOpen(false);
      // Clear selection after successful delete
      onDelete?.();
    } catch (error: any) {
      // Extract error message from API response
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t("organization.delete_error");

      toast({
        variant: "destructive",
        title: t("organization.delete_error"),
        description: errorMessage,
      });
      console.error("Failed to delete org unit:", error);
      setIsDeleteDialogOpen(false);
    }
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-600 text-sm">
          {t("organization.load_error")}
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse" />
          <div className="h-10 bg-gray-200 rounded w-24 animate-pulse" />
        </div>
        <div className="space-y-4">
          <div>
            <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
          </div>
          <div>
            <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse" />
            <div className="h-12 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </Card>
    );
  }

  if (!orgUnit) {
    return (
      <Card className="p-6">
        <div className="text-gray-500 text-sm text-center">
          {t("organization.select_to_view")}
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Header with Save Button */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("organization.details")}
            </h2>
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              loading={updateOrgUnitMutation.isPending}
              icon={<Save className="h-4 w-4" />}
            >
              {t("organization.save")}
            </Button>
          </div>

          {/* Organization Details Form */}
          <div className="space-y-4">
            {/* Organization ID (read-only) */}
            <div>
              <Label htmlFor="org-id">{t("organization.org_id")}</Label>
              <Input
                id="org-id"
                value={orgUnit.id}
                disabled
                className="bg-gray-100"
              />
            </div>

            {/* Organization Name (editable) */}
            <div>
              <Label htmlFor="org-name" aria-required>
                {t("organization.org_name")}
              </Label>
              <Input
                id="org-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("organization.org_name_placeholder")}
              />
            </div>

            {/* Organization Code (editable) */}
            <div>
              <Label htmlFor="org-code" aria-required>
                {t("organization.org_code")}
              </Label>
              <Input
                id="org-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t("organization.org_code_placeholder")}
              />
            </div>

            {/* Parent Organization (editable) */}
            <div>
              <Label htmlFor="org-parent">{t("organization.parent_org")}</Label>
              <DropdownSelect
                id="org-parent"
                options={parentOptions}
                value={parentCode}
                onChange={(val: string) => setParentCode(val)}
                placeholder={t("organization.no_parent")}
              />
            </div>
          </div>
        </Card>

        {/* Heads Section */}
        <OrgHeadSection
          orgUnitId={orgUnit.id}
          head={orgUnit.activeHead}
          heads={orgUnit.heads || []}
          isLoading={isLoading}
        />

        {/* Users Section */}
        <OrgUsersSection
          key={orgUnit.id}
          users={(() => {
            // console.log("[OrganizationDetailPanel] Rendering users:", {
            //   orgUnitId: orgUnit.id,
            //   orgUnitName: orgUnit.name,
            //   membersCount: orgUnit.members?.length || 0,
            //   members: orgUnit.members?.map((m) => ({ id: m.id, name: m.name })) || [],
            // });
            return orgUnit.members || [];
          })()}
          orgUnitId={orgUnit.id}
          isLoading={isLoading}
        />

        {/* Delete Organization Section */}
        <Card className="p-6 border-red-200">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {t("organization.danger_zone")}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                {t("organization.delete_warning")}
              </p>
            </div>
            <Button
              variant="destructive"
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              {t("organization.delete_org")}
            </Button>
          </div>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("organization.confirm_delete_title")}</DialogTitle>
            <DialogDescription>
              {t("organization.confirm_delete_message", { name: orgUnit.name })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              {t("buttons.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              loading={deleteOrgUnitMutation.isPending}
            >
              {t("buttons.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
