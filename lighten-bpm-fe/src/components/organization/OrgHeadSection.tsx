import { useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Collapse from "@/components/ui/collapse";
import { OrgHead } from "@/types/organization";
import { Mail, User as UserIcon, Edit } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  useUsers,
  useCreateOrgHead,
  useUpdateOrgHead,
  useDeleteOrgHead,
} from "@/hooks/useOrganization";
import EditHeadModal from "./EditHeadModal";

interface OrgHeadSectionProps {
  orgUnitId: string;
  head?: OrgHead;
  heads?: OrgHead[];
  isLoading?: boolean;
}

/**
 * Collapsible section showing the currently active Head of an organization
 * Displays avatar, name, email, and "Active" badge
 */
export default function OrgHeadSection({
  orgUnitId,
  head,
  heads = [],
  isLoading,
}: OrgHeadSectionProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { users: allUsers = [] } = useUsers();
  const createHeadMutation = useCreateOrgHead();
  const updateHeadMutation = useUpdateOrgHead();
  const deleteHeadMutation = useDeleteOrgHead();

  const header = (
    <div className="flex items-center gap-2">
      <UserIcon className="h-4 w-4 text-gray-600" />
      <span className="font-medium text-sm">{t("organization.heads")}</span>
      {head && (
        <Badge
          variant="secondary"
          className="ml-2 bg-green-50 text-green-700 border-green-200"
        >
          {t("organization.active")}
        </Badge>
      )}
    </div>
  );
  const actions = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsModalOpen(true);
      }}
      className="p-1 text-gray-400 hover:text-gray-600 rounded"
      title={t("organization.edit_heads")}
    >
      <Edit className="h-4 w-4" />
    </button>
  );

  const handleCreateHead = async (input: {
    userId: string;
    startDate: string;
    endDate?: string;
  }) => {
    await createHeadMutation.mutateAsync({
      orgUnitId,
      ...input,
    });
  };

  const handleUpdateHead = async (input: {
    headId: string;
    startDate: string;
    endDate?: string;
  }) => {
    await updateHeadMutation.mutateAsync({ orgUnitId, ...input });
  };

  const handleDeleteHead = async (input: { headId: string }) => {
    await deleteHeadMutation.mutateAsync({ orgUnitId, headId: input.headId });
  };

  const handleSaveSuccess = () => {
    toast({ title: t("organization.save_heads_success") });
  };

  const handleSaveError = () => {
    toast({
      variant: "destructive",
      title: t("organization.save_heads_error"),
    });
  };

  return (
    <>
      <EditHeadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        orgUnitId={orgUnitId}
        currentHeads={heads}
        allUsers={allUsers}
        onCreateHead={handleCreateHead}
        onUpdateHead={handleUpdateHead}
        onDeleteHead={handleDeleteHead}
        onSaveSuccess={handleSaveSuccess}
        onSaveError={handleSaveError}
      />
      <Collapse header={header} actions={actions} defaultOpen={true}>
        {isLoading ? (
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
              <div className="h-3 bg-gray-200 rounded w-48 animate-pulse" />
            </div>
          </div>
        ) : heads.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">
            {t("organization.no_active_head")}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {heads
              .sort(
                (a, b) =>
                  new Date(a.startDate).getTime() -
                  new Date(b.startDate).getTime(),
              )
              .map((h) => (
                <div key={h.id} className="flex items-start gap-3">
                  <Avatar name={h.user.name} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm text-gray-900 break-all">
                        {h.user.name}
                      </span>
                      {h.isActive && (
                        <Badge
                          variant="secondary"
                          className="bg-green-50 text-green-700 border-green-200 text-[10px] px-1.5 py-0"
                        >
                          {t("organization.active")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{h.user.email}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {dayjs(h.startDate).format("YYYY/MM/DD")}
                      {h.endDate && (
                        <>
                          {" - "}
                          {dayjs(h.endDate).format("YYYY/MM/DD")}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </Collapse>
    </>
  );
}
