import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCreateValidator } from "@/hooks/useValidatorMutations";
import { useToast } from "@/components/ui/toast";

interface CreateValidatorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

export default function CreateValidatorDialog({
  isOpen,
  onClose,
  onCreated,
}: CreateValidatorDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createValidator = useCreateValidator();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: t("validation_registry.name_required"),
      });
      return;
    }

    const result = await createValidator.mutateAsync({
      name: name.trim(),
      ...(description.trim() && { description: description.trim() }),
      validationType: "CODE",
      errorMessage: "Validation failed",
      isActive: true,
      components: [],
    });

    // Force complete cache reset and refetch for validator list
    await queryClient.resetQueries({
      queryKey: ["validators"],
      exact: false,
    });

    toast({
      variant: "success",
      title: t("validation_registry.create_success"),
    });

    setName("");
    setDescription("");
    onClose();

    if (result.data?.id) {
      onCreated(result.data.id);
    }
  };

  const handleClose = () => {
    setName("");
    setDescription("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} close={handleClose} size="md">
      <div className="flex flex-col items-center gap-[30px] p-[30px]">
        <h3 className="text-2xl font-semibold leading-[30px] text-dark">
          {t("validation_registry.new_validation")}
        </h3>

        <div className="flex w-full flex-col gap-5">
          <div>
            <Label aria-required>{t("validation_registry.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("validation_registry.name_placeholder")}
              autoFocus
            />
          </div>
          <div>
            <Label>{t("validation_registry.description")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("validation_registry.description_placeholder")}
              maxLength={100}
              rows={2}
            />
            <div className="text-right text-sm text-secondary-text mt-1">
              {description.length}/100
            </div>
          </div>
        </div>

        <div className="flex gap-[18px]">
          <Button
            variant="tertiary"
            onClick={handleClose}
            className="w-[190px]"
          >
            {t("buttons.cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            loading={createValidator.isPending}
            className="w-[190px]"
          >
            {t("buttons.create")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
