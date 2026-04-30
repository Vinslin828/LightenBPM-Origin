import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { OverallStatus, ReviewStatus } from "@/types/application";
import { useApplications } from "@/hooks/useApplication";
import { useAtom } from "jotai";
import { sidebarCollapsedAtom } from "@/store";
import ApplicationFormList from "@ui/application-form-list";
import { FormIcon, SignIcon } from "@/components/icons";

export default function DashboardPage() {
  const { t } = useTranslation();
  const [, setIsCollapsed] = useAtom(sidebarCollapsedAtom);
  const navigate = useNavigate();

  useEffect(() => {
    setIsCollapsed(false);
  }, [setIsCollapsed]);

  const { applications: approvalApplications, isLoading: isApprovalLoading } =
    useApplications({
      type: "approval",
      filter: { reviewStatus: ReviewStatus.Pending },
      sorter: { submittedAt: "desc" },
      pageSize: 1,
    });

  const {
    applications: applicationApplications,
    isLoading: isApplicationLoading,
  } = useApplications({
    type: "application",
    filter: { overallStatus: OverallStatus.InProgress },
    sorter: { submittedAt: "desc" },
    pageSize: 1,
  });

  const pendingApprovalsCount = approvalApplications?.total ?? 0;
  const inProgressApplicationsCount = applicationApplications?.total ?? 0;

  return (
    <div className="bg-gray-2 overflow-y-auto w-full min-w-0 p-4 sm:p-3 lg:p-8 h-full flex flex-col gap-5 md:gap-6 min-h-full">
      <div className="flex flex-col gap-4 md:gap-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {t("dashboard.home", { defaultValue: "Home" })}
        </h2>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* approval summary block */}
          <section
            className="bg-white rounded-lg border border-stroke p-2.5 inline-flex flex-col justify-start items-start overflow-hidden"
            onClick={() => {
              navigate("/approval");
            }}
          >
            <div className="self-stretch p-2.5 inline-flex justify-start items-center gap-2.5">
              <div className="w-10 h-10 bg-blue-600/10 rounded-lg flex justify-center items-center">
                <SignIcon className="w-6 h-6 text-lighten-blue" />
              </div>
              <div className="flex-1 justify-start text-gray-900 text-sm font-medium uppercase">
                {t("dashboard.approval_list", {
                  defaultValue: "Approval review",
                })}
              </div>
            </div>
            <div className="self-stretch p-2.5">
              {isApprovalLoading ? (
                <div className="space-y-2">
                  <div className="h-10 w-24 rounded bg-gray-3 animate-pulse" />
                  <div className="h-4 w-40 rounded bg-gray-3 animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="text-[40px] font-semibold text-lighten-blue leading-none">
                    {pendingApprovalsCount}
                  </div>
                  <p className="mt-2 text-sm text-secondary-text">
                    {t("dashboard.pending_approvals_count")}
                  </p>
                </>
              )}
            </div>
          </section>
          {/* application summary block */}
          <section
            className="bg-white rounded-lg border border-stroke p-2.5 inline-flex flex-col justify-start items-start overflow-hidden"
            onClick={() => navigate("/application")}
          >
            <div className="self-stretch p-2.5 inline-flex justify-start items-center gap-2.5">
              <div className="w-10 h-10 bg-blue-600/10 rounded-lg flex items-center justify-center">
                <FormIcon className="w-6 h-6 text-lighten-blue" />
              </div>
              <div className="flex-1 justify-start text-gray-900 text-sm font-medium uppercase">
                {t("dashboard.application_list", {
                  defaultValue: "Application review",
                })}
              </div>
            </div>
            <div className="self-stretch p-2.5">
              {isApplicationLoading ? (
                <div className="space-y-2">
                  <div className="h-10 w-24 rounded bg-gray-3 animate-pulse" />
                  <div className="h-4 w-40 rounded bg-gray-3 animate-pulse" />
                </div>
              ) : (
                <>
                  <div className="text-[40px] font-semibold text-lighten-blue leading-none">
                    {inProgressApplicationsCount}
                  </div>
                  <p className="mt-2 text-sm text-secondary-text">
                    {t("dashboard.in_progress_applications_count")}
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:gap-5">
        <h2 className="text-xl font-semibold text-gray-900">
          {t("dashboard.forms")}
        </h2>
        <ApplicationFormList />
      </div>
    </div>
  );
}
