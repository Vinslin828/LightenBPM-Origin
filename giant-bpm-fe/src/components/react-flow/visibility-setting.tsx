import { FormDefinition } from "@/types/domain";
import { VisibilityRule, VisibilityAction } from "@/types/flow";
import { useModal } from "@/hooks/useModal";
import VisibilityModal from "../modals/visibility-modal";
import { FormIcon } from "@/components/icons";
import { ReactNode, useMemo } from "react";
import {
  buildDefaultVisibilityRulesBySource,
  normalizeVisibilityRules,
  resolveEffectiveVisibilityRules,
  VisibilityRuleSource,
} from "@/const/flow";

type Props = {
  value: VisibilityRule[];
  onChange: (next: VisibilityRule[]) => void;
  formSchema?: FormDefinition["schema"];
  formName?: string;
  header?: ReactNode;
  defaultSource: VisibilityRuleSource;
};

export default function VisibilitySetting({
  value,
  onChange,
  formSchema,
  formName,
  header,
  defaultSource,
}: Props) {
  const modal = useModal();
  const normalizedValue = useMemo(
    () => normalizeVisibilityRules(value),
    [value],
  );
  const fallbackRules = useMemo(() => {
    if (normalizedValue.length > 0) {
      return [];
    }

    return buildDefaultVisibilityRulesBySource(formSchema, defaultSource);
  }, [normalizedValue, formSchema, defaultSource]);
  const effectiveRules = useMemo(() => {
    return normalizedValue.length > 0
      ? normalizedValue
      : resolveEffectiveVisibilityRules(value, formSchema, defaultSource);
  }, [normalizedValue, value, formSchema, defaultSource]);
  const hiddenComponents = new Set(
    effectiveRules
      .filter((rule) => rule.actions?.includes(VisibilityAction.HIDE))
      .map((rule) => rule.componentName),
  ).size;

  if (!formSchema) {
    return (
      <div className="rounded-md border border-stroke bg-white px-3 py-2.5 text-sm text-secondary-text">
        Form schema is unavailable. Bind a form first to configure visibility.
      </div>
    );
  }

  return (
    <>
      <VisibilityModal
        {...modal}
        formName={formName ?? "Linked form"}
        formSchema={formSchema}
        initialRules={effectiveRules}
        fallbackRules={fallbackRules}
        useSchemaDefaults={normalizedValue.length === 0}
        defaultSource={defaultSource}
        onSave={onChange}
        header={header}
      />

      <div className="self-stretch px-3 py-2.5 bg-white rounded-md border-1 border-zinc-200 inline-flex flex-col justify-start items-start gap-2">
        <div className="inline-flex justify-start items-center gap-2">
          <FormIcon className="w-6 h-6 text-gray-500" />
          <div className="justify-start text-gray-900 text-base font-medium leading-6">
            {formName ?? "Linked form"}
          </div>
        </div>
        {hiddenComponents > 0 ? (
          <div className="justify-start text-gray-500 text-base font-medium leading-6">
            {hiddenComponents} hide components
          </div>
        ) : (
          <div className="justify-start text-gray-500 text-base font-medium leading-6">
            All components are visible
          </div>
        )}
        <button
          type="button"
          className="self-stretch text-left justify-start text-giant-blue text-base font-medium underline leading-6"
          onClick={modal.open}
        >
          Click here to configure
        </button>
      </div>
    </>
  );
}
