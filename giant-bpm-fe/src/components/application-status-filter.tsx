import { OverallStatus, ReviewStatus } from "@/types/application";
import { BottomSheet, useDrawer } from "@ui/drawer";
import {
  OverallStatusSelect,
  ReviewStatusSelect,
} from "@ui/select/application-tag-select";
import { Check, FilterIcon, X } from "lucide-react";
import { SetStateAction, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ApplicationStatusTag,
  ReviewStatusTag,
} from "./application-status-tag";
import { Button } from "@ui/button";

type Props = {
  activeTab: "application" | "approval";
  reviewStatusFilter: ReviewStatus | null;
  setReviewStatusFilter: (value: SetStateAction<ReviewStatus | null>) => void;
  applicationStatusFilter: OverallStatus | null;
  setApplicationStatusFilter: (
    value: SetStateAction<OverallStatus | null>,
  ) => void;
  applicationDateSorter: "asc" | "desc";
  setApplicationDateSorter: (value: SetStateAction<"asc" | "desc">) => void;
  approvalDateSorter: "asc" | "desc";
  setApprovalDateSorter: (value: SetStateAction<"asc" | "desc">) => void;
};
export default function ApplicationStatusFilter({
  activeTab,
  reviewStatusFilter,
  applicationStatusFilter,
  setApplicationStatusFilter,
  setReviewStatusFilter,
  applicationDateSorter,
  setApplicationDateSorter,
  approvalDateSorter,
  setApprovalDateSorter,
}: Props) {
  const { t } = useTranslation();
  const drawer = useDrawer();
  const isApprovalTab = activeTab === "approval";
  const [tempStatus, setTempStatus] = useState<
    OverallStatus | ReviewStatus | null
  >(isApprovalTab ? reviewStatusFilter : applicationStatusFilter);
  const [tempSorter, setTempSorter] = useState<"asc" | "desc">(
    isApprovalTab ? approvalDateSorter : applicationDateSorter,
  );

  useEffect(() => {
    if (drawer.isOpen) {
      setTempStatus(
        isApprovalTab ? reviewStatusFilter : applicationStatusFilter,
      );
      setTempSorter(isApprovalTab ? approvalDateSorter : applicationDateSorter);
    }
  }, [
    drawer.isOpen,
    isApprovalTab,
    reviewStatusFilter,
    applicationStatusFilter,
    approvalDateSorter,
    applicationDateSorter,
  ]);

  const statusOptions = useMemo(
    () =>
      isApprovalTab
        ? [
            {
              label: t("dashboard.all_status"),
              value: null as ReviewStatus | null,
            },
            ...[
              ReviewStatus.Approved,
              ReviewStatus.Pending,
              ReviewStatus.Rejected,
              ReviewStatus.Canceled,
            ].map((status) => ({
              label: <ReviewStatusTag status={status} />,
              value: status,
            })),
          ]
        : [
            {
              label: t("dashboard.all_status"),
              value: null as OverallStatus | null,
            },
            ...Object.values(OverallStatus).map((status) => ({
              label: <ApplicationStatusTag status={status} />,
              value: status,
            })),
          ],
    [isApprovalTab, t],
  );

  const sortOptions = [
    { label: t("dashboard.sort_descending"), value: "desc" as const },
    { label: t("dashboard.sort_ascending"), value: "asc" as const },
  ];

  const selectedStatus = drawer.isOpen
    ? tempStatus
    : isApprovalTab
      ? reviewStatusFilter
      : applicationStatusFilter;
  const selectedSorter = drawer.isOpen
    ? tempSorter
    : isApprovalTab
      ? approvalDateSorter
      : applicationDateSorter;

  const handleStatusSelect = (value: ReviewStatus | OverallStatus | null) => {
    setTempStatus(value);
  };

  const handleSorterSelect = (value: "asc" | "desc") => {
    setTempSorter(value);
  };

  const handleApply = () => {
    if (isApprovalTab) {
      setReviewStatusFilter(tempStatus as ReviewStatus | null);
      setApprovalDateSorter(tempSorter);
    } else {
      setApplicationStatusFilter(tempStatus as OverallStatus | null);
      setApplicationDateSorter(tempSorter);
    }
    drawer.close();
  };

  return (
    <>
      <div className="w-50 md:block hidden">
        {activeTab === "approval" ? (
          <ReviewStatusSelect
            value={reviewStatusFilter}
            onValueChange={(value) => setReviewStatusFilter(value)}
          />
        ) : (
          <OverallStatusSelect
            value={applicationStatusFilter}
            onValueChange={(value) => setApplicationStatusFilter(value)}
          />
        )}
      </div>
      <div className="md:hidden block">
        <BottomSheet
          isOpen={drawer.isOpen}
          onClose={drawer.close}
          maxHeight="90dvh"
        >
          <div className="max-h-[90dvh] overflow-y-auto bg-gray-2 rounded-t-2xl overflow-clip">
            {/* Header */}
            <div className="bg-white border-stroke flex min-h-[58px] items-center border-b px-5 sticky top-0 z-15 flex-end justify-end">
              <div
                className="pl-2 cursor-pointer"
                onClick={() => drawer.close()}
              >
                <X className="text-primary-text" />
              </div>
            </div>
            {/* Status filter */}
            <div className="bg-white px-5 py-4 flex flex-col gap-3">
              <div className="text-sm font-medium text-primary-text">
                {t("dashboard.status")}
              </div>
              <div className="flex flex-col bg-white">
                {statusOptions.map((option, index) => {
                  const isSelected = selectedStatus === option.value;
                  return (
                    <button
                      key={index}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                      onClick={() => handleStatusSelect(option.value)}
                    >
                      <span className="flex items-center gap-2 text-dark">
                        {option.label}
                      </span>
                      {isSelected ? (
                        <Check className="w-5 h-5 text-giant-blue" />
                      ) : (
                        <span className="w-5 h-5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ReviewStatus or OverallStatus */}
            <div className="bg-white px-5 py-4 flex flex-col gap-3">
              <div className="text-sm font-medium text-primary-text">
                {t("dashboard.apply_date")}
              </div>
              <div className="flex flex-col bg-white">
                {sortOptions.map((option) => {
                  const isSelected = selectedSorter === option.value;
                  return (
                    <button
                      key={option.value}
                      className="flex w-full items-center justify-between px-4 py-3 text-left"
                      onClick={() => handleSorterSelect(option.value)}
                    >
                      <span className="text-dark">{option.label}</span>
                      {isSelected ? (
                        <Check className="w-5 h-5 text-giant-blue" />
                      ) : (
                        <span className="w-5 h-5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="bg-white p-5 sticky bottom-0">
              <Button className="w-full" onClick={handleApply}>
                {t("buttons.apply")}
              </Button>
            </div>
          </div>
        </BottomSheet>
        <button
          className="p-2.5 border rounded-lg border-stroke bg-white cursor-pointer w-11 h-11"
          onClick={() => drawer.open()}
        >
          <FilterIcon className="text-secondary-text" />
        </button>
      </div>
    </>
  );
}
