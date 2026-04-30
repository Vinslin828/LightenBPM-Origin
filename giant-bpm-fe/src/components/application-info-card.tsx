import { Application, OverallStatus } from "@/types/application";
import dayjs from "dayjs";
import { ApplicationStatusTag } from "./application-status-tag";
import { ChevronRight } from "lucide-react";
import { UseModalReturn } from "@/hooks/useModal";

type Props = {
  application: Application;
  progressModalProps?: UseModalReturn;
  hideView?: boolean;
};

export function ApplicationModalInfo({
  application,
  progressModalProps,
  hideView = false,
}: Props) {
  return (
    <div className="bg-gray-2 flex flex-col gap-3 w-full p-3 rounded-md">
      <div className="flex flex-row justify-between">
        <div className="text-dark">Application ID</div>
        <div className="text-dark font-bold">{application.serialNumber}</div>
      </div>
      <div className="flex flex-row justify-between">
        <div className="text-dark">Application name</div>
        <div className="text-dark font-bold">
          {application.formInstance.form.name}
        </div>
      </div>
      <div className="flex flex-row justify-between">
        <div className="text-dark">Submit date</div>
        <div>
          {application.overallStatus === OverallStatus.Draft
            ? "--"
            : dayjs(application.submittedAt).format("YYYY-MM-DD HH:mm")}
        </div>
      </div>
      {application.overallStatus !== OverallStatus.Draft && !hideView && (
        <div className="flex flex-row justify-between">
          <div className="text-dark flex flex-row gap-2">
            Overall approval progress
            <ApplicationStatusTag status={application.overallStatus} />
          </div>
          <div
            className="flex flex-row text-giant-blue font-semibold items-center gap-1 cursor-pointer"
            onClick={() => progressModalProps?.open()}
          >
            View <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      )}
    </div>
  );
}
export function ApplicationApprovalInfo({ application }: Props) {
  return (
    <div>
      <div className="bg-gray-2 flex flex-col gap-3 w-full p-3 rounded-md">
        <div className="flex flex-row justify-between">
          <div className="text-dark">Application ID</div>
          <div className="text-dark font-bold">{application.serialNumber}</div>
        </div>
        <div className="flex flex-row justify-between">
          <div className="text-dark">Submit date</div>
          <div>{dayjs(application.submittedAt).format("YYYY-MM-DD HH:mm")}</div>
        </div>
      </div>
      {/* <div className="border-b border-b-stroke p-3 flex flex-col gap-3">
        <div className="flex flex-row justify-between">
          <div className="text-dark flex flex-row gap-2">
            <div className="w-[196px]">Overall approval progress</div>
            <ApplicationStatusTag status={application.overallStatus} />
          </div>
          <div
            className="flex flex-row text-giant-blue font-semibold items-center gap-1 cursor-pointer"
            onClick={() => {
              // TODO: open progress modal
            }}
          >
            View <ChevronRight className="w-5 h-5" />
          </div>
        </div>
        <div className="flex flex-row justify-between">
          <div className="text-dark flex flex-row gap-2">
            <div className="w-[196px]">My approval status</div>
            <ReviewStatusTag status={application.reviewStatus} />
          </div>
        </div>
      </div> */}
    </div>
  );
}
export function ApplicationInfo({ application }: Props) {
  return (
    <div>
      <div className="bg-gray-2 flex flex-col gap-3 w-full p-3 rounded-md">
        <div className="flex flex-row justify-between">
          <div className="text-dark">Application ID</div>
          <div className="text-dark font-bold">{application.serialNumber}</div>
        </div>
        <div className="flex flex-row justify-between">
          <div className="text-dark">Submit date</div>
          <div>
            {application.submittedAt
              ? dayjs(application.submittedAt).format("YYYY-MM-DD HH:mm")
              : "-"}
          </div>
        </div>
      </div>
    </div>
  );
}
