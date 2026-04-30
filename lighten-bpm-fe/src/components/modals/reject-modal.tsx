import { Application } from "@/types/application";
import { Modal, ModalProps } from "@ui/modal";
import { Textarea } from "@ui/textarea";
import { Button } from "@ui/button";
import { useEffect, useState } from "react";
import { ApplicationModalInfo } from "../application-info-card";
import { UseModalReturn } from "@/hooks/useModal";

type Props = Omit<ModalProps, "children"> & {
  application: Application | null;
  onReject: (serialNumber: string, comment: string, approvalId: string) => void;
  progressModalProps?: UseModalReturn;
};
export default function RejectModal({
  application,
  onReject,
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
        <span className="text-dark text-2xl font-semibold">Reject</span>
        {/* Application Information */}
        <ApplicationModalInfo
          application={application}
          progressModalProps={props.progressModalProps}
        />
        {/* Comment */}
        <div className="w-full">
          <div className="pb-2.5">Reject reason</div>
          <Textarea
            className="h-29"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>
        {/* Buttons */}
        <div className="flex flex-row gap-4.5 md:w-full max-w-100 items-center justify-center">
          <Button variant={"tertiary"} className="w-full" onClick={props.close}>
            Cancel
          </Button>
          <Button
            variant={"destructive"}
            className="w-full"
            onClick={() => {
              onReject(
                application.serialNumber,
                comment,
                application.approvalId,
              );
            }}
          >
            Reject
          </Button>
        </div>
      </div>
    </Modal>
  );
}
