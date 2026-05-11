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
import RoleUsersSection from "./RoleUsersSection";
import {
  useRoleWithMembers,
  useUpdateRole,
  useDeleteRole,
} from "@/hooks/useRole";
import { useToast } from "@/components/ui/toast";
import { Save, Trash2 } from "lucide-react";

interface RoleDetailPanelProps {
  roleId: string;
  onDelete?: () => void;
}

export default function RoleDetailPanel({
  roleId,
  onDelete,
}: RoleDetailPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { role, members, isLoading, error } = useRoleWithMembers(roleId);
  const updateRoleMutation = useUpdateRole();
  const deleteRoleMutation = useDeleteRole();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setCode(role.code);
      setHasChanges(false);
    }
  }, [role?.id]);

  useEffect(() => {
    if (role) {
      setHasChanges(name !== role.name || code !== role.code);
    }
  }, [name, code, role?.name, role?.code]);

  const canDelete = members.length === 0;

  const handleSave = async () => {
    if (!role || !hasChanges) return;

    try {
      await updateRoleMutation.mutateAsync({
        roleId: role.id,
        data: { name, code },
      });
      toast({ title: t("role.saved") });
      setHasChanges(false);
    } catch {
      toast({ variant: "destructive", title: t("role.save_error") });
    }
  };

  const handleDelete = async () => {
    if (!role) return;

    try {
      await deleteRoleMutation.mutateAsync(role.id);
      toast({ title: t("role.delete_success") });
      setIsDeleteDialogOpen(false);
      onDelete?.();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t("role.delete_error");
      toast({
        variant: "destructive",
        title: t("role.delete_error"),
        description: errorMessage,
      });
      setIsDeleteDialogOpen(false);
    }
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-600 text-sm">{t("role.load_error")}</div>
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

  if (!role) {
    return (
      <Card className="p-6">
        <div className="text-gray-500 text-sm text-center">
          {t("role.select_to_view")}
        </div>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Card className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {t("role.details")}
            </h2>
            <Button
              onClick={handleSave}
              disabled={!hasChanges}
              loading={updateRoleMutation.isPending}
              icon={<Save className="h-4 w-4" />}
            >
              {t("role.save")}
            </Button>
          </div>

          <div className="space-y-4">
            {/* Role ID (read-only text, not input) */}
            <div>
              <Label>{t("role.role_id")}</Label>
              <div className="text-sm font-semibold text-gray-900 mt-1">
                {role.id}
              </div>
            </div>

            {/* Role Code */}
            <div>
              <Label htmlFor="role-code" aria-required>
                {t("role.role_code")}
              </Label>
              <Input
                id="role-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            {/* Name */}
            <div>
              <Label htmlFor="role-name" aria-required>
                {t("role.role_name")}
              </Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Users Section */}
        <RoleUsersSection
          key={role.id}
          users={members}
          roleId={role.id}
          isLoading={isLoading}
        />

        {/* Danger Zone */}
        <Card className="p-6 border-red-200">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {t("role.danger_zone")}
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                {t("role.delete_warning")}
              </p>
              {!canDelete && (
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  ⚠ {t("role.delete_disabled_hint")}
                </p>
              )}
            </div>
            <Button
              variant="destructive"
              icon={<Trash2 className="h-4 w-4" />}
              disabled={!canDelete}
              onClick={() => setIsDeleteDialogOpen(true)}
              title={!canDelete ? t("role.delete_disabled_hint") : undefined}
            >
              {t("role.delete")}
            </Button>
          </div>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("role.confirm_delete_title")}</DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {t("role.confirm_delete_message")}
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
              loading={deleteRoleMutation.isPending}
            >
              {t("buttons.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
