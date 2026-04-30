import { Application } from "@/types/application";
import { Modal, ModalProps } from "@ui/modal";
import dayjs from "dayjs";
import { ApplicationStatusTag } from "../application-status-tag";
import { Textarea } from "@ui/textarea";
import { Button } from "@ui/button";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { ApplicationModalInfo } from "../application-info-card";

type Props = Omit<ModalProps, "children"> & {
  application?: Application | null;
  onDiscard: (applicationId: string) => void;
  hideProgress?: boolean;
};
export default function DiscardModal({
  application,
  onDiscard,
  ...props
}: Props) {
  if (!application) return null;

  return (
    <Modal {...props}>
      {/* <Modal.Header>approve</Modal.Header> */}
      <div className="p-7.5 flex flex-col gap-7.5 items-center justify-center">
        <span className="text-dark text-2xl font-semibold">Discard</span>
        <div>Are you sure you want to discard this application?</div>
        {/* Application Information */}
        <ApplicationModalInfo application={application} hideView />
        {/* Buttons */}
        <div className="flex flex-row gap-4.5 md:w-100 max-w-100 items-center justify-center">
          <Button variant={"tertiary"} className="w-full" onClick={props.close}>
            Cancel
          </Button>
          <Button
            variant={"destructive"}
            className="w-full"
            onClick={() => {
              onDiscard(application.serialNumber);
            }}
          >
            Discard
          </Button>
        </div>
      </div>
    </Modal>
  );
}
