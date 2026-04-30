import { Modal } from "@ui/modal";
import { Input } from "@ui/input";
import { Button } from "@ui/button";
import { Textarea } from "@ui/textarea";
import { useState, useEffect } from "react";
import { FlowDefinition, Tag } from "@/types/domain";
import DepartmentSelect from "@ui/select/tag-select";
import { Label } from "@ui/label";
import { useTranslation } from "react-i18next";

type FlowModalProps = {
  isOpen: boolean;
  close: () => void;
  onSubmit?: (data: FlowMetaData) => void;
  initialData?: FlowMetaData;
  isEdit?: boolean;
};

type FlowMetaData = Pick<FlowDefinition, "name" | "description" | "tags">;

function FlowModal({
  isOpen,
  close,
  onSubmit,
  initialData,
  isEdit = false,
}: FlowModalProps) {
  const { t } = useTranslation();
  const [flowData, setFlowData] = useState<FlowMetaData>(
    initialData || {
      name: "",
      tags: [
        {
          id: "",
          name: "",
          description: "",
          abbrev: "",
          createdAt: "",
          createdBy: "",
        },
      ],
      description: "",
    },
  );
  const [errors, setErrors] = useState<{
    name?: string;
    tags?: string;
  }>({});

  useEffect(() => {
    if (isOpen) {
      setFlowData(
        initialData || {
          name: "",
          tags: [],
          description: "",
        },
      );
      setErrors({});
    }
  }, [initialData, isOpen]);

  const validate = () => {
    const newErrors: { flowName?: string; tags?: string } = {};
    if (!flowData.name.trim()) {
      newErrors.flowName = t("errors.form_name_required");
    }
    if (flowData.tags.length === 0) {
      newErrors.tags = t("errors.department_required");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDepartmentChange = (departmentId?: string, department?: Tag) => {
    if (department) {
      setFlowData((prev) => ({ ...prev, tags: [department] }));
      if (errors.tags) {
        setErrors((prev) => ({ ...prev, tags: undefined }));
      }
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFlowData((prev) => ({ ...prev, name: e.target.value }));
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit?.(flowData);
      close();
    }
  };

  return (
    <Modal isOpen={isOpen} close={close}>
      <div className="flex flex-col gap-[30px] items-center w-full p-[30px]">
        <h2 className="text-[24px] font-semibold leading-[30px] text-[#111928]">
          {isEdit ? t("flow.modal.edit_title") : t("flow.new_flow")}
        </h2>

        <div className="flex flex-col gap-5 w-full">
          <div>
            <Label aria-required>{t("flow.modal.name_label")}</Label>
            <Input
              value={flowData.name}
              onChange={handleNameChange}
              placeholder={t("flow.modal.name_placeholder")}
              error={!!errors.name}
            />
            {errors.name && (
              <p className="text-red text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label aria-required>{t("form_builder.department")}</Label>
            <DepartmentSelect
              value={flowData.tags.length > 0 ? flowData.tags[0] : ""}
              onValueChange={handleDepartmentChange}
              error={!!errors.tags}
            />
            {errors.tags && (
              <p className="text-red text-xs mt-1">{errors.tags}</p>
            )}
          </div>

          <div className="">
            <div className="mb-2 text-sm font-medium text-gray-700">
              {t("flow.modal.description_label")}
            </div>
            <div className="relative">
              <Textarea
                value={flowData.description}
                onChange={(e) =>
                  setFlowData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="h-30"
                placeholder={t("form_builder.type_here")}
                maxLength={300}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                {flowData.description.length}/300
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-[18px]">
          <Button
            variant="tertiary"
            className="w-[190px] px-7 py-[13px]"
            onClick={close}
          >
            {t("buttons.cancel")}
          </Button>
          <Button
            variant="default"
            className="w-[190px] px-7 py-[13px]"
            onClick={handleSubmit}
          >
            {isEdit ? t("buttons.save") : t("buttons.create")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function EditFlowModal(props: Omit<FlowModalProps, "isEdit">) {
  return <FlowModal {...props} isEdit={true} />;
}

export function CreateFlowModal(props: Omit<FlowModalProps, "isEdit">) {
  return <FlowModal {...props} isEdit={false} />;
}
