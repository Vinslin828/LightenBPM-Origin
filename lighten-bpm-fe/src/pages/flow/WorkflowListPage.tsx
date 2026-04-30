import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useCreateWorkflow } from "@/hooks/useWorkflow";
import { Tag, FlowDefinition } from "@/types/domain";
import { CreateFlowModal } from "@/components/modals/flow-metadata-modal";
import ImportWorkflowModal from "@/components/modals/import-workflow-modal";
import { FormStatus } from "@/types/form-builder";
import { CirclePlusIcon, ImportIcon } from "@/components/icons";
import { useModal } from "@/hooks/useModal";
import { useTranslation } from "react-i18next";
import TagTabs from "@/components/tabs/tag-tabs";
import { useAtom } from "jotai";
import { sidebarCollapsedAtom } from "@/store";
import { useDebounce } from "@/hooks/useDebounce";
import { WorkflowList } from "@/components/list/workflow-list";
import { initialEdges, initialNodes } from "@/const/flow";

export const WorkflowListPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const debouncedSearch = useDebounce(searchQuery, 500);

  const {
    open: openImport,
    isOpen: isImportOpen,
    close: closeImport,
  } = useModal();
  const [, setIsCollapsed] = useAtom(sidebarCollapsedAtom);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedDepartment, sortOrder]);

  const workflowListOptions = useMemo(() => {
    const trimmedQuery = debouncedSearch.trim();
    const tagId =
      selectedDepartment !== "all" && selectedDepartment
        ? Number(selectedDepartment)
        : undefined;
    const normalizedTagIds =
      tagId !== undefined && !Number.isNaN(tagId) ? [tagId] : undefined;

    return {
      page,
      limit,
      filter: {
        name: trimmedQuery || undefined,
        tagIds: normalizedTagIds,
      },
      sorter: { createdAt: sortOrder },
    };
  }, [debouncedSearch, selectedDepartment, page, limit, sortOrder]);

  const createWorkflow = useCreateWorkflow();

  const handleCreateFlow = (data: {
    name: string;
    tags: Tag[];
    description: string;
  }) => {
    const newWorkflow: Omit<FlowDefinition, "id" | "createdAt" | "updatedAt"> =
      {
        name: data.name,
        description: data.description,
        tags: data.tags,
        version: 1,
        nodes: initialNodes,
        edges: initialEdges,
        publishStatus: FormStatus.Draft,
        revisionId: "",
      };
    createWorkflow.mutate(newWorkflow, {
      onSuccess: (response) => {
        if (response.success && response.data) {
          navigate(`/workflow/${response.data.id}`);
        }
      },
      onError(error) {
        console.debug(error);
      },
    });
  };
  useEffect(() => {
    setIsCollapsed(false);
  }, []);

  return (
    <div className="min-h-full overflow-y-auto p-8 flex flex-col gap-5 bg-gray-2">
      <ImportWorkflowModal
        isOpen={isImportOpen}
        close={closeImport}
        onImportSuccess={(workflowId) => {
          navigate(`/workflow/${workflowId}`);
        }}
      />
      <CreateFlowModal
        isOpen={isCreateModalOpen}
        close={() => setCreateModalOpen(false)}
        onSubmit={handleCreateFlow}
      />
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-[#111928]">
          {t("flow.title")}
        </h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<ImportIcon className="w-5 h-5" />}
            className="px-6 h-11 bg-white"
            onClick={openImport}
          >
            <span className="text-base">{t("buttons.import")}</span>
          </Button>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="px-6 h-11 bg-[#374151] hover:bg-[#2A3441] text-white"
          >
            <CirclePlusIcon className="w-5 h-5" />
            <span className="ml-0.5 text-base">{t("flow.new_flow")}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:w-[304px]">
          <Input
            type="text"
            placeholder={t("flow.search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 text-sm border-[#DFE4EA] rounded-lg"
            icon={<Search className="w-4 h-4 text-secondary-text" />}
            hasClearIcon
          />
        </div>
        {/* <Select
          value={sortOrder}
          onChange={(value) => setSortOrder(value === "asc" ? "asc" : "desc")}
          options={[
            { label: "Newest first", value: "desc" },
            { label: "Oldest first", value: "asc" },
          ]}
          className="w-full md:w-[200px]"
        /> */}
      </div>

      <TagTabs
        selectedTag={selectedDepartment}
        onSelect={setSelectedDepartment}
      />

      <WorkflowList
        options={workflowListOptions}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setLimit(size);
          setPage(1);
        }}
      />
    </div>
  );
};
