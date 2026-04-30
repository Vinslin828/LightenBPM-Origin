import { useState, useEffect, useRef } from "react";
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
import { Save, MoreHorizontal } from "lucide-react";

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

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
            <div className="flex items-center gap-2">
              {/* More menu */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                    >
                      {t("role.delete")}
                    </button>
                  </div>
                )}
              </div>
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                loading={updateRoleMutation.isPending}
                icon={<Save className="h-4 w-4" />}
              >
                {t("role.save")}
              </Button>
            </div>
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
