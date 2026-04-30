import { BackIcon } from "@/components/icons";
import ApplicationStatusFilter from "@/components/application-status-filter";
import { ApplicationTable } from "@/components/table/ApplicationTable";
import Menu, { MenuItem } from "@/components/ui/menu";
import UserSelect from "@/components/ui/select/user-select";
import { useApplications } from "@/hooks/useApplication";
import { useDebounce } from "@/hooks/useDebounce";
import { sidebarCollapsedAtom, userAtom } from "@/store";
import {
  ApplicationListContextFilter,
  OverallStatus,
} from "@/types/application";
import { cn } from "@/utils/cn";
import { Button } from "@ui/button";
import { Input } from "@ui/input";
import { useAtom } from "jotai";
import { ChevronDown, SearchIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

type ApplicationListTab = "my" | "shared" | "all";
type AdminSearchMode = "applicationName" | "applicantName" | "serialNumber";

type ApplicantOption = {
  id: number;
  name: string;
};

const TAB_BUTTON_BASE_CLASS =
  "rounded-lg flex items-center gap-2.5 px-[22px] py-2.5";

function toValidTab(tab: string | null, isAdmin: boolean): ApplicationListTab {
  if (tab === "shared") return "shared";
  if (tab === "all" && isAdmin) return "all";
  return "my";
}

function getListFilter(tab: ApplicationListTab): ApplicationListContextFilter {
  switch (tab) {
    case "shared":
      return "shared";
    case "all":
      return "all";
    case "my":
    default:
      return "submitted";
  }
}

export default function ApplicationListPage() {
  const [user] = useAtom(userAtom);
  const [, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom);
  const { t } = useTranslation();
  const isAdmin = user?.isAdmin ?? false;

  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = toValidTab(searchParams.get("tab"), isAdmin);

  const [searchQuery, setSearchQuery] = useState("");
  const [adminSearchMode, setAdminSearchMode] =
    useState<AdminSearchMode>("applicationName");
  const [selectedApplicant, setSelectedApplicant] =
    useState<ApplicantOption | null>(null);
  const [applicationStatusFilter, setApplicationStatusFilter] =
    useState<OverallStatus | null>(null);
  const [applicationDateSorter, setApplicationDateSorter] = useState<
    "asc" | "desc"
  >("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const debouncedSearchQuery = useDebounce(searchQuery, 700);

  const canUseApplicantSearchMode = isAdmin && activeTab === "all";
  const resolvedSearchMode: AdminSearchMode =
    !canUseApplicantSearchMode && adminSearchMode === "applicantName"
      ? "applicationName"
      : adminSearchMode;
  const isApplicantSearchMode =
    canUseApplicantSearchMode && resolvedSearchMode === "applicantName";

  const currentUserApplicantId = Number.isNaN(Number(user?.id))
    ? undefined
    : Number(user?.id);
  const effectiveApplicantId =
    activeTab === "my"
      ? currentUserApplicantId
      : isApplicantSearchMode
        ? selectedApplicant?.id
        : undefined;

  const listFilter = useMemo(() => getListFilter(activeTab), [activeTab]);

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const setTab = useCallback(
    (tab: ApplicationListTab) => {
      setSearchParams({ tab });
      setPage(1);
    },
    [setSearchParams],
  );

  const setSearchMode = useCallback((mode: AdminSearchMode) => {
    setAdminSearchMode(mode);
    setPage(1);

    if (mode === "applicantName") {
      setSearchQuery("");
      return;
    }

    setSelectedApplicant(null);
  }, []);

  const { applications, isLoading } = useApplications({
    type: "application",
    listFilter,
    page,
    pageSize,
    filter: {
      ...(effectiveApplicantId !== undefined
        ? { applicantId: effectiveApplicantId }
        : {}),
      overallStatus:
        applicationStatusFilter === null ? undefined : applicationStatusFilter,
      ...(isApplicantSearchMode
        ? {}
        : resolvedSearchMode === "serialNumber"
          ? { serialNumber: debouncedSearchQuery || undefined }
          : { formName: debouncedSearchQuery || undefined }),
    },
    sorter: {
      submittedAt: applicationDateSorter,
      sortBy: "applied_at",
    },
  });

  const adminSearchModeLabel = useMemo(() => {
    if (resolvedSearchMode === "applicantName") {
      return t("dashboard.search_by_applicant_name");
    }
    if (resolvedSearchMode === "serialNumber") {
      return t("dashboard.search_by_serial_number");
    }

    return t("dashboard.search_by_application_name");
  }, [resolvedSearchMode, t]);

  const adminSearchMenuItems = useMemo<MenuItem[]>(() => {
    const items: MenuItem[] = [
      {
        label: t("dashboard.search_by_application_name"),
        onClick: () => setSearchMode("applicationName"),
      },
      {
        label: t("dashboard.search_by_serial_number"),
        onClick: () => setSearchMode("serialNumber"),
      },
    ];

    if (!canUseApplicantSearchMode) {
      return items;
    }

    return [
      items[0],
      {
        label: t("dashboard.search_by_applicant_name"),
        onClick: () => setSearchMode("applicantName"),
      },
      items[1],
    ];
  }, [canUseApplicantSearchMode, setSearchMode, t]);

  const searchPlaceholder = useMemo(() => {
    if (resolvedSearchMode === "applicantName") {
      return t("dashboard.search_applicant_name");
    }
    if (resolvedSearchMode === "serialNumber") {
      return t("dashboard.search_serial_number");
    }

    return t("dashboard.search_application_name");
  }, [resolvedSearchMode, t]);

  const tabOptions = useMemo(
    () => [
      { key: "my" as const, label: t("dashboard.my_applications") },
      { key: "shared" as const, label: t("dashboard.shared_with_me") },
      ...(isAdmin
        ? [{ key: "all" as const, label: t("dashboard.all_applications") }]
        : []),
    ],
    [isAdmin, t],
  );

  const tablePaginationProps = useMemo(() => {
    if (!applications) return undefined;

    return {
      currentPage: applications.page ?? page,
      pageSize: applications.limit ?? pageSize,
      totalItems: applications.total ?? applications.items.length,
      onPageChange: setPage,
      pageSizeOptions: [10, 25, 50, 100],
      onPageSizeChange: (size: number) => {
        setPageSize(size);
        setPage(1);
      },
    };
  }, [applications, page, pageSize]);

  return (
    <div className="max-h-full overflow-y-auto h-full bg-gray-2 max-w-dvw">
      <div className="flex flex-col items-center justify-center">
        <div className="flex flex-row gap-5 text-dark text-lg font-medium items-center py-2 px-5 bg-white sticky top-0 border-b border-b-stroke z-10 max-w-full w-full">
          <Link to="/dashboard?tab=application">
            <Button variant="tertiary" className="h-11 w-11 p-2">
              <BackIcon className="text-primary-text" />
            </Button>
          </Link>
          {t("dashboard.application_review_title")}
        </div>

        <div className="lg:max-w-7xl md:max-w-4xl w-full flex flex-col gap-5 py-5 px-5">
          <div className="flex gap-2.5">
            {tabOptions.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setTab(tab.key)}
                className={cn(
                  TAB_BUTTON_BASE_CLASS,
                  activeTab === tab.key
                    ? "bg-giant-blue text-white"
                    : "bg-white border border-stroke text-primary-text",
                )}
              >
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-row gap-2.5 md:justify-between w-full justify-start">
            <div className="w-full max-w-[620px] bg-white rounded-lg border border-stroke inline-flex justify-start items-center">
              <div className="px-5 py-2.5 border-r border-stroke flex justify-center items-center gap-2.5">
                <Menu
                  items={adminSearchMenuItems}
                  trigger={
                    <button
                      type="button"
                      className="inline-flex gap-2.5 w-[197px] justify-between items-center"
                    >
                      <span className="text-base text-dark">
                        {adminSearchModeLabel}
                      </span>
                      <ChevronDown className="h-4 w-4 text-secondary-text" />
                    </button>
                  }
                />
              </div>
              <div className="flex-1 relative">
                {isApplicantSearchMode ? (
                  <UserSelect
                    value={
                      selectedApplicant
                        ? String(selectedApplicant.id)
                        : undefined
                    }
                    onValueChange={(id, selectedUser) => {
                      const parsedId = Number(id);

                      if (!id || Number.isNaN(parsedId)) {
                        setSelectedApplicant(null);
                        setPage(1);
                        return;
                      }

                      setSelectedApplicant({
                        id: parsedId,
                        name: selectedUser?.name ?? String(id),
                      });
                      setPage(1);
                    }}
                    placeholder={t("dashboard.select_applicant")}
                    hasAllOption={false}
                    className="rounded-none rounded-r-lg border-none"
                  />
                ) : (
                  <Input
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                    className="rounded-none rounded-r-lg border-0"
                    icon={
                      <SearchIcon className="w-5 h-5 text-secondary-text" />
                    }
                    hasClearIcon
                  />
                )}
              </div>
            </div>

            <ApplicationStatusFilter
              activeTab="application"
              reviewStatusFilter={null}
              setReviewStatusFilter={() => {}}
              applicationStatusFilter={applicationStatusFilter}
              setApplicationStatusFilter={(value) => {
                setApplicationStatusFilter(value);
                setPage(1);
              }}
              applicationDateSorter={applicationDateSorter}
              setApplicationDateSorter={(value) => {
                setApplicationDateSorter(value);
                setPage(1);
              }}
              approvalDateSorter="desc"
              setApprovalDateSorter={() => {}}
            />
          </div>

          <ApplicationTable
            applications={applications?.items ?? []}
            loading={isLoading}
            showApplicant={activeTab === "all"}
            showAction={activeTab !== "shared"}
            empty={
              <div className="flex flex-col w-full h-full items-center align-middle justify-center min-h-100">
                <div className="text-primary-text text-lg font-semibold">
                  {t("dashboard.no_application_history")}
                </div>
              </div>
            }
            sorter={{
              value: applicationDateSorter,
              onSorter: (value) => {
                setApplicationDateSorter(value);
                setPage(1);
              },
            }}
            pagination={tablePaginationProps}
          />
        </div>
      </div>
    </div>
  );
}
