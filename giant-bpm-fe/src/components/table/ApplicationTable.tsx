import { JSX, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import Table, {
  TableColumn,
  TableMobileRowContext,
  TableProps,
} from "@/components/table";
import { TrashIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Application, OverallStatus } from "@/types/application";
import dayjs from "dayjs";
import { Link, useNavigate } from "react-router-dom";
import { useDiscardApplication } from "@/hooks/useApplication";
import { useToast } from "@ui/toast";
import { ApplicationStatusTag } from "../application-status-tag";
import DiscardModal from "../modals/discard-modal";
import { useModal } from "@/hooks/useModal";
import { ArrowUpDown } from "lucide-react";
import { useMenu } from "@ui/menu";
import { useUsers, useUsersByIds } from "@/hooks/useMasterData";
import { Avatar } from "@ui/avatar";

import ApplicationStatusMenu from "@ui/application-status-menu";

interface ApplicationTableProps {
  applications: Application[];
  loading?: boolean;
  empty?: JSX.Element;
  urlPrefix?: string;
  showApplicant?: boolean;
  showAction?: boolean;
  filter?: {
    value: OverallStatus | null;
    onFilter: (filter: OverallStatus | null) => void;
  };
  sorter?: {
    value: "asc" | "desc";
    onSorter: (sorter: "asc" | "desc") => void;
  };
  pagination?: TableProps<Application>["pagination"];
}

export function ApplicationTable({
  applications,
  loading,
  empty,
  urlPrefix = "",
  showApplicant = false,
  showAction = true,
  pagination,
  ...props
}: ApplicationTableProps) {
  const { t } = useTranslation();
  const userIds = useMemo(
    () => applications.map((app) => String(app.applicantId) ?? app.submittedBy),
    [applications],
  );
  const { users } = useUsersByIds(userIds);
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const { mutate: discardApplication, isPending: isCancelling } =
    useDiscardApplication({
      onSuccess: () => {
        closeDiscardModal();
        toast({
          variant: "success",
          title: "Successfully discard application.",
        });
      },
    });
  const { toast } = useToast();
  const [activeApplication, setActiveApplication] =
    useState<Application | null>(null);
  const {
    open: openDiscardModal,
    isOpen: isDiscardModalOpen,
    close: closeDiscardModal,
  } = useModal();

  function onClickDiscard(application: Application) {
    setActiveApplication(application);
    openDiscardModal();
  }
  function onDiscard(applicationId: string) {
    discardApplication(applicationId);
  }

  useEffect(() => {
    const totalPages =
      pageSize > 0 ? Math.max(1, Math.ceil(applications.length / pageSize)) : 1;
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, pageSize, applications.length]);

  const handleRowClick = useCallback(
    (app: Application) => {
      navigate(`${urlPrefix}/application/${app.serialNumber}`);
    },
    [navigate, urlPrefix],
  );

  const columns = useMemo<TableColumn<Application>[]>(() => {
    return [
      {
        key: "application",
        header: t("dashboard.application_name"),
        cell: (app) => (
          <div className="flex items-center gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-400">
                  #{app.serialNumber}
                </span>
              </div>
              <div className="text-lg font-semibold text-dark">
                {app.formInstance.form.name}
              </div>
            </div>
          </div>
        ),
      },
      ...(showApplicant
        ? [
            {
              key: "applicant",
              header: t("dashboard.applicant", { defaultValue: "Applicant" }),
              headerClassName: "w-56",
              cellClassName: "w-56",
              cell: (app: Application) => (
                <div className="flex items-center gap-2.5">
                  <Avatar
                    name={
                      users?.find((u) => u.id === String(app.applicantId))?.name
                    }
                    colorScheme="blue"
                    size="sm"
                  />
                  <div className="text-base font-medium text-dark leading-6 line-clamp-1">
                    {users?.find((u) => u.id === String(app.applicantId))
                      ?.name ?? "-"}
                  </div>
                </div>
              ),
            } satisfies TableColumn<Application>,
          ]
        : []),
      {
        key: "status",
        header: (
          <div className="flex flex-row justify-between">
            <span>{t("dashboard.status")}</span>
            {props.filter && (
              <ApplicationStatusMenu onItemSelect={props.filter.onFilter} />
            )}
          </div>
        ),
        cell: (app) => <ApplicationStatusTag status={app.overallStatus} />,
      },
      {
        key: "apply_date",
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
        cell: (app) => (
          <span className="text-base font-medium text-gray-800">
            {app.submittedAt
              ? dayjs(app.submittedAt).format("YYYY-MM-DD")
              : "-"}
          </span>
        ),
      },
      ...(showAction
        ? [
            {
              key: "actions",
              header: t("dashboard.actions"),
              cell: (app: Application) => {
                if (
                  app.overallStatus === OverallStatus.InProgress ||
                  app.overallStatus === OverallStatus.Draft
                )
                  return (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-gray-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClickDiscard(app);
                      }}
                      loading={isCancelling}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </Button>
                  );
                else return null;
              },
            },
          ]
        : []),
    ];
  }, [
    isCancelling,
    onClickDiscard,
    props.filter,
    props.sorter,
    showApplicant,
    t,
    users,
  ]);

  // const paginatedApplications = useMemo(() => {
  //   if (pageSize <= 0) return applications;
  //   const start = (currentPage - 1) * pageSize;
  //   return applications.slice(start, start + pageSize);
  // }, [currentPage, pageSize, applications]);

  const renderMobileRow = useCallback(
    ({ row }: TableMobileRowContext<Application>) => (
      <div
        className="flex flex-col justify-between h-32 border-b border-b-stroke last:border-none p-4"
        key={row.serialNumber}
        onClick={() => handleRowClick(row)}
      >
        <div>
          <div className="flex flex-row items-center justify-between gap-2 w-full">
            {/* serial number */}
            <span className="text-sm font-medium text-gray-400">
              #{row.serialNumber}
            </span>
            {/* application date */}
            <span className="text-sm font-medium text-secondary-text">
              {row.submittedAt
                ? dayjs(row.submittedAt).format("YYYY-MM-DD")
                : "-"}
            </span>
          </div>
          {/* form name */}
          <div className="text-lg font-semibold text-dark">
            {row.formInstance.form.name}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-row items-center gap-2 justify-between w-full">
            <ApplicationStatusTag status={row.overallStatus} />
            {(row.overallStatus === OverallStatus.InProgress ||
              row.overallStatus === OverallStatus.Draft) && (
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onClickDiscard(row);
                }}
                loading={isCancelling}
              >
                <TrashIcon className="h-5 w-5 text-primary-text" />
              </Button>
            )}
          </div>
        </div>
      </div>
    ),
    [handleRowClick, isCancelling, onClickDiscard, t],
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
      <DiscardModal
        isOpen={isDiscardModalOpen}
        close={closeDiscardModal}
        application={activeApplication}
        onDiscard={onDiscard}
      />
    </>
  );
}
function Empty() {
  return (
    <div className="flex flex-col w-full h-full items-center align-middle justify-center">
      <span className="text-primary-text text-lg font-semibold">
        No pending applications
      </span>
      <span className="text-secondary-text">
        You can click{" "}
        <Link
          to={"/application/history?tab=application"}
          className="text-giant-blue"
        >
          here
        </Link>{" "}
        to view your application history.
      </span>
    </div>
  );
}
