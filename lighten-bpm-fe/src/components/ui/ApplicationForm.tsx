import {
  InterpreterEntities,
  useInterpreterStore,
} from "@coltorapps/builder-react";
import { Button } from "./button";
import { useTranslation } from "react-i18next";
import { FormDefinition, User } from "@/types/domain";
import { InterpreterStoreData, Schema } from "@coltorapps/builder";
import { basicFormBuilder } from "../form/builder/definition";
import { entitiesComponents } from "@/const/form-builder";
import useValidatorStore from "@/hooks/useValidatorStore";
import { ZodError } from "zod";
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
 * This form will check the passed-in schema and remove all the component that has (hide: true) attribute
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
  const [selectedApplicant, setSelectedApplicant] = useAtom(selectedApplicantAtom)

  const visibleFormSchema = useMemo(() => {
    const entities = formSchema?.entities ?? {};
    const root = formSchema?.root ?? [];
    const hiddenEntityIds = new Set<string>();

    Object.entries(entities).forEach(([entityId, entity]) => {
      const attributes = (entity?.attributes ?? {}) as Record<string, unknown>;
      if (attributes.hide === true) {
        hiddenEntityIds.add(entityId);
      }
    });

    let changed = true;
    while (changed) {
      changed = false;
      Object.entries(entities).forEach(([entityId, entity]) => {
        const parentId = (entity as { parentId?: string }).parentId;
        if (
          parentId &&
          hiddenEntityIds.has(parentId) &&
          !hiddenEntityIds.has(entityId)
        ) {
          hiddenEntityIds.add(entityId);
          changed = true;
        }
      });
    }

    if (hiddenEntityIds.size === 0) {
      return formSchema;
    }

    const nextEntities = Object.fromEntries(
      Object.entries(entities).filter(([entityId]) => !hiddenEntityIds.has(entityId)),
    );
    const nextRoot = root.filter((entityId) => !hiddenEntityIds.has(entityId));

    // Remove dangling child references from remaining entities.
    Object.values(nextEntities).forEach((entity) => {
      const mutableEntity = entity as {
        children?: string[];
        attributes?: Record<string, unknown>;
      };

      if (Array.isArray(mutableEntity.children)) {
        mutableEntity.children = mutableEntity.children.filter(
          (childId) => childId in nextEntities,
        );
      }

      const attributes = mutableEntity.attributes;
      if (attributes && typeof attributes === "object") {
        const slotMapping = attributes.slotMapping;
        if (slotMapping && typeof slotMapping === "object") {
          attributes.slotMapping = Object.fromEntries(
            Object.entries(slotMapping as Record<string, unknown>).filter(
              ([childId]) => childId in nextEntities,
            ),
          );
        }
      }
    });

    return {
      ...formSchema,
      entities: nextEntities,
      root: nextRoot,
    };
  }, [formSchema]);

  const setIStore = useSetAtom(interpreterStoreAtom);
  const setRuntimeApplication = useSetAtom(runtimeApplicationAtom);
  const isBusy = isSubmitting || isValidating;

  const { getCompiledSchema } = useCodeHelper({
    formSchema: visibleFormSchema,
    formData: stableInitialData,
    application,
  });
  const { cache: expressionMasterDataCache } =
    usePreloadMasterDataForExpressions(visibleFormSchema);

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
  }, [setSelectedApplicant, currentUser])

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

      console.debug({ localErrors });

      const mergedErrors: Record<string, string> = {
        ...localErrors,
        ...registryErrors,
      };
      const hasEntityErrors = Object.keys(mergedErrors).length > 0;
      const hasFormErrors = Object.keys(formErrors).length > 0;

      if (hasEntityErrors) {
        const entitiesErrors = Object.entries(mergedErrors).reduce(
          (acc, [entityId, message]) => {
            acc[entityId] = new ZodError([
              { code: "custom", message, path: [] },
            ]);
            return acc;
          },
          {} as Record<string, ZodError>,
        );
        interpreterStore.setEntitiesErrors(entitiesErrors);
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
          components={entitiesComponents}
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
