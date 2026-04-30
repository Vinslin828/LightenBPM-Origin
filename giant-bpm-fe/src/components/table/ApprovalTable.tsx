import { JSX, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import Table, {
  TableColumn,
  TableMobileRowContext,
  TableProps,
} from "@/components/table";
import { Button } from "@/components/ui/button";
import { CheckCircleIcon, CrossCircleIcon } from "../icons";
import dayjs from "dayjs";
import { Application, ReviewStatus } from "@/types/application";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import {
  useApproveApplication,
  useRejectApplication,
} from "@/hooks/useApplication";
import { useModal } from "@/hooks/useModal";
import ApproveModal from "../modals/approve-modal";
import { ReviewStatusTag } from "../application-status-tag";
import RejectModal from "../modals/reject-modal";
import { useToast } from "@ui/toast";
import { ProgressModal } from "../modals/progress-modal";
import { ArrowUpDown } from "lucide-react";
import ApprovalStatusMenu from "@ui/approval-status-menu";
import { useUsers, useUsersByIds } from "@/hooks/useMasterData";
import { Avatar } from "@ui/avatar";

interface ApprovalTableProps {
  applications: Application[];
  loading?: boolean;
  empty?: JSX.Element;
  urlPrefix?: string;
  showActions?: boolean;
  filter?: {
    value: ReviewStatus | null;
    onFilter: (filter: ReviewStatus | null) => void;
  };
  sorter?: {
    value: "asc" | "desc";
    onSorter: (sorter: "asc" | "desc") => void;
  };
  pagination?: TableProps<Application>["pagination"];
}

export function ApprovalTable({
  loading,
  applications,
  empty,
  urlPrefix = "",
  showActions = true,
  pagination,
  ...props
}: ApprovalTableProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    open: openApproveModal,
    isOpen: isApproveModalOpen,
    close: closeApproveMoal,
  } = useModal();
  const {
    open: openRejectModal,
    isOpen: isRejectModalOpen,
    close: closeRejectModal,
  } = useModal();
  const progressModalProps = useModal();
  const userIds = useMemo(
    () => applications.map((app) => String(app.applicantId) ?? app.submittedBy),
    [applications],
  );
  console.debug("userIds", userIds, applications);
  const { users } = useUsersByIds(userIds);

  const [activeApplication, setActiveApplication] =
    useState<Application | null>(null);

  const { mutate: approveApplication } = useApproveApplication({
    onSuccess: () => {
      closeApproveMoal();
      toast({
        variant: "success",
        title: "Successfully approve application.",
      });
    },
  });
  const { mutate: rejectApplication } = useRejectApplication({
    onSuccess: () => {
      closeRejectModal();
      toast({
        variant: "success",
        title: "Successfully reject application.",
      });
    },
  });
  const { toast } = useToast();

  function onClickApprove(application: Application) {
    setActiveApplication(application);
    openApproveModal();
  }

  function onClickReject(application: Application) {
    setActiveApplication(application);
    openRejectModal();
  }

  function onApprove(
    serialNumber: string,
    comment: string,
    approvalId: string,
  ) {
    approveApplication({ serialNumber, comment, approvalId });
  }
  function onReject(serialNumber: string, comment: string, approvalId: string) {
    rejectApplication({ serialNumber, comment, approvalId });
  }

  const handleRowClick = useCallback(
    (app: Application) => {
      navigate(`${urlPrefix}/application/review/${app.approvalId}`);
    },
    [navigate, urlPrefix],
  );

  const columns = useMemo<TableColumn<Application>[]>(() => {
    return [
      {
        key: "application",
        header: t("dashboard.applications", { defaultValue: "Applications" }),
        headerClassName: "flex-1",
        cellClassName: "flex-1",
        cell: (app) => (
          <div className="flex flex-col justify-start">
            <div className="text-base font-medium text-dark leading-6 line-clamp-1">
              {app.formInstance.form.name}
            </div>
            <div className="text-sm font-medium text-secondary-text leading-5 line-clamp-1">
              #{app.serialNumber}
            </div>
          </div>
        ),
      },
      {
        key: "applicant",
        header: t("dashboard.applicant", { defaultValue: "Applicant" }),
        headerClassName: "w-56",
        cellClassName: "w-56",
        cell: (app) => (
          <div className="flex items-center gap-2.5">
            <Avatar
              name={users?.find((u) => u.id === String(app.applicantId))?.name}
              colorScheme="blue"
              size="sm"
            />
            <div className="text-base font-medium text-dark leading-6 line-clamp-1">
              {users?.find((u) => u.id === String(app.applicantId))?.name ??
                "-"}
            </div>
          </div>
        ),
      },
      {
        key: "status",
        header: (
          <div className="flex flex-row justify-between">
            <span>{t("dashboard.status")}</span>
            {props.filter && (
              <ApprovalStatusMenu onItemSelect={props.filter.onFilter} />
            )}
          </div>
        ),
        headerClassName: "w-40",
        cellClassName: "w-40",
        cell: (app) => <ReviewStatusTag status={app.reviewStatus} />,
      },
      {
        key: "submittedAt",
        header: (
          <div
            className="flex justify-between items-center gap-2 cursor-pointer w-full"
            onClick={() =>
              props.sorter?.onSorter(
                props.sorter.value === "asc" ? "desc" : "asc",
              )
            }
          >
            {t("dashboard.apply_date")}
            {props.sorter && (
              <ArrowUpDown className="text-secondary-text h-4 w-4" />
            )}
          </div>
        ),
        headerClassName: "w-40",
        cellClassName: "w-40",
        cell: (app) => (
          <span className="text-base font-medium text-[#111928]">
            {dayjs(app.submittedAt).format("YYYY-MM-DD")}
          </span>
        ),
      },
      ...(showActions
        ? [
            {
              key: "actions",
              header: t("dashboard.actions"),
              headerClassName: "w-56",
              cellClassName: "w-56",
              cell: (app: Application) =>
                app.reviewStatus === ReviewStatus.Pending && (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive-outline"
                      className="px-4 py-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClickReject(app);
                      }}
                    >
                      {t("buttons.reject", "Reject")}
                    </Button>
                    <Button
                      variant="success-outline"
                      className="px-4 py-1.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClickApprove(app);
                      }}
                    >
                      {t("buttons.approve", "Approve")}
                    </Button>
                  </div>
                ),
            } satisfies TableColumn<Application>,
          ]
        : []),
    ];
  }, [
    t,
    props.filter,
    props.sorter,
    users,
    onClickApprove,
    onClickReject,
    showActions,
  ]);

  const renderMobileRow = useCallback(
    ({ row }: TableMobileRowContext<Application>) => (
      <div
        className="flex flex-col gap-4 p-4 border-b border-b-stroek last:border-none"
        key={row.serialNumber}
        onClick={() => handleRowClick(row)}
      >
        <div className="flex items-center gap-3 flex-1">
          <Avatar />
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between gap-2 w-full">
              <span className="flex flex-row gap-2">
                <span className="text-sm font-medium text-dark">
                  {users?.find((u) => u.id === row.submittedBy)?.name ??
                    "loading"}
                </span>
                <span className="text-sm font-medium text-secondary-text">
                  #{row.serialNumber}
                </span>
              </span>
              <span className="text-sm font-medium text-secondary-text">
                {dayjs(row.submittedAt).format("YYYY-MM-DD")}
              </span>
            </div>

            <div className="text-lg font-semibold text-dark leading-[26px] w-fit hover:text-giant-blue cursor-pointer">
              {row.formInstance.form.name}
            </div>
          </div>
        </div>
        <div className="flex flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ReviewStatusTag status={row.reviewStatus} />
          </div>
          {/* action */}
          {showActions && row.reviewStatus === ReviewStatus.Pending && (
            <div className="flex flex-row gap-2 sm:flex-row">
              <Button
                variant="icon"
                className="w-10 h-10 rounded-full flex items-center justify-center bg-green-100 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onClickApprove(row);
                }}
              >
                <CheckCircleIcon className="text-green-600" />
              </Button>
              <Button
                className="w-10 h-10 rounded-full flex items-center justify-center bg-red-50 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onClickReject(row);
                }}
              >
                <CrossCircleIcon className="text-red" />
              </Button>
            </div>
          )}
        </div>
      </div>
    ),
    [handleRowClick, onClickApprove, onClickReject, showActions],
  );

  return (
    <>
      <Table<Application>
        data={applications}
        columns={columns}
        renderMobileRow={renderMobileRow}
        loading={loading}
        emptyState={empty ?? <Empty />}
        onRowClick={handleRowClick}
        pagination={
          pagination
            ? {
                ...pagination,
              }
            : undefined
        }
      />
      <ApproveModal
        isOpen={isApproveModalOpen}
        close={closeApproveMoal}
        application={activeApplication}
        onApprove={onApprove}
        progressModalProps={progressModalProps}
      />
      <RejectModal
        isOpen={isRejectModalOpen}
        close={closeRejectModal}
        application={activeApplication}
        onReject={onReject}
        progressModalProps={progressModalProps}
      />
      <ProgressModal application={activeApplication} {...progressModalProps} />
    </>
  );
}

function Empty() {
  return (
    <div className="flex flex-col w-full h-full items-center align-middle justify-center">
      <span className="text-primary-text text-lg font-semibold">
        No tasks to approve
      </span>
      <span className="text-secondary-text">
        You can click{" "}
        <Link
          to={"/application/history?tab=approval"}
          className="text-giant-blue"
        >
          here
        </Link>{" "}
        to view you approval history.
      </span>
    </div>
  );
}
