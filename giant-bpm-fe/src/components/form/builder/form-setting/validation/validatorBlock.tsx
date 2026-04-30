import CodeEditButton from "@ui/button/code-edit-button";
import Collapse from "@ui/collapse";
import { TrashIcon } from "@/components/icons";
import { FormSetting } from "@/types/form-builder";
import { getListendField } from "@/utils/expression";

type Validator = FormSetting["validation"]["validators"][number];

type Props = {
  index: number;
  validator: Validator;
  onUpdate: (next: Validator) => void;
  onRemove: () => void;
};

export default function ValidatorBlock({
  index,
  validator,
  onUpdate,
  onRemove,
}: Props) {
  return (
    <Collapse
      header={
        <div className="flex-1 flex items-center gap-2 h-12">
          <div className="w-5 h-5 bg-gray-100 rounded-full flex items-center justify-center">
            <span className="text-gray-500 text-xs font-medium">
              {index + 1}
            </span>
          </div>
          <div className="flex-1 text-gray-900 text-base font-medium line-clamp-1">
            Validation
          </div>
        </div>
      }
      actions={
        <span
          onClick={onRemove}
          className="rounded p-1 text-slate-400 hover:text-slate-600"
          aria-label="Remove validation"
        >
          <TrashIcon className="h-6 w-6" />
        </span>
      }
      className="w-full"
      contentClassName="p-0"
    >
      <div className="flex flex-col gap-3 p-3">
        <CodeEditButton
          variant="validation"
          value={validator.code ?? "function validation() {\n return true;\n}"}
          trigger={validator.code}
          isApi={validator.isApi}
          showDescription
          requireErrorMessage
          showApiToggle
          onSave={(code, description, errorMessage, isApi) =>
            onUpdate({
              ...validator,
              code,
              description,
              errorMessage: errorMessage ?? "Validation failed",
              listenFieldIds: getListendField(code),
              isApi,
            })
          }
          description={validator.description}
          errorMessage={validator.errorMessage ?? "Validation failed."}
        />
      </div>
      {(validator.description || validator.errorMessage) && (
        <div className="rounded-b-md bg-gray-50 p-3 space-y-3">
          {validator.description && (
            <div className="space-y-1">
              <div className="text-dark text-sm font-medium">Description</div>
              <div className="text-secondary-text text-sm font-medium">
                {validator.description}
              </div>
            </div>
          )}
          {validator.errorMessage && (
            <div className="space-y-1">
              <div className="text-dark text-sm font-medium">Error Message</div>
              <div className="text-secondary-text text-sm font-medium">
                {validator.errorMessage}
              </div>
            </div>
          )}
        </div>
      )}
    </Collapse>
  );
}
