import {
  InterpreterEntities,
  useInterpreterStore,
} from "@coltorapps/builder-react";
import { Button } from "./button";
import { useTranslation } from "react-i18next";
import { FormDefinition, User } from "@/types/domain";
import { InterpreterStoreData, Schema } from "@coltorapps/builder";
import { basicFormBuilder } from "../form/builder/definition";
import useValidatorStore from "@/hooks/useValidatorStore";
import { useToast } from "./toast";
import {
  Dispatch,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useCodeHelper } from "@/hooks/useCode/useCodeHelper";
import { usePreloadMasterDataForExpressions } from "@/hooks/useMasterData";
import { Application } from "@/types/application";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import {
  interpreterStoreAtom,
  runtimeApplicationAtom,
  selectedApplicantAtom,
  userAtom,
} from "@/store";
import UserSelect from "./select/user-select";
import {
  createVisibleEntityComponents,
  getHiddenEntityIds,
} from "@/utils/form-visibility";
import {
  buildZodErrors,
  getDynamicRequiredErrors,
} from "@/utils/dynamic-status-validation";

type Props = {
  form: Partial<FormDefinition>;
  formSchema: Schema<typeof basicFormBuilder>;
  onSave: (
    values: InterpreterStoreData<typeof basicFormBuilder>,
    isDirty?: boolean,
  ) => void;
  onSaveDraft: (
    values: InterpreterStoreData<typeof basicFormBuilder>,
    isDirty?: boolean,
  ) => void;
  isDirty?: boolean;
  setIsDirty?: Dispatch<SetStateAction<boolean>>;
  isSubmitting?: boolean;
  initialData?: Record<string, any>;
  application?: Application;
  onApplicantChange?: (user: User | null) => void;
};
/**
 * Hidden fields stay in the interpreter schema so expressions and datasource
 * filters can still reference their values, but they are skipped at render time.
 *
 */
export default function ApplicationForm({
  form,
  formSchema,
  isSubmitting = false,
  onSave,
  onSaveDraft,
  isDirty,
  setIsDirty,
  initialData,
  application,
  onApplicantChange,
}: Props) {
  const { t } = useTranslation();
  const {
    executeAllRegistry,
    executeAllLocalValidator,
    executeFormValidator,
    initiateValidatorStore,
  } = useValidatorStore();
  const { toast } = useToast();
  const initialDataRef = useRef<string | null>(null);
  const stableInitialData = useMemo(() => initialData ?? {}, [initialData]);
  const currentUser = useAtomValue(userAtom);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useAtom(
    selectedApplicantAtom,
  );

  const hiddenEntityIds = useMemo(
    () => getHiddenEntityIds(formSchema),
    [formSchema],
  );

  const renderableEntityComponents = useMemo(
    () => createVisibleEntityComponents(hiddenEntityIds),
    [hiddenEntityIds],
  );

  const setIStore = useSetAtom(interpreterStoreAtom);
  const setRuntimeApplication = useSetAtom(runtimeApplicationAtom);
  const isBusy = isSubmitting || isValidating;

  const { getCompiledSchema, executeCode } = useCodeHelper({
    formSchema,
    formData: stableInitialData,
    application,
  });
  const { cache: expressionMasterDataCache } =
    usePreloadMasterDataForExpressions(formSchema);

  const compiledSchema = useMemo(
    () => getCompiledSchema(),
    [getCompiledSchema, expressionMasterDataCache],
  );

  const interpreterStore = useInterpreterStore(
    basicFormBuilder,
    compiledSchema,
    { initialData: stableInitialData },
  );

  interpreterStore.getData();

  useEffect(() => {
    initiateValidatorStore(compiledSchema);
  }, [form.schema]);

  useEffect(() => {
    setIStore((prev) => (prev === interpreterStore ? prev : interpreterStore));

    console.debug("setisotre", {
      interpreterStore: interpreterStore.schema,
      compiledSchema,
    });
  }, [interpreterStore, setIStore]);

  useEffect(() => {
    setRuntimeApplication(application);
  }, [application, setRuntimeApplication]);

  useEffect(() => {
    setSelectedApplicant(currentUser);
  }, [setSelectedApplicant, currentUser]);

  useEffect(() => {
    if (initialDataRef.current === null) {
      initialDataRef.current = JSON.stringify(
        interpreterStore.getEntitiesValues(),
      );
    }

    // setIStore(interpreterStore);

    const unsubscribe = interpreterStore.subscribe((_data, events) => {
      const currentData = interpreterStore.getEntitiesValues();
      const nextDirty = JSON.stringify(currentData) !== initialDataRef.current;
      setIsDirty?.((prev) => (prev === nextDirty ? prev : nextDirty));

      events.forEach((event) => {
        if (event.name === "EntityValueUpdated") {
          console.debug(event.payload.entityId);
          interpreterStore.validateEntityValue(event.payload.entityId);
        }
      });
    });

    return unsubscribe;
  }, [interpreterStore]);

  async function handleSubmit() {
    if (isValidating || isSubmitting) return;

    setIsValidating(true);
    try {
      const result = await interpreterStore.validateEntitiesValues();
      const data = interpreterStore.getData();

      const registryErrors = await executeAllRegistry(
        data.entitiesValues,
        interpreterStore.schema,
      );
      const localErrors = await executeAllLocalValidator(data.entitiesValues);
      const formErrors = await executeFormValidator();
      const dynamicRequiredErrors = getDynamicRequiredErrors({
        schema: interpreterStore.schema,
        values: data.entitiesValues,
        executeCode,
      });

      console.debug({ localErrors });

      const mergedErrors: Record<string, string> = {
        ...localErrors,
        ...registryErrors,
        ...dynamicRequiredErrors,
      };
      const hasEntityErrors = Object.keys(mergedErrors).length > 0;
      const hasFormErrors = Object.keys(formErrors).length > 0;

      if (hasEntityErrors) {
        interpreterStore.setEntitiesErrors(buildZodErrors(mergedErrors));
      }

      if (hasFormErrors) {
        const formErrorMessage = Object.values(formErrors)[0];
        toast({
          variant: "destructive",
          title: t("toast.validation_failed"),
          description: formErrorMessage ?? t("toast.fill_out_form_correctly"),
        });
      }

      if (result.success && !hasEntityErrors && !hasFormErrors) {
        onSave(interpreterStore.getData(), isDirty);
        return;
      }

      if (!result.success && !hasEntityErrors && !hasFormErrors) {
        console.warn(result);
        toast({
          variant: "destructive",
          title: t("toast.validation_failed"),
          description: t("toast.fill_out_form_correctly"),
        });
      }
    } finally {
      setIsValidating(false);
    }
  }

  const applicantSource = form.applicantSource ?? "selection";

  return (
    <>
      {form.description && (
        <p className="text-gray-600 mb-6 whitespace-pre-wrap">
          {form.description}
        </p>
      )}
      <>
        <div className="flex gap-4">
          {/* Applicant — user search picker */}
          <div className="flex-1 flex flex-col gap-2.5">
            <p className="text-base font-medium text-gray-900">
              {t("application_page.applicant")}
            </p>
            {applicantSource === "selection" ? (
              <UserSelect
                value={selectedApplicant || undefined}
                onValueChange={(_id, user) => {
                  setSelectedApplicant(user ?? null);
                  onApplicantChange?.(user ?? null);
                }}
                placeholder={t("application_page.applicant_placeholder")}
              />
            ) : (
              <div className="flex h-12 items-center px-5 py-3 bg-gray-100 border border-stroke rounded-md">
                <span className="flex-1 text-base text-gray-900">
                  {currentUser?.name}
                </span>
              </div>
            )}
          </div>

          {/* Submitter — readonly, current user */}
          <div className="flex-1 flex flex-col gap-2.5">
            <p className="text-base font-medium text-gray-900">
              {t("application_page.submitter")}
            </p>
            <div className="flex h-12 items-center px-5 py-3 bg-gray-100 border border-stroke rounded-md">
              <span className="flex-1 text-base text-gray-900">
                {currentUser?.name}
              </span>
            </div>
          </div>
        </div>
        <hr className="w-full my-6 border-stroke" />
      </>
      <form
        onSubmit={(e) => {
          e.preventDefault();
        }}
        onKeyDownCapture={(e) => {
          if (e.key !== "Enter") return;

          const target = e.target as HTMLElement | null;
          if (!target) return;

          if (target.tagName.toLowerCase() === "textarea") return;

          e.preventDefault();
        }}
        className="space-y-6"
      >
        <InterpreterEntities
          interpreterStore={interpreterStore}
          components={renderableEntityComponents}
        />
        <div className="flex pt-4 gap-3 justify-between flex-col md:flex-row">
          <div className="flex flex-row justify-between w-full gap-3">
            <Button
              variant={"destructive"}
              className="md:w-fit w-full"
              type="button"
              disabled
            >
              {t("buttons.discard")}
            </Button>
            <Button
              variant={"secondary"}
              className="md:w-fit w-full"
              onClick={() => {
                onSaveDraft(interpreterStore.getData(), isDirty);
              }}
              type="button"
              disabled={!isDirty || isBusy}
            >
              Save
            </Button>
          </div>
          <div className="flex flex-row gap-3">
            <Button
              type="submit"
              className="md:w-fit w-full"
              disabled={!isDirty || isBusy}
              loading={isBusy}
              onClick={handleSubmit}
            >
              {isSubmitting ? t("buttons.saving") : t("buttons.submit")}
            </Button>
          </div>
        </div>
      </form>
    </>
    // </div>
    // </div>
  );
}
