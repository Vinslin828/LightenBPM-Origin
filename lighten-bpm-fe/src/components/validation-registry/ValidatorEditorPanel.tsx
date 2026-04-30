import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useValidator } from "@/hooks/useValidator";
import {
  useUpdateValidator,
  useSetValidatorComponents,
} from "@/hooks/useValidatorMutations";
import { useToast } from "@/components/ui/toast";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Toggle } from "@/components/ui/toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ValidatorType } from "@/types/validator";
import { MoreHorizontal } from "lucide-react";
import DeleteValidatorDialog from "./DeleteValidatorDialog";
import { getEntityLabelKey } from "@/const/form-builder";
import { EntityKey } from "@/types/form-builder";

interface ValidatorEditorPanelProps {
  validatorId: string;
  onDeleted: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}

const MAPPING_COMPONENTS: EntityKey[] = Object.values(EntityKey);

export default function ValidatorEditorPanel({
  validatorId,
  onDeleted,
  onDirtyChange,
}: ValidatorEditorPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: validator, isLoading, isError } = useValidator(validatorId);
  const updateValidator = useUpdateValidator();
  const setComponents = useSetValidatorComponents();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [validationCode, setValidationCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [isExternalApi, setIsExternalApi] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const savingRef = useRef(false);

  const onCodeChange = useCallback((value: string) => {
    setValidationCode(value);
  }, []);

  // Sync remote data to local state (skip during save to avoid stale data flicker)
  useEffect(() => {
    if (!validator || savingRef.current) return;
    setName(validator.name);
    setDescription(validator.description ?? "");
    setValidationCode(validator.data.code);
    setErrorMessage(validator.errorMessage);
    setSelectedComponents(validator.components);
    setIsExternalApi(validator.type === ValidatorType.Api);
  }, [validator]);

  // Track dirty state
  useEffect(() => {
    if (!validator) return;
    const dirty =
      name !== validator.name ||
      description !== (validator.description ?? "") ||
      validationCode !== validator.data.code ||
      errorMessage !== validator.errorMessage ||
      isExternalApi !== (validator.type === ValidatorType.Api) ||
      JSON.stringify([...selectedComponents].sort()) !==
        JSON.stringify([...validator.components].sort());
    onDirtyChange?.(dirty);
  }, [
    name,
    description,
    validationCode,
    errorMessage,
    selectedComponents,
    isExternalApi,
    validator,
    onDirtyChange,
  ]);

  const toggleComponent = (component: EntityKey) => {
    const apiName = component;
    setSelectedComponents((prev) =>
      prev.includes(apiName)
        ? prev.filter((c) => c !== apiName)
        : [...prev, apiName],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: t("validation_registry.name_required"),
      });
      return;
    }
    if (!errorMessage.trim()) {
      toast({
        variant: "destructive",
        title: t("validation_registry.error_message_required"),
      });
      return;
    }
    if (selectedComponents.length === 0) {
      toast({
        variant: "destructive",
        title: t("validation_registry.mapping_required"),
      });
      return;
    }

    savingRef.current = true;
    try {
      await updateValidator.mutateAsync({
        id: validatorId,
        dto: {
          name: name.trim(),
          description: description.trim(),
          validationType: isExternalApi ? "API" : "CODE",
          validationCode: validationCode,
          errorMessage: errorMessage.trim(),
          isActive: true,
        },
      });

      await setComponents.mutateAsync({
        id: validatorId,
        components: selectedComponents,
      });
    } finally {
      savingRef.current = false;
    }

    onDirtyChange?.(false);

    toast({
      variant: "success",
      title: t("validation_registry.update_success"),
    });
  };

  const handleExport = () => {
    if (!validator) return;
    const blob = new Blob([JSON.stringify(validator, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${validator.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-secondary-text">
        {t("loading")}
      </div>
    );
  }

  if (isError || !validator) {
    return (
      <div className="flex flex-1 items-center justify-center text-secondary-text">
        {t("validation_registry.select_to_view")}
      </div>
    );
  }

  const isSaving = updateValidator.isPending || setComponents.isPending;
  const extensions = [javascript()];

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-stroke px-6 py-4">
        <h2 className="text-lg font-semibold text-dark">
          {t("validation_registry.editor_title")}
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => setIsDeleteOpen(true)}
              className="text-red-600 focus:text-red-600"
            >
              {t("validation_registry.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6 p-6">
        {/* Code Editor */}
        <div className="overflow-hidden rounded-lg border border-stroke">
          <CodeMirror
            value={validationCode}
            onChange={onCodeChange}
            extensions={extensions}
            height="280px"
            placeholder="// Write your validation code here..."
            basicSetup={{
              lineNumbers: true,
              foldGutter: true,
              bracketMatching: true,
              closeBrackets: true,
              autocompletion: true,
              highlightActiveLine: true,
              indentOnInput: true,
            }}
          />
        </div>

        {/* External API call toggle */}
        <div className="flex items-center gap-3">
          <Toggle pressed={isExternalApi} onPressedChange={setIsExternalApi} />
          <span className="text-sm text-dark">
            {t("validation_registry.external_api_call")}
          </span>
        </div>

        {/* Name */}
        <div>
          <Label aria-required>{t("validation_registry.name")}</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("validation_registry.name_placeholder")}
          />
        </div>

        {/* Description */}
        <div>
          <Label>{t("validation_registry.description")}</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("validation_registry.description_placeholder")}
            maxLength={100}
          />
        </div>

        {/* Validation Mapping */}
        <div>
          <Label aria-required>
            {t("validation_registry.validation_mapping")}
          </Label>
          <div className="mt-2 flex flex-wrap gap-4">
            {MAPPING_COMPONENTS.map((component) => {
              const apiName = component;
              const checked = selectedComponents.includes(apiName);
              return (
                <label
                  key={component}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleComponent(component)}
                  />
                  <span className="text-sm text-dark">
                    {t(`form_builder.entities.${getEntityLabelKey(component)}`)}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Error Message */}
        <div>
          <Label aria-required>{t("validation_registry.error_message")}</Label>
          <Input
            value={errorMessage}
            onChange={(e) => setErrorMessage(e.target.value)}
            placeholder={t("validation_registry.error_message")}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-3 border-t border-stroke px-6 py-4">
        <Button variant="tertiary" onClick={handleExport}>
          {t("validation_registry.export")}
        </Button>
        <Button onClick={handleSave} loading={isSaving}>
          {t("validation_registry.save")}
        </Button>
      </div>

      {/* Delete dialog */}
      <DeleteValidatorDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        validatorId={validatorId}
        validatorName={validator.name}
        onDeleted={onDeleted}
      />
    </div>
  );
}
