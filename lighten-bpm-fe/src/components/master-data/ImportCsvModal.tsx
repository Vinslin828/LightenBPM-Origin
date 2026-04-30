import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, type ModalProps } from "@ui/modal";
import { Button } from "@ui/button";
import { useToast } from "@ui/toast";
import { CheckCircleIcon, CrossCircleIcon } from "@/components/icons";
import { useImportDatasetCsv } from "@/hooks/useDataset";

type Props = Omit<ModalProps, "children"> & {
  datasetCode: string;
  onImportSuccess?: () => void;
};

type Step = "upload" | "uploading" | "done" | "error";

export default function ImportCsvModal({
  datasetCode,
  onImportSuccess,
  ...props
}: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const importCsv = useImportDatasetCsv(datasetCode);

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setErrorMessage("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleClose = () => {
    reset();
    props.close();
  };

  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  const handleFile = async (selected: File) => {
    if (!selected.name.endsWith(".csv") && selected.type !== "text/csv") {
      setErrorMessage(t("master_data.import_invalid_format"));
      setStep("error");
      return;
    }

    if (selected.size > MAX_FILE_SIZE) {
      setErrorMessage(t("master_data.import_file_too_large"));
      setStep("error");
      return;
    }

    setFile(selected);
    setStep("uploading");

    try {
      await importCsv.mutateAsync(selected);

      setStep("done");
      toast({
        variant: "success",
        title: t("master_data.import_success"),
      });
      onImportSuccess?.();
    } catch {
      setStep("error");
      setErrorMessage(t("master_data.import_failed"));
    }
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

  return (
    <Modal {...props} close={handleClose}>
      <div className="flex min-w-[400px] flex-col items-center gap-7.5 p-7.5">
        <span className="text-2xl font-semibold text-dark">
          {t("master_data.import_csv")}
        </span>

        {/* Step: Upload */}
        {step === "upload" && (
          <>
            <div
              className={`flex h-60 w-full cursor-pointer items-center justify-center rounded-lg bg-gray-2 transition-colors ${
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
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleInputChange}
              />
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-col gap-1 text-center">
                  <p className="text-base font-medium text-dark">
                    {t("master_data.import_choose_file")}
                  </p>
                  <p className="text-sm text-secondary-text">
                    {t("master_data.import_csv_hint")}
                  </p>
                </div>
                <Button
                  variant="tertiary"
                  className="cursor-pointer bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    inputRef.current?.click();
                  }}
                >
                  {t("master_data.import_browse")}
                </Button>
              </div>
            </div>
            <Button
              variant="tertiary"
              className="w-[190px]"
              onClick={handleClose}
            >
              {t("master_data.import_close")}
            </Button>
          </>
        )}

        {/* Step: Uploading */}
        {step === "uploading" && (
          <div className="flex w-full flex-col items-center gap-4 py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-lighten-blue border-t-transparent" />
            <p className="text-sm text-secondary-text">
              {t("master_data.import_uploading")}
            </p>
            {file && <p className="text-xs text-secondary-text">{file.name}</p>}
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <>
            <div className="flex w-full flex-col items-center gap-4 py-4">
              <CheckCircleIcon className="h-12 w-12 text-green-500" />
              <p className="text-base font-medium text-dark">
                {t("master_data.import_success")}
              </p>
            </div>
            <Button
              variant="tertiary"
              className="w-[190px]"
              onClick={handleClose}
            >
              {t("master_data.import_close")}
            </Button>
          </>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <>
            <div className="flex w-full flex-col items-center gap-4 py-4">
              <CrossCircleIcon className="h-12 w-12 text-red-500" />
              <p className="text-base font-medium text-dark">{errorMessage}</p>
            </div>
            <div className="flex gap-4">
              <Button
                variant="tertiary"
                className="w-[190px]"
                onClick={handleClose}
              >
                {t("master_data.import_close")}
              </Button>
              <Button variant="tertiary" className="w-[190px]" onClick={reset}>
                {t("master_data.import_try_again")}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
