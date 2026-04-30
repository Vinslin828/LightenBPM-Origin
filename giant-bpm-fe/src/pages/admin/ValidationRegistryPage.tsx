import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlusIcon } from "@/components/icons";
import ValidatorListPanel from "@/components/validation-registry/ValidatorListPanel";
import ValidatorEditorPanel from "@/components/validation-registry/ValidatorEditorPanel";
import CreateValidatorDialog from "@/components/validation-registry/CreateValidatorDialog";

export default function ValidationRegistryPage() {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isUnsavedDialogOpen, setIsUnsavedDialogOpen] = useState(false);
  const isDirtyRef = useRef(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const handleDirtyChange = useCallback((dirty: boolean) => {
    isDirtyRef.current = dirty;
  }, []);

  const confirmOrExecute = (action: () => void) => {
    if (isDirtyRef.current) {
      pendingActionRef.current = action;
      setIsUnsavedDialogOpen(true);
    } else {
      action();
    }
  };

  const handleDiscardAndProceed = () => {
    isDirtyRef.current = false;
    setIsUnsavedDialogOpen(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  };

  const handleCancelDiscard = () => {
    setIsUnsavedDialogOpen(false);
    pendingActionRef.current = null;
  };

  const handleSelect = (id: string) => {
    if (id === selectedId) return;
    confirmOrExecute(() => setSelectedId(id));
  };

  const handleNewValidation = () => {
    confirmOrExecute(() => setIsCreateOpen(true));
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-dark">
          {t("validation_registry.title")}
        </h1>
        <Button
          onClick={handleNewValidation}
          icon={<PlusIcon className="h-4 w-4" />}
        >
          {t("validation_registry.new_validation")}
        </Button>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        <ValidatorListPanel
          selectedId={selectedId}
          onSelect={handleSelect}
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          page={page}
          onPageChange={setPage}
        />

        {selectedId ? (
          <ValidatorEditorPanel
            key={selectedId}
            validatorId={selectedId}
            onDeleted={() => setSelectedId(null)}
            onDirtyChange={handleDirtyChange}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-secondary-text">
            {t("validation_registry.select_to_view")}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <CreateValidatorDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(id) => setSelectedId(id)}
      />

      {/* Unsaved Changes Dialog */}
      <Dialog open={isUnsavedDialogOpen} onOpenChange={handleCancelDiscard}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("validation_registry.unsaved_changes_title")}
            </DialogTitle>
            <DialogDescription>
              {t("validation_registry.unsaved_changes_message")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" onClick={handleCancelDiscard}>
              {t("buttons.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDiscardAndProceed}>
              {t("buttons.discard")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
