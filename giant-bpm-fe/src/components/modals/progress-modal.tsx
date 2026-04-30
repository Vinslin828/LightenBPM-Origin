import { ApplicationStatusTag } from "../application-status-tag";
import { X } from "lucide-react";
import { Modal } from "@ui/modal";
import { useApplicationProgress } from "@/hooks/useApplication";
import { Application } from "@/types/application";
import { UseModalReturn } from "@/hooks/useModal";
import { Progress } from "../tabs/application-panel-tab/progress-tab-content";

type Props = {
  application: Application | null;
} & UseModalReturn;

export function ProgressModal({ application, ...props }: Props) {
  const { progress, isLoading } = useApplicationProgress(application?.id);
  if (application === null) return null;
  return (
    <Modal {...props}>
      <div className="max-h-[90dvh] overflow-y-auto bg-gray-2 rounded-t-2xl overflow-clip">
        <div className="bg-white border-stroke flex min-h-[58px] items-center border-b px-5 sticky top-0 z-15">
          <span className="text-dark flex-1 text-base font-semibold">
            Overall progress
          </span>
          <ApplicationStatusTag status={application.overallStatus} />
          <div className="pl-2 cursor-pointer" onClick={() => props.close()}>
            <X className="text-primary-text" />
          </div>
        </div>
        {isLoading && "loading"}
        {!progress && "no progress"}
        {progress && (
          <Progress
            progress={progress.progress}
            overallStatus={progress.overallStatus}
          />
        )}
      </div>
    </Modal>
  );
}
