import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, ModalProps } from "@ui/modal";
import { Button } from "@ui/button";
import { useToast } from "@ui/toast";
import {
  useImportWorkflowCheck,
  useImportWorkflowExecute,
} from "@/hooks/useWorkflow";
import {
  ExportPayload,
  ImportCheckResponse,
  ImportDependencyItem,
} from "@/types/domain";
import {
  CheckCircleIcon,
  ConditionIcon,
  CrossCircleIcon,
} from "@/components/icons";
import { AlertTriangle } from "lucide-react";

type Props = Omit<ModalProps, "children"> & {
  onImportSuccess?: (workflowId: string) => void;
};

type Step =
  | "upload"
  | "checking"
  | "confirm_replace"
  | "review"
  | "executing"
  | "done"
  | "error";

export default function ImportWorkflowModal({
  onImportSuccess,
  ...props
}: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { mutateAsync: importCheck } = useImportWorkflowCheck();
  const { mutateAsync: importExecute } = useImportWorkflowExecute();

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [checkResult, setCheckResult] = useState<ImportCheckResponse | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setCheckResult(null);
    setErrorMessage("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    props.close();
  };

  const handleFile = async (selected: File) => {
    if (
      selected.type !== "application/json" &&
      !selected.name.endsWith(".json")
    ) {
      return;
    }
    if (selected.size > 1024 * 1024) {
      return;
    }
    setFile(selected);
    setStep("checking");

    try {
      const text = await selected.text();
      const payload: ExportPayload = JSON.parse(text);
      const response = await importCheck(payload);

      if (!response.success || !response.data) {
        setStep("error");
        setErrorMessage(t("toast.import_check_failed"));
        return;
      }

      const data = response.data;
      setCheckResult(data);

      const allItems = [
        ...data.dependencies_check.validations,
        ...data.dependencies_check.org_units,
        ...data.dependencies_check.users,
      ];
      const wouldBlock = allItems.some(
        (item) => item.severity === "BLOCKING" || item.status === "MISSING",
      );

      if (data.can_proceed && !wouldBlock) {
        if (data.summary.entity_exists) {
          setStep("confirm_replace");
        } else {
          await executeImport(data);
        }
      } else {
        setStep("review");
      }
    } catch {
      setStep("error");
      setErrorMessage(t("toast.import_check_failed"));
    }
  };

  const executeImport = async (data: ImportCheckResponse) => {
    setStep("executing");
    try {
      const execResponse = await importExecute(data);
      if (!execResponse.success || !execResponse.data) {
        setStep("error");
        setErrorMessage(t("toast.import_execute_failed"));
        return;
      }
      setStep("done");
      toast({ variant: "success", title: t("toast.import_success") });
      onImportSuccess?.(execResponse.data.public_id);
    } catch {
      setStep("error");
      setErrorMessage(t("toast.import_execute_failed"));
    }
  };

  const handleExecute = async () => {
    if (!checkResult) return;
    await executeImport(checkResult);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      void handleFile(dropped);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      void handleFile(selected);
    }
  };

  const allDependencyItems = checkResult?.dependencies_check
    ? [
        ...checkResult.dependencies_check.validations,
        ...checkResult.dependencies_check.org_units,
        ...checkResult.dependencies_check.users,
      ]
    : [];

  const hasBlocking = allDependencyItems.some(
    (item) => item.severity === "BLOCKING" || item.status === "MISSING",
  );

  return (
    <Modal {...props} close={handleClose}>
      <div className="p-7.5 flex flex-col gap-7.5 items-center min-w-[400px]">
        {step !== "confirm_replace" && (
          <span className="text-dark text-2xl font-semibold">
            {t("buttons.import")}
          </span>
        )}

        {/* Step: Upload */}
        {step === "upload" && (
          <>
            <div
              className={`w-full h-60 bg-gray-2 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                isDragging ? "ring-2 ring-primary" : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleInputChange}
              />
              <div className="flex flex-col gap-4 items-center">
                <div className="flex flex-col gap-1 text-center">
                  <p className="text-base font-medium text-dark">
                    {t("import.choose_file")}
                  </p>
                  <p className="text-sm text-secondary-text">
                    {t("import.file_format_hint")}
                  </p>
                </div>
                <Button
                  variant="tertiary"
                  className="bg-white cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                >
                  {t("import.browse_file")}
                </Button>
              </div>
            </div>
            <Button
              variant="tertiary"
              className="w-[190px]"
              onClick={handleClose}
            >
              {t("buttons.close")}
            </Button>
          </>
        )}

        {/* Step: Checking */}
        {step === "checking" && (
          <div className="w-full flex flex-col gap-4 items-center py-8">
            <div className="w-8 h-8 border-3 border-giant-blue border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-secondary-text">
              {t("import.checking")}
            </p>
          </div>
        )}

        {/* Step: Confirm Replace (entity_exists) */}
        {step === "confirm_replace" && (
          <>
            <p className="text-2xl font-semibold text-dark">
              {t("import.existing_file_detected")}
            </p>
            <p className="text-base font-medium text-dark text-center whitespace-pre-line">
              {t("import.existing_file_desc")}
            </p>
            <div className="flex gap-[18px]">
              <Button
                variant="tertiary"
                className="w-[190px]"
                onClick={handleClose}
              >
                {t("buttons.cancel")}
              </Button>
              <Button
                className="w-[190px] bg-[#F23030] hover:bg-[#D92626] text-white"
                onClick={handleExecute}
              >
                {t("import.replace_file")}
              </Button>
            </div>
          </>
        )}

        {/* Step: Review check results / Executing with loading overlay */}
        {(step === "review" || step === "executing") && checkResult && (
          <>
            <div className="relative w-full flex flex-col gap-4">
              {step === "executing" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/70 rounded-lg">
                  <div className="w-8 h-8 border-3 border-giant-blue border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-secondary-text">
                    {t("import.executing")}
                  </p>
                </div>
              )}

              <DependencySection
                title={t("import.dep_validations")}
                items={checkResult.dependencies_check.validations}
              />
              <DependencySection
                title={t("import.dep_org_units")}
                items={checkResult.dependencies_check.org_units}
              />
              <DependencySection
                title={t("import.dep_users")}
                items={checkResult.dependencies_check.users}
              />

              {checkResult.dependencies_check.related_form && (
                <DependencySection
                  title={t("import.dep_related_form")}
                  items={[checkResult.dependencies_check.related_form]}
                />
              )}
            </div>

            {step === "review" && (
              <div className="flex gap-4 w-full">
                <Button
                  variant="tertiary"
                  className="flex-1"
                  onClick={handleClose}
                >
                  {t("buttons.cancel")}
                </Button>
                <Button
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white"
                  onClick={reset}
                >
                  {t("import.try_again")}
                </Button>
              </div>
            )}
          </>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <>
            <div className="w-full flex flex-col gap-4 items-center py-4">
              <CheckCircleIcon className="w-12 h-12 text-green-500" />
              <p className="text-base font-medium text-dark">
                {t("import.success")}
              </p>
            </div>
            <Button
              variant="tertiary"
              className="w-[190px]"
              onClick={handleClose}
            >
              {t("buttons.close")}
            </Button>
          </>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <>
            <div className="w-full flex flex-col gap-4 items-center py-4">
              <CrossCircleIcon className="w-12 h-12 text-red-500" />
              <p className="text-base font-medium text-dark">{errorMessage}</p>
            </div>
            <div className="flex gap-4">
              <Button
                variant="tertiary"
                className="w-[190px]"
                onClick={handleClose}
              >
                {t("buttons.close")}
              </Button>
              <Button variant="tertiary" className="w-[190px]" onClick={reset}>
                {t("import.try_again")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function DependencySection({
  title,
  items,
}: {
  title: string;
  items: ImportDependencyItem[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-stroke p-4 flex flex-col gap-2">
      <p className="text-sm font-medium text-dark">{title}</p>
      <div className="flex flex-col gap-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <StatusIcon status={item.status} severity={item.severity} />
            <span className="text-secondary-text">
              {item.name ?? item.code ?? item.public_id}
            </span>
            <span
              className={`ml-auto text-xs font-medium ${
                item.status === "MISSING" || item.severity === "BLOCKING"
                  ? "text-red-500"
                  : item.severity === "WARNING"
                    ? "text-amber-500"
                    : "text-green-500"
              }`}
            >
              {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusIcon({
  status,
  severity,
}: {
  status: string;
  severity: string;
}) {
  if (status === "MISSING" || severity === "BLOCKING") {
    return <ConditionIcon className="w-4 h-4 text-red-500 shrink-0" />;
  }
  if (severity === "WARNING") {
    return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
  }
  return <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />;
}
