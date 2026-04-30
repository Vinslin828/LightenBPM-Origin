import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  createDefaultExternalApiConfig,
  ExternalApiConfig,
  ExternalApiConfigValue,
} from "./ExternalApiConfig";

type UpdateApiConfigModalProps = {
  isOpen: boolean;
  datasetName: string;
  initialValue?: ExternalApiConfigValue;
  onClose: () => void;
  onUpdate: (value: ExternalApiConfigValue) => void | Promise<void>;
};

export default function UpdateApiConfigModal({
  isOpen,
  datasetName,
  initialValue,
  onClose,
  onUpdate,
}: UpdateApiConfigModalProps) {
  const [externalApiConfig, setExternalApiConfig] =
    useState<ExternalApiConfigValue>(
      initialValue ?? createDefaultExternalApiConfig(),
    );

  useEffect(() => {
    if (!isOpen) return;
    setExternalApiConfig(initialValue ?? createDefaultExternalApiConfig());
  }, [initialValue, isOpen]);

  const handleClose = () => {
    setExternalApiConfig(initialValue ?? createDefaultExternalApiConfig());
    onClose();
  };

  const handleUpdate = async () => {
    await onUpdate(externalApiConfig);
  };

  return (
    <Modal
      isOpen={isOpen}
      close={handleClose}
      size="lg"
      className="w-[1165px] max-w-[95vw] max-h-[90dvh]"
    >
      <ExternalApiConfig
        tableName={datasetName}
        value={externalApiConfig}
        onChange={setExternalApiConfig}
        onCancel={handleClose}
        onBack={handleClose}
        onCreate={handleUpdate}
        title="Update API Config"
        createLabel="Save"
        isEditMode
      />
    </Modal>
  );
}
