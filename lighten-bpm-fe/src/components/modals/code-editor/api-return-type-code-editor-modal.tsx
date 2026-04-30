import { useCallback, useMemo, useRef, useState } from "react";
import type { ModalProps } from "@ui/modal";
import { DropdownSelect } from "@/components/ui/dropdown-select";
import { useCodeBuilder } from "@/hooks/useCode/useCodeBuilder";
import { FormSchema } from "@/types/domain";
import { ApiResponseType } from "@/hooks/useCode/types";
import { BaseCodeEditorModal } from "./base-code-editor-modal";

type ApiReturnTypeCodeEditorModalProps = Omit<ModalProps, "children"> & {
  title?: string;
  code?: string;
  apiResponseType?: ApiResponseType;
  minLines?: number;
  formSchema?: FormSchema;
  onSave?: (value: string, apiResponseType?: ApiResponseType) => void;
};

const responseTypeOptions = [
  { label: "Plain Text", value: "text" },
  { label: "Rich Text", value: "richText" },
  { label: "Grid", value: "grid" },
] as const;

const responseTypeTemplates: Record<ApiResponseType, string> = {
  text: 'function getData() {\n  return "plain text result";\n}',
  richText:
    "function getData() {\n  return `\n    <table>\n      <tr>\n        <th>Company</th>\n        <th>Contact</th>\n        <th>Country</th>\n      </tr>\n      <tr>\n        <td>Alfreds</td>\n        <td>Maria</td>\n        <td>Germany</td>\n      </tr>\n      <tr>\n        <td>Moctezuma</td>\n        <td>Francisco</td>\n        <td>Mexico</td>\n      </tr>\n    </table>\n  `;\n}",
  grid: 'function getData() {\n  return [\n    { id: 1, lastName: "Snow", firstName: "Jon", age: 14 },\n    { id: 2, lastName: "Lannister", firstName: "Cersei", age: 31 },\n    { id: 3, lastName: "Lannister", firstName: "Jaime", age: 31 },\n    { id: 4, lastName: "Stark", firstName: "Arya", age: 11 },\n    { id: 5, lastName: "Targaryen", firstName: "Daenerys", age: null },\n    { id: 6, lastName: "Melisandre", firstName: null, age: 150 },\n    { id: 7, lastName: "Clifford", firstName: "Ferrara", age: 44 },\n    { id: 8, lastName: "Frances", firstName: "Rossini", age: 36 },\n    { id: 9, lastName: "Roxie", firstName: "Harvey", age: 65 },\n  ];\n}',
};

export function ApiReturnTypeCodeEditorModal({
  title = "Expression",
  code: initCode,
  apiResponseType: initApiResponseType = "text",
  minLines = 18,
  formSchema,
  onSave,
  ...modalProps
}: ApiReturnTypeCodeEditorModalProps) {
  const [code, setCode] = useState(initCode ?? "");
  const [apiResponseType, setApiResponseType] =
    useState<ApiResponseType>(initApiResponseType);
  const [codeError, setCodeError] = useState<string | undefined>(undefined);
  const { validateReference } = useCodeBuilder({ formSchema });

  const codeCacheRef = useRef<Record<ApiResponseType, string>>({
    text: initApiResponseType === "text" ? (initCode ?? "") : "",
    richText: initApiResponseType === "richText" ? (initCode ?? "") : "",
    grid: initApiResponseType === "grid" ? (initCode ?? "") : "",
  });

  const handleCodeChange = useCallback(
    (value: string) => {
      setCode(value);
      codeCacheRef.current[apiResponseType] = value;
    },
    [apiResponseType],
  );

  const topContent = useMemo(
    () => (
      <div className="flex flex-col gap-2.5 w-full">
        <div className="text-dark text-base font-medium">
          Response Support Type
        </div>
        <DropdownSelect
          value={apiResponseType}
          options={responseTypeOptions.map((option) => ({
            ...option,
            key: option.value,
          }))}
          onChange={(val: ApiResponseType) => {
            codeCacheRef.current[apiResponseType] = code;
            setApiResponseType(val);
            const cached = codeCacheRef.current[val];
            setCode(cached || responseTypeTemplates[val]);
          }}
          placeholder="Select return type"
        />
      </div>
    ),
    [apiResponseType, code],
  );

  const checkCode = () => {
    const result = validateReference(code);
    if (!result.isValid) {
      setCodeError(result.errors[0]);
      return;
    }

    setCodeError(undefined);
    onSave?.(code, apiResponseType);
    modalProps.close();
  };

  return (
    <BaseCodeEditorModal
      {...modalProps}
      title={title}
      code={code}
      onCodeChange={handleCodeChange}
      minLines={minLines}
      placeholder={"function getData() {\n  return '';\n}"}
      codeError={codeError}
      topContent={topContent}
      onCancel={modalProps.close}
      onConfirm={checkCode}
    />
  );
}
