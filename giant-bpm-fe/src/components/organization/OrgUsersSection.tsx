import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Collapse from "@/components/ui/collapse";
import { User } from "@/types/domain";
import { Users, Mail, CheckCircle, Edit } from "lucide-react";
import {
  useUsers,
  useRemoveUserFromOrgUnit,
  useAddUsersToOrgUnit,
  useRemoveUsersFromOrgUnit,
} from "@/hooks/useOrganization";
import { useToast } from "@/components/ui/toast";
import AddUsersModal from "./AddUsersModal";

interface OrgUsersSectionProps {
  users: User[];
  orgUnitId: string;
  isLoading?: boolean;
}

/**
 * Collapsible section showing all members of an organization
 * Allows setting a user's default organization
 */
export default function OrgUsersSection({
  users,
  orgUnitId,
  isLoading,
}: OrgUsersSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { users: allUsers = [], isLoading: isLoadingAllUsers } = useUsers();
  const removeUserMutation = useRemoveUserFromOrgUnit();
  const addUsersMutation = useAddUsersToOrgUnit();
  const removeUsersMutation = useRemoveUsersFromOrgUnit();

  const handleRemoveUser = async (userId: string) => {
    try {
      await removeUserMutation.mutateAsync({ orgUnitId, userId });
      toast({
        title: t("organization.user_removed_success"),
      });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t("organization.user_removed_error");

      toast({
        variant: "destructive",
        title: t("organization.user_removed_error"),
        description: errorMessage,
      });
      console.error("Failed to remove user:", error);
      throw error;
    }
  };

  const handleAddUsers = async (userIds: string[]) => {
    try {
      await addUsersMutation.mutateAsync({ orgUnitId, userIds });
      toast({ title: t("organization.user_added_success") });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t("organization.user_added_error");
      toast({
        variant: "destructive",
        title: t("organization.user_added_error"),
        description: errorMessage,
      });
      throw error;
    }
  };

  const handleRemoveUsers = async (userIds: string[]) => {
    try {
      await removeUsersMutation.mutateAsync({ orgUnitId, userIds });
      toast({ title: t("organization.user_removed_success") });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t("organization.user_removed_error");
      toast({
        variant: "destructive",
        title: t("organization.user_removed_error"),
        description: errorMessage,
      });
      throw error;
    }
  };

  const header = (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-gray-600" />
      <span className="font-medium text-sm">{t("organization.users")}</span>
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
      title={t("organization.edit_users")}
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

  if (users.length === 0) {
    return (
      <>
        <AddUsersModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          orgUnitId={orgUnitId}
          currentUsers={users}
          allUsers={allUsers}
          onAddUsers={handleAddUsers}
          onRemoveUsers={handleRemoveUsers}
        />
        <Collapse header={header} actions={actions} defaultOpen={true}>
          <div className="text-sm text-gray-500 text-center py-4">
            {t("organization.no_members")}
          </div>
        </Collapse>
      </>
    );
  }

  return (
    <>
      <AddUsersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orgUnitId={orgUnitId}
        currentUsers={users}
        allUsers={allUsers}
        onAddUsers={handleAddUsers}
        onRemoveUsers={handleRemoveUsers}
      />
      <Collapse header={header} actions={actions} defaultOpen={true}>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {users.map((user) => {
            const isDefaultOrg = user.defaultOrgId === orgUnitId;

            return (
              <div
                key={user.id}
                className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md transition-colors"
              >
                <Avatar name={user.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900 break-all">
                      {user.name}
                    </span>
                    {isDefaultOrg && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 border-blue-200 text-xs hover:bg-blue-50"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {t("organization.default_org")}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{user.email}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Collapse>
    </>
  );
}
