import {
  useApplication,
  useApprovalApplication,
  useApproveApplication,
  useRejectApplication,
} from "@/hooks/useApplication";

import { Button } from "@ui/button";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { BackIcon } from "@/components/icons";
import { useEffect, useMemo, useState } from "react";
import { Application, ReviewStatus } from "@/types/application";
import { useToast } from "@ui/toast";
import { useApproveRejectTab } from "@/components/tabs/reject-approve-tab";
import { ApplicationApprovalInfo } from "@/components/application-info-card";
import { useAtom } from "jotai";
import { sidebarCollapsedAtom } from "@/store";
import ApplicationPanelTab from "@/components/tabs/application-panel-tab";
import ApproverForm from "@/components/ApproverForm";

export default function ApplicationReviewDetailPage() {
  const { approvalTaskId } = useParams<{ approvalTaskId: string }>();
  // const { application, isLoading, isError } = useApplication(applicationId);
  const { application, isLoading, isError } =
    useApprovalApplication(approvalTaskId);

  const navigate = useNavigate();
  const { t } = useTranslation();
  const [, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom);

  useEffect(() => {
    setSidebarCollapsed(true);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        {t("loading")}
      </div>
    );
  }

  // Error state or application not found
  if (isError || !application) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <h1 className="text-2xl font-bold">Application Not Found</h1>
        <p className="text-lg">The requested application could not be found.</p>
        <Button onClick={() => navigate("/dashboard")} className="mt-4">
          {t("buttons.go_back_home")}
        </Button>
      </div>
    );
  }

  return <ApplicationDetail application={application} />;
}

function ApplicationDetail({
  application: pendingApplication,
}: {
  application: Application;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mutate: approveApplication, isPending: isApproving } =
    useApproveApplication({
      onSuccess: () => {
        toast({
          variant: "success",
          title: "Successfully approve application.",
        });
        // navigate("/dashboard?tab=approval");
      },
    });
  const { mutate: rejectApplication, isPending: isRejecting } =
    useRejectApplication({
      onSuccess: () => {
        toast({
          variant: "success",
          title: "Successfully reject application.",
        });
        // navigate("/dashboard?tab=approval");
      },
    });
  const { application: historyApplication } = useApplication(
    pendingApplication?.serialNumber,
  );
  const application = useMemo(
    () =>
      pendingApplication.reviewStatus !== ReviewStatus.Pending
        ? (historyApplication ?? pendingApplication)
        : pendingApplication,
    [pendingApplication, historyApplication],
  );

  //   const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const { decision, setDecision } = useApproveRejectTab();
  const [comment, setComment] = useState("");

  function handleSubmit() {
    if (decision === "approve") {
      approveApplication({
        serialNumber: application.serialNumber,
        comment,
        approvalId: application.approvalId,
      });
    } else if (decision === "reject") {
      rejectApplication({
        serialNumber: application.serialNumber,
        comment,
        approvalId: application.approvalId,
      });
    }
  }

  return (
    <div className="max-h-full bg-gray-3 overflow-y-scroll">
      {/* Header */}
      <div className="flex flex-row items-center w-full bg-white h-15 px-5 gap-5 sticky top-0 border-b border-stroke z-5">
        <Button
          onClick={() => navigate("/dashboard")}
          variant={"tertiary"}
          className="h-11 w-11 p-0"
        >
          <BackIcon className="w-5 h-5 text-dark" />
        </Button>
        <span className="font-medium text-dark text-base md:text-lg">
          {application.formInstance.form.name}
        </span>
      </div>
      {/* Content */}
      <div className="flex lg:flex-row-reverse flex-col lg:justify-between h-[calc(100dvh-104px)]">
        {/* <ApplicationProgress application={application} /> */}
        <ApplicationPanelTab application={application} />

        <div className="md:p-16 md:pt-4 lg:pt-16 p-4 w-full bg-gray-3 lg:overflow-y-auto justify-items-center">
          <div className="bg-white border border-gray-200 rounded-lg shadow-md p-1 max-w-6xl w-full">
            {/* information block */}
            <ApplicationApprovalInfo application={pendingApplication} />

            <div className="p-3">
              {/* {application.formInstance.form.description && (
                <p className="text-gray-600 mb-6">
                  {application.formInstance.form.description}
                </p>
              )} */}
              {/* <ReadonlyForm {...application} /> */}
              <ApproverForm {...application} />

              {/* <div className="flex flex-col py-4 gap-3">
                {application.reviewStatus === ReviewStatus.Pending && (
                  <div className="flex flex-col gap-3">
                    <div className="text-sm font-medium text-dark/50">
                      Decisions
                    </div>
                    <ApproveRejectTab
                      decision={decision}
                      setDecision={setDecision}
                    />
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <dt className="text-sm font-medium text-dark">Comment</dt>
                  <dd className="mt-1 text-base text-dark font-semibold whitespace-pre-wrap flex flex-row gap-3">
                    <Textarea
                      className="h-29"
                      value={application.comment ?? comment}
                      disabled={
                        !!application.comment ||
                        application.reviewStatus === ReviewStatus.Approved ||
                        application.reviewStatus === ReviewStatus.Rejected
                      }
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </dd>
                </div>
              </div>

              {application.reviewStatus === ReviewStatus.Pending && (
                <div className="flex flex-col items-center pt-5">
                  <Button
                    // variant={"destructive"}
                    onClick={handleSubmit}
                    loading={isApproving || isRejecting}
                    disabled={!decision}
                  >
                    Submit
                  </Button>
                </div>
              )} */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
