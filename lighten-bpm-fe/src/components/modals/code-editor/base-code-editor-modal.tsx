import { ReactNode } from "react";
import { Modal, type ModalProps } from "@ui/modal";
import { Button } from "@ui/button";
import { cn } from "@/utils/cn";
import CodeTextarea from "@ui/highlight-code-textarea";

type BaseCodeEditorModalProps = Omit<ModalProps, "children"> & {
  title: string;
  code: string;
  onCodeChange: (value: string) => void;
  minLines: number;
  placeholder: string;
  codeError?: string;
  topContent?: ReactNode;
  extraContent?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  maxWidthClassName?: string;
};

export function BaseCodeEditorModal({
  title,
  code,
  onCodeChange,
  minLines,
  placeholder,
  codeError,
  topContent,
  extraContent,
  onCancel,
  onConfirm,
  maxWidthClassName = "max-w-[800px]",
  ...modalProps
}: BaseCodeEditorModalProps) {
  return (
    <Modal
      {...modalProps}
      size="xl"
      className={cn(maxWidthClassName, modalProps.className)}
      closeOnOverlayClick={false}
    >
      <div className="p-7 flex flex-col items-center gap-7 overflow-y-auto">
        <div className="text-dark text-2xl font-semibold leading-8 w-full text-center">
          {title}
        </div>

        {topContent}

        <div className="w-full flex flex-col gap-4">
          <CodeTextarea
            value={code}
            onChange={onCodeChange}
            minLines={minLines}
            className="w-full"
            placeholder={placeholder}
          />

          {codeError && (
            <span className="text-red text-sm font-medium">{codeError}</span>
          )}

          {extraContent}

          <button
            type="button"
            onClick={() => {
              open("/doc");
            }}
            className={cn("text-lighten-blue text-base font-medium text-left")}
          >
            View Expression Guidelines
          </button>
        </div>

        <div className="flex w-full gap-4 justify-center">
          <Button
            type="button"
            variant="tertiary"
            className="w-48"
            onClick={onCancel}
          >
            Close
          </Button>
          <Button type="button" className="w-48" onClick={onConfirm}>
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
}
