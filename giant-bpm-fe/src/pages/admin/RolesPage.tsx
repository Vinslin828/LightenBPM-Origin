import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import RoleList from "@/components/role/RoleList";
import RoleDetailPanel from "@/components/role/RoleDetailPanel";
import CreateRoleModal from "@/components/role/CreateRoleModal";
import { useRoles, useCreateRole } from "@/hooks/useRole";
import { useToast } from "@/components/ui/toast";

export const RolesPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState<string | undefined>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { roles, isLoading, error } = useRoles();
  const createRoleMutation = useCreateRole();

  const handleCreateRole = async (data: { code: string; name: string }) => {
    try {
      await createRoleMutation.mutateAsync(data);
      toast({ title: t("role.create_success") });
      setIsCreateModalOpen(false);
    } catch {
      toast({ variant: "destructive", title: t("role.create_error") });
      throw new Error(t("role.create_error"));
    }
  };

  return (
    <>
      <CreateRoleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateRole}
      />
      <div className="flex h-full bg-white">
        {/* Left Panel - Role List */}
        <div className="flex-1 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="px-4 pt-3 pb-3 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-semibold text-gray-900">
                {t("role.title")}
              </h1>
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                {t("role.new_role")}
              </Button>
            </div>

            <div className="relative">
              <Input
                placeholder={t("role.search_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
                hasClearIcon
              />
            </div>
          </div>

          {/* List Content */}
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-0">
            {isLoading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">{t("common.loading")}</div>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center h-64 p-4">
                <div className="text-red-600 text-sm mb-2">
                  {t("role.load_error")}
                </div>
              </div>
            )}

            {!isLoading && !error && roles && (
              <>
                {roles.length === 0 && !searchQuery ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <div className="text-sm">{t("role.no_role")}</div>
                    <button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="text-blue-600 hover:text-blue-700 text-sm mt-1"
                    >
                      {t("role.empty_hint")}
                    </button>
                  </div>
                ) : (
                  <RoleList
                    roles={roles}
                    selectedId={selectedRoleId}
                    onSelect={setSelectedRoleId}
                    searchQuery={searchQuery}
                  />
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Panel - Role Details */}
        <div className="w-[400px] bg-white overflow-y-auto px-4 py-3">
          {selectedRoleId ? (
            <RoleDetailPanel
              roleId={selectedRoleId}
              onDelete={() => setSelectedRoleId(undefined)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              {t("role.select_to_view")}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
