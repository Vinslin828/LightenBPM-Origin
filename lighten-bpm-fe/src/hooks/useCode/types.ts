import { FormSchema } from "@/types/domain";

export type ValidationReturnType = "boolean" | "validationObject" | "any";

export type ApiResponseType = "text" | "richText" | "grid";

export type CodeValidationContext = Record<string, unknown> & {
  value?: unknown;
};

export type CodeEditButtonVariant = "reference" | "validation" | "apiReturnType";

export type CodeEditOnSave = (
  value: string,
  description?: string,
  errorMessage?: string,
  isApi?: boolean,
  apiResponseType?: ApiResponseType,
) => void;

export type ReferenceCodeEditorConfig = {
  variant: "reference";
  formSchema?: FormSchema;
};

export type ValidationCodeEditorConfig = {
  variant: "validation";
  formSchema?: FormSchema;
  isApi?: boolean;
  description?: string;
  errorMessage?: string;
  contextPreset?: CodeValidationContext;
  validationReturnType?: ValidationReturnType | ValidationReturnType[];
  showDescription?: boolean;
  requireErrorMessage?: boolean;
  showApiToggle?: boolean;
};

export type ApiReturnTypeCodeEditorConfig = {
  variant: "apiReturnType";
  formSchema?: FormSchema;
  apiResponseType?: ApiResponseType;
};

export type CodeEditButtonConfig =
  | ReferenceCodeEditorConfig
  | ValidationCodeEditorConfig
  | ApiReturnTypeCodeEditorConfig;
