import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import OrganizationTree from "@/components/organization/OrganizationTree";
import OrganizationDetailPanel from "@/components/organization/OrganizationDetailPanel";
import CreateOrgModal from "@/components/organization/CreateOrgModal";
import { OrganizationErrorBoundary } from "@/components/organization/ErrorBoundary";
import { useOrgUnits, useCreateOrgUnit } from "@/hooks/useOrganization";
import { useToast } from "@/components/ui/toast";
import { Unit } from "@/types/domain";

/**
 * Organization & User Management Page
 * 3-panel layout: Left (tabs), Middle (tree), Right (details)
 */
export default function OrganizationsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState<string | undefined>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [parentOrgForCreate, setParentOrgForCreate] = useState<
    Unit | undefined
  >();

  const { units, isLoading, error } = useOrgUnits();

  const createOrgMutation = useCreateOrgUnit();

  const handleCreateOrg = async (data: {
    code: string;
    name: string;
    parentCode?: string;
  }) => {
    try {
      await createOrgMutation.mutateAsync(data);
      toast({
        title: t("organization.create_success"),
      });
      setIsCreateModalOpen(false);
      setParentOrgForCreate(undefined);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("organization.create_error"),
      });
      throw error;
    }
  };

  const handleAddSubOrg = (parentUnit: Unit) => {
    setParentOrgForCreate(parentUnit);
    setIsCreateModalOpen(true);
  };

  return (
    <OrganizationErrorBoundary>
      <CreateOrgModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setParentOrgForCreate(undefined);
        }}
        onSubmit={handleCreateOrg}
        allUnits={units || []}
        initialParentCode={parentOrgForCreate?.code}
      />
      <div className="flex h-full bg-white">
        {/* Middle Panel - Organization Tree */}
        <div className="flex-1 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="px-4 pt-3 pb-3 border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-semibold text-gray-900">
                {t("organization.title")}
              </h1>
              <Button
                size="sm"
                variant="secondary"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                {t("organization.new_org")}
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Input
                placeholder={t("organization.search_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
                hasClearIcon
              />
            </div>
          </div>

          {/* Tree Content */}
          <div className="flex-1 overflow-y-auto px-4 pt-3 pb-0">
            {isLoading && (
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">{t("common.loading")}</div>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-center justify-center h-64 p-4">
                <div className="text-red-600 text-sm mb-2">
                  {t("organization.load_error")}
                </div>
                <details className="text-xs text-gray-600">
                  <summary className="cursor-pointer">
                    View error details
                  </summary>
                  <pre className="mt-2 bg-gray-100 p-2 rounded overflow-auto max-w-md">
                    {error instanceof Error ? error.message : String(error)}
                  </pre>
                </details>
              </div>
            )}

            {!isLoading && !error && units && (
              <OrganizationTree
                units={units}
                selectedId={selectedOrgId}
                onSelect={setSelectedOrgId}
                searchQuery={searchQuery}
                onAddSubOrg={handleAddSubOrg}
              />
            )}
          </div>
        </div>

        {/* Right Panel - Organization Details */}
        <div className="w-[400px] bg-white overflow-y-auto px-4 py-3">
          {selectedOrgId ? (
            <OrganizationDetailPanel
              orgUnitId={selectedOrgId}
              onDelete={() => setSelectedOrgId(undefined)}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 text-sm">
              {t("organization.select_to_view")}
            </div>
          )}
        </div>
      </div>
    </OrganizationErrorBoundary>
  );
}
