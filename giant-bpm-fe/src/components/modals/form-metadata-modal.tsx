import { Modal } from "@ui/modal";
import { Input } from "@ui/input";
import { Button } from "@ui/button";
import { Textarea } from "@ui/textarea";
import { useState, useEffect } from "react";
import { FormDefinition, Tag } from "@/types/domain";
import DepartmentSelect from "@ui/select/tag-select";
import { Label } from "@ui/label";
import { useTranslation } from "react-i18next";

type FormModalProps = {
  isOpen: boolean;
  close: () => void;
  onSubmit?: (
    data: Pick<FormDefinition, "name" | "description" | "tags">,
  ) => void;
  initialData?: Pick<FormDefinition, "name" | "description" | "tags">;
  isEdit?: boolean;
};

function FormModal({
  isOpen,
  close,
  onSubmit,
  initialData,
  isEdit = false,
}: FormModalProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<
    Pick<FormDefinition, "name" | "description" | "tags">
  >(
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
    description?: string;
  }>({});

  useEffect(() => {
    if (isOpen) {
      setFormData(
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
    const newErrors: { name?: string; tags?: string; description?: string } =
      {};
    if (!formData.name.trim()) {
      newErrors.name = t("errors.form_name_required");
    }
    if (formData.tags.length === 0) {
      newErrors.tags = t("errors.department_required");
    }
    if (!formData.description.trim()) {
      newErrors.description = t("errors.form_description_required");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDepartmentChange = (departmentId?: string, department?: Tag) => {
    if (department) {
      setFormData((prev) => ({ ...prev, tags: [department] }));
      if (errors.tags) {
        setErrors((prev) => ({ ...prev, tags: undefined }));
      }
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, name: e.target.value }));
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }));
    }
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit?.(formData);
      close();
    }
  };

  return (
    <Modal isOpen={isOpen} close={close}>
      <div className="flex flex-col gap-[30px] items-center w-full p-[30px]">
        <h2 className="text-[24px] font-semibold leading-[30px] text-[#111928]">
          {isEdit ? t("form_builder.edit_form") : t("form_builder.new_form")}
        </h2>

        <div className="flex flex-col gap-5 w-full">
          <div>
            <Label aria-required>{t("form_builder.form_name")}</Label>
            <Input
              value={formData.name}
              onChange={handleNameChange}
              placeholder={t("form_builder.enter_form_name")}
              error={!!errors.name}
            />
            {errors.name && (
              <p className="text-red text-xs mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <Label aria-required>{t("form_builder.department")}</Label>
            <DepartmentSelect
              value={formData.tags.length > 0 ? formData.tags[0] : ""}
              onValueChange={handleDepartmentChange}
              error={!!errors.tags}
            />
            {errors.tags && (
              <p className="text-red text-xs mt-1">{errors.tags}</p>
            )}
          </div>

          <div>
            <Label aria-required className="mb-2">
              {t("form_builder.form_description")}
            </Label>
            <div className="relative">
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder={t("form_builder.type_here")}
                maxLength={300}
                className="h-30"
                error={!!errors.description}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                {formData.description.length}/300
              </div>
            </div>
            {errors.description && (
              <p className="text-red text-xs mt-1">{errors.description}</p>
            )}
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

export default function EditFormModal(props: Omit<FormModalProps, "isEdit">) {
  return <FormModal {...props} isEdit={true} />;
}

export function CreateFormModal(props: Omit<FormModalProps, "isEdit">) {
  return <FormModal {...props} isEdit={false} />;
}
