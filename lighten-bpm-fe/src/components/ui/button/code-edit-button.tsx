import { ReactNode } from "react";
import { useModal } from "@/hooks/useModal";
import { ExpressionIcon } from "../../icons";
import {
  ApiReturnTypeCodeEditorModal,
  ReferenceCodeEditorModal,
  ValidationCodeEditorModal,
} from "@/components/modals/code-editor";
import {
  CodeEditButtonConfig,
  CodeEditOnSave,
} from "@/hooks/useCode/types";

type Props = {
  value?: string;
  trigger?: ReactNode;
  title?: string;
  minLines?: number;
  onSave: CodeEditOnSave;
} & CodeEditButtonConfig;

export default function CodeEditButton({
  title,
  value,
  trigger,
  minLines,
  onSave,
  ...config
}: Props) {
  const modalProps = useModal();

  return (
    <>
      {config.variant === "reference" && (
        <ReferenceCodeEditorModal
          {...modalProps}
          key={value}
          title={title}
          code={value}
          minLines={minLines}
          formSchema={config.formSchema}
          onSave={(nextValue) => onSave(nextValue)}
        />
      )}

      {config.variant === "validation" && (
        <ValidationCodeEditorModal
          {...modalProps}
          key={value}
          title={title}
          code={value}
          minLines={minLines}
          formSchema={config.formSchema}
          description={config.description}
          errorMessage={config.errorMessage}
          isApi={config.isApi}
          contextPreset={config.contextPreset}
          validationReturnType={config.validationReturnType}
          showDescription={config.showDescription}
          requireErrorMessage={config.requireErrorMessage}
          showApiToggle={config.showApiToggle}
          onSave={(nextValue, description, errorMessage, isApi) =>
            onSave(nextValue, description, errorMessage, isApi)
          }
        />
      )}

      {config.variant === "apiReturnType" && (
        <ApiReturnTypeCodeEditorModal
          {...modalProps}
          key={value}
          title={title}
          code={value}
          minLines={minLines}
          formSchema={config.formSchema}
          apiResponseType={config.apiResponseType}
          onSave={(nextValue, apiResponseType) =>
            onSave(nextValue, undefined, undefined, undefined, apiResponseType)
          }
        />
      )}

      <button
        onClick={() => modalProps.open()}
        className="flex flex-row gap-2.5 h-10.5 items-center cursor-pointer max-w-full"
      >
        <ExpressionIcon className="text-primary-text h-5 min-w-5" />
        <div className="text-lighten-blue font-medium truncate">
          {!!trigger ? trigger : "Click to open code editor"}
        </div>
      </button>
    </>
  );
}
