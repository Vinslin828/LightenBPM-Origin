import { Application } from "@/types/application";
import { Modal, ModalProps } from "@ui/modal";
import dayjs from "dayjs";
import { ApplicationStatusTag } from "../application-status-tag";
import { Textarea } from "@ui/textarea";
import { Button } from "@ui/button";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { ApplicationModalInfo } from "../application-info-card";
import { UseModalReturn } from "@/hooks/useModal";

type Props = Omit<ModalProps, "children"> & {
  application: Application | null;
  onApprove: (
    applicationId: string,
    comment: string,
    approvalId: string,
  ) => void;
  progressModalProps?: UseModalReturn;
};
export default function ApproveModal({
  application,
  onApprove,
  ...props
}: Props) {
  if (!application) return null;
  const [comment, setComment] = useState("");

  useEffect(() => {
    setComment("");
  }, [application]);

  return (
    <Modal {...props}>
      {/* <Modal.Header>approve</Modal.Header> */}
      <div className="p-7.5 flex flex-col gap-7.5 items-center justify-center">
        <span className="text-dark text-2xl font-semibold">Approve</span>
        {/* Application Information */}
        <ApplicationModalInfo
          application={application}
          progressModalProps={props.progressModalProps}
        />
        {/* Comment */}
        <div className="w-full">
          <div className="pb-2.5">Comment</div>
          <Textarea
            className="h-29"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        {/* Buttons */}
        <div className="flex flex-row gap-4.5 md:w-100 max-w-100 items-center justify-center">
          <Button variant={"tertiary"} className="w-full" onClick={props.close}>
            Cancel
          </Button>
          <Button
            variant={"success"}
            className="w-full"
            onClick={() => {
              onApprove(
                application.serialNumber,
                comment,
                application.approvalId,
              );
            }}
          >
            Approve
          </Button>
        </div>
      </div>
    </Modal>
  );
}
