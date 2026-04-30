import { useEffect, useMemo, useState } from "react";
import type { ModalProps } from "@ui/modal";
import { useCodeBuilder } from "@/hooks/useCode/useCodeBuilder";
import { FormSchema } from "@/types/domain";
import { Checkbox } from "@ui/checkbox";
import { cn } from "@/utils/cn";
import { flushSync } from "react-dom";
import {
  CodeValidationContext,
  ValidationReturnType,
} from "@/hooks/useCode/types";
import { BaseCodeEditorModal } from "./base-code-editor-modal";

type ValidationCodeEditorModalProps = Omit<ModalProps, "children"> & {
  title?: string;
  code?: string;
  description?: string;
  errorMessage?: string;
  isApi?: boolean;
  minLines?: number;
  formSchema?: FormSchema;
  contextPreset?: CodeValidationContext;
  validationReturnType?: ValidationReturnType | ValidationReturnType[];
  showDescription?: boolean;
  requireErrorMessage?: boolean;
  showApiToggle?: boolean;
  onSave?: (
    value: string,
    description?: string,
    errorMessage?: string,
    isApi?: boolean,
  ) => void;
};

export function ValidationCodeEditorModal({
  title = "Expression",
  code: initCode,
  description: initDescription,
  errorMessage: initErrorMessage,
  isApi = true,
  minLines = 18,
  formSchema,
  contextPreset,
  validationReturnType,
  showDescription = false,
  requireErrorMessage = false,
  showApiToggle = true,
  onSave,
  ...modalProps
}: ValidationCodeEditorModalProps) {
  const [code, setCode] = useState(initCode ?? "");
  const [description, setDescription] = useState(initDescription ?? "");
  const [errorMessage, setErrorMessage] = useState(initErrorMessage ?? "");
  const [enableApi, setEnableApi] = useState<boolean>(isApi);
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const [errorMessageError, setErrorMessageError] = useState<
    string | undefined
  >(undefined);
  const [isCheckingCode, setIsCheckingCode] = useState(false);
  const shouldShowRunningHint = enableApi && isCheckingCode;

  const { validateValidator } = useCodeBuilder({ formSchema });

  useEffect(() => {
    setEnableApi(isApi);
  }, [isApi]);

  const returnTypes = useMemo(() => {
    if (!validationReturnType) {
      return ["boolean", "validationObject"] as ValidationReturnType[];
    }
    return Array.isArray(validationReturnType)
      ? validationReturnType
      : [validationReturnType];
  }, [validationReturnType]);

  const checkCode = async () => {
    if (requireErrorMessage) {
      const trimmedErrorMessage = errorMessage.trim();
      if (!trimmedErrorMessage) {
        setErrorMessageError("Error message is required");
        return;
      }
      setErrorMessageError(undefined);
    }

    const startedAt = performance.now();
    flushSync(() => {
      setIsCheckingCode(true);
    });

    try {
      if (enableApi) {
        // Let browser paint "Running validation..." before any heavy sync validation.
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      }

      const result = validateValidator(code, {
        context: contextPreset,
        returnTypes,
      });
      if (!result.isValid) {
        setCodeError(result.errors[0]);
        return;
      }

      setCodeError(undefined);
      onSave?.(code, description, errorMessage, enableApi);
      modalProps.close();
    } finally {
      if (enableApi) {
        const elapsed = performance.now() - startedAt;
        const minVisibleMs = 600;
        if (elapsed < minVisibleMs) {
          await new Promise<void>((resolve) =>
            setTimeout(resolve, minVisibleMs - elapsed),
          );
        }
      }
      setIsCheckingCode(false);
    }
  };

  return (
    <BaseCodeEditorModal
      {...modalProps}
      title={title}
      code={code}
      onCodeChange={setCode}
      minLines={minLines}
      placeholder={"function expression(value) {\n return true;\n}"}
      codeError={codeError}
      onCancel={modalProps.close}
      onConfirm={checkCode}
      extraContent={
        <>
          {showApiToggle && (
            <div className="flex flex-row gap-2.5">
              <Checkbox
                id={"enable-api"}
                checked={enableApi}
                onCheckedChange={(checked) => setEnableApi(Boolean(checked))}
              />
              <label htmlFor={"enable-api"}>Use external API call</label>
            </div>
          )}

          {shouldShowRunningHint && (
            <div className="text-sm text-secondary-text">
              Running validation...
            </div>
          )}

          {showDescription && (
            <div className="flex flex-col gap-2.5">
              <div className="text-dark text-base font-medium">Description</div>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Description"
                className={cn(
                  "h-12 w-full rounded-md border border-stroke bg-white px-5",
                  "text-base font-normal text-dark placeholder:text-slate-400",
                  "focus:border-giant-blue focus:outline-none",
                )}
              />
            </div>
          )}

          {requireErrorMessage && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-0.5">
                <div className="text-dark text-base font-medium">
                  Error Message
                </div>
                <div className="text-red-600 text-base font-medium">*</div>
              </div>
              <input
                value={errorMessage}
                onChange={(event) => {
                  setErrorMessage(event.target.value);
                  if (errorMessageError) {
                    setErrorMessageError(undefined);
                  }
                }}
                placeholder="Error messages for users"
                className={cn(
                  "h-12 w-full rounded-md border border-stroke bg-white px-5",
                  "text-base font-normal text-dark placeholder:text-slate-400",
                  "focus:border-giant-blue focus:outline-none",
                  errorMessageError && "border-red",
                )}
              />
              {errorMessageError && (
                <span className="text-red text-sm font-medium">
                  {errorMessageError}
                </span>
              )}
            </div>
          )}
        </>
      }
    />
  );
}
