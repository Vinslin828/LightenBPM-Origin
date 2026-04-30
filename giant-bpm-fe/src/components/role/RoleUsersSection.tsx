import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Collapse from "@/components/ui/collapse";
import { User } from "@/types/domain";
import { Users, Edit, Trash2 } from "lucide-react";
import { useUsers } from "@/hooks/useOrganization";
import {
  useRemoveUserFromRole,
  useAddUsersToRole,
  useRemoveUsersFromRole,
} from "@/hooks/useRole";
import { useToast } from "@/components/ui/toast";
import RoleAddUsersModal from "./RoleAddUsersModal";

interface RoleUsersSectionProps {
  users: User[];
  roleId: string;
  isLoading?: boolean;
}

export default function RoleUsersSection({
  users,
  roleId,
  isLoading,
}: RoleUsersSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { users: allUsers = [], isLoading: isLoadingAllUsers } = useUsers();
  const removeUserMutation = useRemoveUserFromRole();
  const addUsersMutation = useAddUsersToRole();
  const removeUsersMutation = useRemoveUsersFromRole();

  const handleRemoveUser = async (userId: string) => {
    try {
      await removeUserMutation.mutateAsync({ roleId, userId });
      toast({ title: t("role.user_removed_success") });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t("role.user_removed_error");
      toast({
        variant: "destructive",
        title: t("role.user_removed_error"),
        description: errorMessage,
      });
      throw error;
    }
  };

  const handleAddUsers = async (userIds: string[]) => {
    try {
      await addUsersMutation.mutateAsync({ roleId, userIds });
      toast({ title: t("role.user_added_success") });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t("role.user_added_error");
      toast({
        variant: "destructive",
        title: t("role.user_added_error"),
        description: errorMessage,
      });
      throw error;
    }
  };

  const handleRemoveUsers = async (userIds: string[]) => {
    try {
      await removeUsersMutation.mutateAsync({ roleId, userIds });
      toast({ title: t("role.user_removed_success") });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t("role.user_removed_error");
      toast({
        variant: "destructive",
        title: t("role.user_removed_error"),
        description: errorMessage,
      });
      throw error;
    }
  };

  const header = (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-gray-600" />
      <span className="font-medium text-sm">{t("role.users")}</span>
      <Badge variant="outline" className="ml-2">
        {users.length}
      </Badge>
    </div>
  );

  const actions = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsModalOpen(true);
      }}
      className="p-1 text-gray-400 hover:text-gray-600 rounded"
      title={t("role.add_users")}
    >
      <Edit className="h-4 w-4" />
    </button>
  );

  if (isLoading) {
    return (
      <Collapse header={header} actions={actions} defaultOpen={true}>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
                <div className="h-3 bg-gray-200 rounded w-48 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </Collapse>
    );
  }

  return (
    <>
      <RoleAddUsersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentUsers={users}
        allUsers={allUsers}
        onAddUsers={handleAddUsers}
        onRemoveUsers={handleRemoveUsers}
      />
      <Collapse header={header} actions={actions} defaultOpen={true}>
        {users.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            <div>{t("role.user_list")}</div>
            <div className="text-xs mt-1">
              {t("role.user_list_description")}
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-blue-600 hover:text-blue-700 text-xs mt-1"
            >
              {t("role.configure_link")}
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md transition-colors"
              >
                <Avatar name={user.name} size="md" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-gray-900 break-all">
                    {user.name}
                  </span>
                  <div className="text-xs text-gray-600 mt-0.5 break-all">
                    {user.email}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveUser(user.id)}
                  disabled={removeUserMutation.isPending}
                  className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Collapse>
    </>
  );
}
