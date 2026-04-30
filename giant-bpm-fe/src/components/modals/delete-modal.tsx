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
  onDelete: () => void;
  message?: string;
};
export default function DeleteModal({ onDelete, message, ...props }: Props) {
  return (
    <Modal {...props}>
      {/* <Modal.Header>approve</Modal.Header> */}
      <div className="p-7.5 flex flex-col gap-7.5 items-center justify-center">
        <span className="text-dark text-2xl font-semibold">Delete</span>
        <div>{message ?? "Are you sure you want to discard this item?"}</div>
        {/* Application Information */}
        {/* Buttons */}
        <div className="flex flex-row gap-4.5 md:w-100 max-w-100 items-center justify-center">
          <Button variant={"tertiary"} className="w-full" onClick={props.close}>
            Cancel
          </Button>
          <Button
            variant={"destructive"}
            className="w-full"
            onClick={() => {
              onDelete();
            }}
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
