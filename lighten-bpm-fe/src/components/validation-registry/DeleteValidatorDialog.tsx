import { useTranslation } from "react-i18next";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useDeleteValidator } from "@/hooks/useValidatorMutations";
import { useToast } from "@/components/ui/toast";

interface DeleteValidatorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  validatorId: string;
  validatorName: string;
  onDeleted: () => void;
}

export default function DeleteValidatorDialog({
  isOpen,
  onClose,
  validatorId,
  validatorName,
  onDeleted,
}: DeleteValidatorDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const deleteValidator = useDeleteValidator();

  const handleDelete = async () => {
    await deleteValidator.mutateAsync(validatorId);
    toast({
      variant: "success",
      title: t("validation_registry.delete_success"),
    });
    onClose();
    onDeleted();
  };

  return (
    <Modal isOpen={isOpen} close={onClose} size="sm">
      <div className="p-6 text-center">
        <h3 className="text-lg font-semibold text-dark">
          {t("validation_registry.confirm_delete_title")}
        </h3>
      </div>
      <div className="px-6 pb-2 text-center">
        <p className="text-sm text-secondary-text">
          {t("validation_registry.confirm_delete_message", {
            name: validatorName,
          })}
        </p>
      </div>
      <div className="flex items-center justify-center space-x-3 p-6">
        <Button className="flex-1" variant="tertiary" onClick={onClose}>
          {t("buttons.cancel")}
        </Button>
        <Button
          className="flex-1"
          variant="destructive"
          onClick={handleDelete}
          loading={deleteValidator.isPending}
        >
          {t("buttons.delete")}
        </Button>
      </div>
    </Modal>
  );
}
