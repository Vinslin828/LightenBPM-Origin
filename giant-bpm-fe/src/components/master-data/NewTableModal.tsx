import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import {
  SingleSelect,
  SelectOption,
} from "@/components/ui/select/single-select";
import { InfoIcon } from "lucide-react";
import {
  createDefaultExternalApiConfig,
  ExternalApiConfig,
  ExternalApiConfigValue,
} from "./ExternalApiConfig";

export type MasterDataSourceType = "manual_input" | "external_api";

const DATA_SOURCE_OPTIONS: SelectOption<MasterDataSourceType>[] = [
  { key: "manual_input", value: "manual_input", label: "Manual Input" },
  { key: "external_api", value: "external_api", label: "External API" },
];

interface NewTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    name: string,
    dataSource: MasterDataSourceType,
    externalApiConfig?: ExternalApiConfigValue,
  ) => void;
}

export const NewTableModal = ({
  isOpen,
  onClose,
  onCreate,
}: NewTableModalProps) => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [dataSource, setDataSource] =
    useState<MasterDataSourceType>("manual_input");
  const [step, setStep] = useState<"details" | "external_api">("details");
  const [externalApiConfig, setExternalApiConfig] =
    useState<ExternalApiConfigValue>(createDefaultExternalApiConfig);

  const resetState = () => {
    setName("");
    setDataSource("manual_input");
    setStep("details");
    setExternalApiConfig(createDefaultExternalApiConfig());
  };

  const handleInitialCreate = () => {
    if (!name.trim()) return;
    if (dataSource === "external_api") {
      setStep("external_api");
      return;
    }

    onCreate(name.trim(), dataSource);
    resetState();
  };

  const handleExternalApiCreate = () => {
    if (!name.trim()) return;
    onCreate(name.trim(), dataSource, externalApiConfig);
    resetState();
  };

  const handleBack = () => {
    setStep("details");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      close={handleClose}
      // size={step === "external_api" ? "lg" : "md"}
      size="lg"
      className={
        step === "external_api"
          ? "w-[1165px] max-w-[95vw] max-h-[90dvh]"
          : "w-[800px] max-w-[95vw]"
      }
    >
      {step === "external_api" ? (
        <ExternalApiConfig
          tableName={name}
          value={externalApiConfig}
          onChange={setExternalApiConfig}
          onCancel={handleClose}
          onBack={handleBack}
          onCreate={handleExternalApiCreate}
        />
      ) : (
        <div className="w-full h-full p-7 bg-white rounded-[20px] inline-flex flex-col justify-start items-center gap-7">
          <h2 className="justify-start text-gray-900 text-2xl font-semibold">
            {t("master_data.new_table")}
          </h2>

          <div className="self-stretch flex-1 min-h-0 flex flex-col justify-start items-start gap-5">
            <div className="self-stretch flex flex-col justify-start items-start gap-2.5">
              <Label className="text-base font-medium text-gray-900">
                Data Source
              </Label>
              <SingleSelect
                value={dataSource}
                options={DATA_SOURCE_OPTIONS}
                onChange={(value) =>
                  setDataSource(value as MasterDataSourceType)
                }
                className="w-full"
              />
            </div>

            <div className="self-stretch flex flex-col justify-start items-start gap-2.5">
              <Label>{t("master_data.table_name")}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("master_data.enter_name")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && dataSource === "manual_input") {
                    handleInitialCreate();
                  }
                }}
              />
              <div className="self-stretch px-3 py-2.5 bg-blue-600/10 rounded-md border-1 border-blue-600/20 inline-flex justify-start items-start gap-2">
                <InfoIcon className="h-5 w-5 text-giant-blue" />
                <div className="flex-1 justify-start text-gray-900 text-sm font-medium leading-5">
                  Once the table name is created, it CANNOT be changed. Please
                  choose the table name carefully.
                </div>
              </div>
            </div>
          </div>

          <div className="inline-flex justify-start items-start gap-4">
            <Button variant="tertiary" className="w-48" onClick={handleClose}>
              {t("master_data.cancel")}
            </Button>
            <Button
              className="w-48"
              onClick={handleInitialCreate}
              disabled={!name.trim()}
            >
              {t("master_data.create")}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};
