import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateForm } from "@/hooks/useForm";
import { CreateFormModal } from "@/components/modals/form-metadata-modal";
import ImportFormModal from "@/components/modals/import-form-modal";
import { useModal } from "@/hooks/useModal";
import { CirclePlusIcon, DownloadIcon } from "@/components/icons";
import { useAtom } from "jotai";
import { sidebarCollapsedAtom } from "@/store";
import { Search } from "lucide-react";
import TagTabs from "@/components/tabs/tag-tabs";
import { SingleSelect } from "@ui/select/single-select";
import { useDebounce } from "@/hooks/useDebounce";
import { FormList } from "@/components/list/form-list";

export function FormListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const { open, isOpen, close } = useModal();
  const {
    open: openImport,
    isOpen: isImportOpen,
    close: closeImport,
  } = useModal();
  const [, setIsCollapsed] = useAtom(sidebarCollapsedAtom);
  const createForm = useCreateForm({
    onSuccess(data) {
      console.debug("onsuccess", data);
      if (data.success && data.data) {
        navigate(`/forms/${data.data.id}`);
      }
      close();
    },
  });
  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedTag, sortOrder]);

  useEffect(() => {
    setIsCollapsed(false);
  }, []);

  const formListOptions = useMemo(() => {
    const trimmedQuery = debouncedSearch.trim();
    const tagId =
      selectedTag !== "all" && selectedTag ? Number(selectedTag) : undefined;
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
  }, [debouncedSearch, selectedTag, page, limit, sortOrder]);

  return (
    <div className="min-h-full overflow-y-auto p-8 bg-gray-2 flex flex-col">
      <ImportFormModal
        isOpen={isImportOpen}
        close={closeImport}
        onImportSuccess={(formId) => {
          navigate(`/forms/${formId}`);
        }}
      />
      <CreateFormModal
        isOpen={isOpen}
        close={close}
        onSubmit={(data) => {
          createForm.mutate({
            name: data.name,
            description: data.description,
            tags: data.tags,
            validation: {
              required: false,
              validators: [],
            },
          });
        }}
      />
      <div className="flex flex-row justify-between">
        <h1 className="text-2xl font-semibold text-[#111928] mb-6">
          Form Management
        </h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={<DownloadIcon className="w-5 h-5" />}
            className="px-6 h-11 bg-white"
            onClick={openImport}
          >
            <span className="text-base">Import</span>
          </Button>
          <Button onClick={open} className="px-6 w-[156px] h-11">
            <CirclePlusIcon className="w-5 h-5" />
            <span className="text-base">New Form</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
        <div className="relative w-full md:w-[304px]">
          <Input
            type="text"
            placeholder="Search here..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 text-sm border-[#DFE4EA] rounded-lg"
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

      <TagTabs selectedTag={selectedTag} onSelect={setSelectedTag} />

      <FormList
        options={formListOptions}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setLimit(size);
          setPage(1);
        }}
      />
    </div>
  );
}
