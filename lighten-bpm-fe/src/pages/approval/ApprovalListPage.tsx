import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { SearchIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAtom } from "jotai";

import { sidebarCollapsedAtom } from "@/store";
import { useAuth } from "@/hooks/useAuth";
import { useApplications } from "@/hooks/useApplication";
import { useDebounce } from "@/hooks/useDebounce";
import { ReviewStatus } from "@/types/application";
import { ApprovalTable } from "@/components/table/ApprovalTable";
import { ReviewStatusTag } from "@/components/application-status-tag";
import { BackIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Menu, { MenuItem } from "@/components/ui/menu";
import { cn } from "@/utils/cn";
import { ChevronDown } from "lucide-react";

type ApprovalListTab = "pending" | "history";
type ApprovalSearchMode = "applicationName" | "serialNumber";

export default function ApprovalListPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom);

  const [activeTab, setActiveTab] = useState<ApprovalListTab>("pending");
  const [searchMode, setSearchMode] =
    useState<ApprovalSearchMode>("applicationName");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 700);

  const [reviewStatusFilter, setReviewStatusFilter] =
    useState<ReviewStatus | null>(null);
  const [approvalDateSorter, setApprovalDateSorter] = useState<"asc" | "desc">(
    "desc",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  useEffect(() => {
    setPage(1);
  }, [
    activeTab,
    searchMode,
    debouncedSearchQuery,
    reviewStatusFilter,
    approvalDateSorter,
  ]);

  const derivedReviewStatusFilter =
    activeTab === "pending"
      ? ReviewStatus.Pending
      : reviewStatusFilter === null
        ? undefined
        : reviewStatusFilter;
  const derivedApprovalStatusFilter = useMemo(() => {
    if (activeTab === "history" && !derivedReviewStatusFilter) {
      return ["APPROVED", "REJECTED", "CANCELLED"] as const;
    }
    if (!derivedReviewStatusFilter) return undefined;
    switch (derivedReviewStatusFilter) {
      case ReviewStatus.Approved:
        return ["APPROVED"] as const;
      case ReviewStatus.Canceled:
        return ["CANCELLED"] as const;
      case ReviewStatus.NotStarted:
        return ["WAITING"] as const;
      case ReviewStatus.Pending:
        return ["PENDING"] as const;
      case ReviewStatus.Rejected:
        return ["REJECTED"] as const;
      default:
        return undefined;
    }
  }, [activeTab, derivedReviewStatusFilter]);

  const searchMenuItems = useMemo<MenuItem[]>(
    () => [
      {
        label: t("dashboard.search_by_application_name"),
        onClick: () => {
          setSearchMode("applicationName");
          setSearchQuery("");
          setPage(1);
        },
      },
      {
        label: t("dashboard.search_by_serial_number"),
        onClick: () => {
          setSearchMode("serialNumber");
          setSearchQuery("");
          setPage(1);
        },
      },
    ],
    [t],
  );

  const searchModeLabel =
    searchMode === "serialNumber"
      ? t("dashboard.search_by_serial_number")
      : t("dashboard.search_by_application_name");

  const searchPlaceholder =
    searchMode === "serialNumber"
      ? t("dashboard.search_serial_number")
      : t("dashboard.search_application_name");

  const { applications, isLoading } = useApplications({
    type: "approval",
    page,
    pageSize,
    filter: {
      assigneeId: user?.id,
      approvalStatus: derivedApprovalStatusFilter
        ? [...derivedApprovalStatusFilter]
        : undefined,
      reviewStatus: derivedReviewStatusFilter,
      formName:
        searchMode === "applicationName"
          ? debouncedSearchQuery || undefined
          : undefined,
      serialNumber:
        searchMode === "serialNumber"
          ? debouncedSearchQuery || undefined
          : undefined,
    },
    sorter: {
      submittedAt: approvalDateSorter,
      sortBy: "applied_at",
    },
  });

  const tablePaginationProps = useMemo(() => {
    if (!applications) return undefined;
    const totalItems = applications.total ?? applications.items.length;

    return {
      currentPage: applications.page ?? page,
      pageSize: applications.limit ?? pageSize,
      totalItems,
      onPageChange: setPage,
      pageSizeOptions: [10, 25, 50, 100],
      onPageSizeChange: (size: number) => {
        setPageSize(size);
        setPage(1);
      },
    };
  }, [applications, page, pageSize]);

  const historyStatusMenuItems = useMemo<MenuItem[]>(
    () => [
      {
        label: t("dashboard.all_status"),
        onClick: () => {
          setReviewStatusFilter(null);
          setPage(1);
        },
      },
      {
        label: <ReviewStatusTag status={ReviewStatus.Rejected} />,
        onClick: () => {
          setReviewStatusFilter(ReviewStatus.Rejected);
          setPage(1);
        },
      },
      {
        label: <ReviewStatusTag status={ReviewStatus.Approved} />,
        onClick: () => {
          setReviewStatusFilter(ReviewStatus.Approved);
          setPage(1);
        },
      },
      {
        label: <ReviewStatusTag status={ReviewStatus.Canceled} />,
        onClick: () => {
          setReviewStatusFilter(ReviewStatus.Canceled);
          setPage(1);
        },
      },
    ],
    [t, setPage],
  );

  return (
    <div className="max-h-full overflow-y-auto h-full bg-gray-2 max-w-dvw">
      <div className="flex flex-col items-center justify-center">
        <div className="flex flex-row gap-5 text-dark text-lg font-medium items-center py-2 px-5 bg-white sticky top-0 border-b border-b-stroke z-10 max-w-full w-full">
          <Link to="/dashboard">
            <Button variant="tertiary" className="h-11 w-11 p-2">
              <BackIcon className="text-primary-text" />
            </Button>
          </Link>
          {t("dashboard.approval_review_title")}
        </div>

        <div className="lg:max-w-7xl md:max-w-4xl w-full flex flex-col gap-5 py-5 px-5">
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setActiveTab("pending")}
              className={cn(
                "h-11 px-5 py-2 rounded-lg text-base font-medium",
                activeTab === "pending"
                  ? "bg-lighten-blue text-white"
                  : "bg-white border border-stroke text-dark",
              )}
            >
              {t("dashboard.pending_approvals")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "h-11 px-5 py-2 rounded-lg text-base font-medium",
                activeTab === "history"
                  ? "bg-lighten-blue text-white"
                  : "bg-white border border-stroke text-dark",
              )}
            >
              {t("dashboard.approval_history")}
            </button>
          </div>

          <div className="flex flex-row gap-2.5 md:justify-between w-full justify-start">
            <div className="w-full max-w-[620px] bg-white rounded-lg border border-stroke inline-flex justify-start items-center">
              <div className="px-5 py-2.5 border-r border-stroke flex justify-center items-center gap-2.5">
                <Menu
                  items={searchMenuItems}
                  trigger={
                    <button
                      type="button"
                      className="inline-flex gap-2.5 w-[197px] justify-between items-center"
                    >
                      <span className="text-base text-dark">
                        {searchModeLabel}
                      </span>
                      <ChevronDown className="h-4 w-4 text-secondary-text" />
                    </button>
                  }
                />
              </div>
              <div className="flex-1 relative">
                <Input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-none rounded-r-lg border-0"
                  icon={<SearchIcon className="w-5 h-5 text-secondary-text" />}
                  hasClearIcon
                />
              </div>
            </div>
            {activeTab === "history" && (
              <div className="w-[220px]">
                <Menu
                  items={historyStatusMenuItems}
                  trigger={
                    <button
                      type="button"
                      className="h-12 w-full rounded-[6px] border border-stroke bg-white px-4 py-2.5 flex items-center justify-between text-left"
                    >
                      <span className="inline-flex items-center">
                        {reviewStatusFilter ? (
                          <ReviewStatusTag status={reviewStatusFilter} />
                        ) : (
                          <span className="text-base text-dark">
                            {t("dashboard.all_status")}
                          </span>
                        )}
                      </span>
                      <ChevronDown className="h-4 w-4 text-secondary-text" />
                    </button>
                  }
                />
              </div>
            )}
          </div>

          <ApprovalTable
            applications={applications?.items ?? []}
            loading={isLoading}
            empty={
              <div className="flex flex-col w-full h-full items-center align-middle justify-center min-h-100">
                <div className="text-primary-text text-lg font-semibold">
                  {activeTab === "pending"
                    ? t("dashboard.no_pending_approvals")
                    : t("dashboard.no_approval_history")}
                </div>
              </div>
            }
            showActions={activeTab === "pending"}
            filter={undefined}
            sorter={{
              value: approvalDateSorter,
              onSorter: (value) => {
                setApprovalDateSorter(value);
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
