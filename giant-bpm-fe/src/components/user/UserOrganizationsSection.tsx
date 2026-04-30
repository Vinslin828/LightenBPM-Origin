import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronUp, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { DepartmentIcon } from "@/components/icons";
import { cn } from "@/utils/cn";
import {
  useUserMemberships,
  useDeleteMembership,
  useUpdateUserDefaultOrg,
} from "@/hooks/useUser";
import { useToast } from "@/components/ui/toast";
import { OrgMembership } from "@/types/user-management";
import { formatDateShort } from "@/utils/format-date";
import UserOrgAssignmentModal from "./UserOrgAssignmentModal";

interface UserOrganizationsSectionProps {
  userId: string;
  defaultOrgCode?: string;
}

export default function UserOrganizationsSection({
  userId,
  defaultOrgCode,
}: UserOrganizationsSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { memberships, isLoading } = useUserMemberships(userId);
  const deleteMembership = useDeleteMembership();
  const updateDefaultOrg = useUpdateUserDefaultOrg();

  const [isExpanded, setIsExpanded] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredMemberships = memberships.filter((m) => !m.isExpired);

  const handleDelete = async (membership: OrgMembership) => {
    try {
      await deleteMembership.mutateAsync({
        membershipId: membership.id,
        userId,
      });
      toast({ title: t("user_management.membership_deleted") });
    } catch {
      toast({
        variant: "destructive",
        title: t("user_management.membership_error"),
      });
    }
  };

  const handleSetDefault = async (membership: OrgMembership) => {
    try {
      await updateDefaultOrg.mutateAsync({
        userId,
        orgUnitCode: membership.orgUnitCode,
      });
      toast({ title: t("user_management.default_updated") });
    } catch {
      toast({
        variant: "destructive",
        title: t("user_management.membership_error"),
      });
    }
  };

  return (
    <>
      <div className="border border-stroke rounded-sm">
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className="text-sm font-semibold text-gray-900">
            {t("user_management.organizations")}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsModalOpen(true);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <Pencil className="h-4 w-4" />
            </button>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </div>

        {isExpanded && (
          <div className="px-4 pb-4">
            {/* Org list header */}
            <div className="text-xs font-medium text-gray-600 mb-2">
              {t("user_management.org_list")}
            </div>

            {isLoading ? (
              <div className="text-sm text-gray-400 py-4 text-center">
                {t("common.loading")}
              </div>
            ) : filteredMemberships.length === 0 ? (
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-500">
                  {t("user_management.org_list_hint")}
                </p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                >
                  {t("user_management.org_configure_link")}
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredMemberships.map((membership) => {
                  const isDefault = membership.orgUnitCode === defaultOrgCode;
                  const dateRange = membership.isIndefinite
                    ? `${formatDateShort(membership.startDate)} - ${t("user_management.no_end_date_label")}`
                    : `${formatDateShort(membership.startDate)} - ${formatDateShort(membership.endDate)}`;

                  return (
                    <div
                      key={membership.id}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded border border-stroke",
                        membership.isExpired && "opacity-60",
                      )}
                    >
                      <DepartmentIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {membership.orgUnitName || membership.orgUnitCode}
                        </div>
                        <div className="text-xs text-gray-500">{dateRange}</div>
                      </div>
                      {membership.isExpired ? (
                        <span className="text-xs text-gray-400">
                          {t("user_management.expired")}
                        </span>
                      ) : isDefault ? (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {t("user_management.default_label")}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(membership)}
                          className="text-xs text-blue-600 hover:text-blue-700 whitespace-nowrap"
                        >
                          {t("user_management.set_as_default")}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(membership)}
                        className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {isModalOpen && (
        <UserOrgAssignmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          userId={userId}
          existingMemberships={memberships}
          defaultOrgCode={defaultOrgCode}
        />
      )}
    </>
  );
}
