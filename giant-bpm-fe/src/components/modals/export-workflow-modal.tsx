import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, ModalProps } from "@ui/modal";
import { Button } from "@ui/button";
import { useToast } from "@ui/toast";
import { FileIcon } from "@/components/icons";
import { useExportWorkflow } from "@/hooks/useWorkflow";

type Props = Omit<ModalProps, "children"> & {
  workflowId: string;
  workflowName: string;
};

type ExportState = "idle" | "loading" | "done" | "error";

export default function ExportWorkflowModal({
  workflowId,
  workflowName,
  ...props
}: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { mutateAsync: exportWorkflow } = useExportWorkflow();
  const [state, setState] = useState<ExportState>("idle");
  const [progress, setProgress] = useState(0);
  const [fileSize, setFileSize] = useState(0);
  const downloadTriggered = useRef(false);

  useEffect(() => {
    if (!props.isOpen) {
      setState("idle");
      setProgress(0);
      setFileSize(0);
      downloadTriggered.current = false;
      return;
    }

    if (downloadTriggered.current) return;
    downloadTriggered.current = true;

    setState("loading");

    let frame: number;
    const start = performance.now();
    const duration = 1500;

    const tick = () => {
      const elapsed = performance.now() - start;
      const pct = Math.min(elapsed / duration, 0.9);
      setProgress(pct);
      if (pct < 0.9) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);

    exportWorkflow(workflowId)
      .then((response) => {
        cancelAnimationFrame(frame);

        if (!response.success || !response.data) {
          setState("error");
          toast({ variant: "destructive", title: t("toast.export_failed") });
          return;
        }

        const jsonString = JSON.stringify(response.data, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        setFileSize(blob.size);
        setProgress(1);
        setState("done");
        toast({ variant: "success", title: t("toast.export_success") });

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${workflowName.replace(/\s+/g, "_")}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      })
      .catch(() => {
        cancelAnimationFrame(frame);
        setState("error");
        toast({ variant: "destructive", title: t("toast.export_failed") });
      });

    return () => cancelAnimationFrame(frame);
  }, [props.isOpen]);

  function formatBytes(bytes: number) {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  const currentBytes = Math.round(fileSize * progress);

  const statusText =
    state === "error" ? "Failed" : state === "done" ? "Done" : "Saving...";

  return (
    <Modal {...props}>
      <div className="p-7.5 flex flex-col gap-7.5 items-center">
        <span className="text-dark text-2xl font-semibold">
          {t("buttons.export")}
        </span>

        <div className="w-full flex flex-col gap-5">
          <div className="w-full border border-stroke rounded-lg px-5 py-4 flex gap-5 items-center">
            <div className="shrink-0 size-10 rounded-full bg-gray-2 flex items-center justify-center">
              <FileIcon className="w-6 h-6 text-gray-500" />
            </div>
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <p className="font-body-medium-medium text-dark truncate">
                {workflowName}
              </p>
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="font-body-small-medium text-secondary-text">
                  {fileSize > 0
                    ? `${formatBytes(currentBytes)} of ${formatBytes(fileSize)}`
                    : "Preparing..."}
                </span>
                <span
                  className={
                    state === "error" ? "text-red-500" : "text-giant-blue"
                  }
                >
                  {statusText}
                </span>
              </div>
              <div className="h-2 w-full bg-gray-200 rounded-full">
                <div
                  className={`h-2 rounded-full transition-all duration-100 ${
                    state === "error" ? "bg-red-500" : "bg-giant-blue"
                  }`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <Button variant="tertiary" className="w-[190px]" onClick={props.close}>
          {t("buttons.close")}
        </Button>
      </div>
    </Modal>
  );
}
