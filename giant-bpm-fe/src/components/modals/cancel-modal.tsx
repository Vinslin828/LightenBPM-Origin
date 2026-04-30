import { Application } from "@/types/application";
import { Modal, ModalProps } from "@ui/modal";
import { Button } from "@ui/button";
import { ApplicationModalInfo } from "../application-info-card";

type Props = Omit<ModalProps, "children"> & {
  application?: Application | null;
  onCancel: () => void;
};
export default function CancelModal({
  application,
  onCancel,
  ...props
}: Props) {
  // if (!application) return null;

  return (
    <Modal {...props}>
      {/* <Modal.Header>approve</Modal.Header> */}
      <div className="p-7.5 flex flex-col gap-7.5 items-center justify-center">
        <span className="text-dark text-2xl font-semibold">Cancel</span>
        <div>Are you sure you want to discard this application?</div>
        {/* Application Information */}

        {/* Buttons */}
        <div className="flex flex-row gap-4.5 md:w-100 max-w-100 items-center justify-center">
          <Button variant={"tertiary"} className="w-full" onClick={props.close}>
            Close
          </Button>
          <Button
            // variant={"destructive"}
            className="w-full"
            onClick={() => {
              onCancel();
              // onCancel(application.id);
            }}
          >
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
