import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Search as SearchIcon, Star } from "lucide-react";
import { ApplicationForm, ApplicationFormOptions } from "@/types/application";
import { useApplicationForms } from "@/hooks/useApplication";
import { useDebounce } from "@/hooks/useDebounce";
import TagTabs from "@/components/tabs/tag-tabs";
import { Input } from "@/components/ui/input";
import Pagination from "@/components/ui/pagination";
import { FormManagementIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";

type ApplicationFormListProps = {
  className?: string;
};

export default function ApplicationFormList({
  className,
}: ApplicationFormListProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedTag]);

  const filters = useMemo<ApplicationFormOptions>(() => {
    const trimmedQuery = debouncedSearch.trim();
    const tagId =
      selectedTag !== "all" && selectedTag ? Number(selectedTag) : undefined;
    const normalizedTagId =
      tagId !== undefined && !Number.isNaN(tagId) ? tagId : undefined;

    return {
      page,
      pageSize,
      filter: {
        formName: trimmedQuery || undefined,
        formTagIds: normalizedTagId ? [normalizedTagId] : undefined,
      },
      sorter: { sortOrder: "desc" },
    };
  }, [debouncedSearch, selectedTag, page, pageSize]);

  const { forms, isLoading } = useApplicationForms(filters);

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="text-center py-10 text-gray-500">{t("loading")}</div>
      );
    }

    if (!forms?.items.length) {
      return (
        <div className="bg-white rounded-lg border border-gray-200 p-16 text-center">
          <FormManagementIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-base font-medium text-gray-800">
            {t("dashboard.no_forms_found_title")}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {t("dashboard.no_forms_found_description")}
          </p>
        </div>
      );
    }

    return (
      <>
        <div className="space-y-4">
          {forms.items.map((form) => (
            <ApplicationFormCard applicationForm={form} key={form.bindingId} />
          ))}
        </div>
        <Pagination
          totalPages={forms.totalPages}
          page={forms.page}
          pageSize={forms.limit}
          onPageChange={setPage}
          //   onPageSizeChange={setPageSize}
        />
      </>
    );
  };

  return (
    <div className={className}>
      <div className="flex justify-between items-center gap-4">
        <div className="relative w-full md:w-80">
          <Input
            type="text"
            placeholder={t("dashboard.search_forms_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-lg border-gray-6"
            icon={<SearchIcon className="w-5 h-5 text-gray-400" />}
            hasClearIcon
          />
        </div>
      </div>

      <TagTabs
        selectedTag={selectedTag}
        onSelect={setSelectedTag}
        className="w-full mt-3"
      />

      <div className="mt-4">{renderContent()}</div>
    </div>
  );
}

function ApplicationFormCard({
  applicationForm,
}: {
  applicationForm: ApplicationForm;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { bindingId, form } = applicationForm;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-start justify-between pb-4">
        <div className="flex gap-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mt-0.5">
              {form.name}
            </h3>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-gray-600"
        >
          <Star />
        </Button>
      </div>
      <div className="flex flex-col md:flex-row flex-wrap justify-between gap-3">
        <p className="text-base text-gray-800 max-w-[970px]">
          {form.description}
        </p>
        <div className="flex items-center justify-end">
          <Button
            onClick={() => navigate(`/dashboard/application/form/${bindingId}`)}
          >
            {t("buttons.apply")}
          </Button>
        </div>
      </div>
    </div>
  );
}
