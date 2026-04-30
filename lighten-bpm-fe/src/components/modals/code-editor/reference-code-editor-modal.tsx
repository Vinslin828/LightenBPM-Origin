import { useState } from "react";
import type { ModalProps } from "@ui/modal";
import { useCodeBuilder } from "@/hooks/useCode/useCodeBuilder";
import { FormSchema } from "@/types/domain";
import { BaseCodeEditorModal } from "./base-code-editor-modal";

type ReferenceCodeEditorModalProps = Omit<ModalProps, "children"> & {
  title?: string;
  code?: string;
  minLines?: number;
  formSchema?: FormSchema;
  onSave?: (value: string) => void;
};

export function ReferenceCodeEditorModal({
  title = "Expression",
  code: initCode,
  minLines = 18,
  formSchema,
  onSave,
  ...modalProps
}: ReferenceCodeEditorModalProps) {
  const [code, setCode] = useState(initCode ?? "");
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const { validateReference } = useCodeBuilder({ formSchema });

  const checkCode = () => {
    const result = validateReference(code);
    if (!result.isValid) {
      setCodeError(result.errors[0]);
      return;
    }

    setCodeError(undefined);
    onSave?.(code);
    modalProps.close();
  };

  return (
    <BaseCodeEditorModal
      {...modalProps}
      title={title}
      code={code}
      onCodeChange={setCode}
      minLines={minLines}
      placeholder="getFormFieldValue('field_name').value"
      codeError={codeError}
      onCancel={modalProps.close}
      onConfirm={checkCode}
    />
  );
}
