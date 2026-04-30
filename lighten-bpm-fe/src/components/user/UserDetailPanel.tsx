import { useState, useEffect, useRef, useMemo } from "react";
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
import UserOrganizationsSection from "./UserOrganizationsSection";
import { useUserById, useUpdateUser, useDeleteUser } from "@/hooks/useUser";
import { useToast } from "@/components/ui/toast";
import { Save, MoreHorizontal } from "lucide-react";

interface UserDetailPanelProps {
  userId: string;
  onDelete?: () => void;
}

export default function UserDetailPanel({
  userId,
  onDelete,
}: UserDetailPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user, isLoading, error } = useUserById(userId);
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [jobGrade, setJobGrade] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      setCode(user.code || "");
      setName(user.name);
      setJobGrade(user.jobGrade?.toString() ?? "");
    }
  }, [user?.id]);

  const hasChanges = useMemo(() => {
    if (!user) return false;
    return (
      name !== user.name ||
      jobGrade !== (user.jobGrade?.toString() ?? "")
    );
  }, [name, jobGrade, user]);

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
    if (!user || !hasChanges) return;

    try {
      await updateUserMutation.mutateAsync({
        userId: user.id,
        data: {
          name,
          jobGrade: jobGrade ? Number(jobGrade) : undefined,
        },
      });
      toast({ title: t("user_management.saved") });
    } catch {
      toast({
        variant: "destructive",
        title: t("user_management.save_error"),
      });
    }
  };

  const handleDelete = async () => {
    if (!user) return;

    try {
      await deleteUserMutation.mutateAsync(user.id);
      toast({ title: t("user_management.delete_success") });
      setIsDeleteDialogOpen(false);
      onDelete?.();
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t("user_management.delete_error");
      toast({
        variant: "destructive",
        title: t("user_management.delete_error"),
        description: errorMessage,
      });
      setIsDeleteDialogOpen(false);
    }
  };

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-red-600 text-sm">
          {t("user_management.load_error")}
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

  if (!user) {
    return (
      <Card className="p-6">
        <div className="text-gray-500 text-sm text-center">
          {t("user_management.select_to_view")}
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
              {t("user_management.details")}
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
                      {t("user_management.delete")}
                    </button>
                  </div>
                )}
              </div>
              <Button
                onClick={handleSave}
                disabled={!hasChanges}
                loading={updateUserMutation.isPending}
                icon={<Save className="h-4 w-4" />}
              >
                {t("user_management.save")}
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {/* User Code (read-only for now) */}
            <div>
              <Label htmlFor="user-code">
                {t("user_management.user_code")}
              </Label>
              <Input
                id="user-code"
                value={code}
                disabled
                placeholder={t("user_management.user_code_placeholder")}
              />
            </div>

            {/* User Name */}
            <div>
              <Label htmlFor="user-name" aria-required>
                {t("user_management.user_name")}
              </Label>
              <Input
                id="user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("user_management.user_name_placeholder")}
              />
            </div>

            {/* Job Grade */}
            <div>
              <Label htmlFor="user-grade">
                {t("user_management.job_grade")}
              </Label>
              <Input
                id="user-grade"
                type="number"
                value={jobGrade}
                onChange={(e) => setJobGrade(e.target.value)}
                placeholder={t("user_management.job_grade_placeholder")}
              />
            </div>
          </div>
        </Card>

        {/* Organizations Section */}
        <UserOrganizationsSection
          key={user.id}
          userId={user.id}
          defaultOrgCode={user.defaultOrgCode}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("user_management.confirm_delete_title")}
            </DialogTitle>
            <DialogDescription className="whitespace-pre-line">
              {t("user_management.confirm_delete_message")}
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
              loading={deleteUserMutation.isPending}
            >
              {t("buttons.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
