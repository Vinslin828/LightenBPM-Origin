import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BackIcon, EditIcon, ExportIcon } from "@/components/icons";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BasicFormBuilder } from "@/components/form/builder/component";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "@coltorapps/builder-react";
import { basicFormBuilder } from "@/components/form/builder/definition";
import {
  getDefaultAttributes,
  hydrateSchemaWithRequiredDefaults,
  tabItems,
} from "@/const/form-builder";
import { useToast } from "@ui/toast";
import { EntityKey, FormStatus } from "@/types/form-builder";
import TabButton from "@ui/button/tab-button";
import { SchemaGenerationTab } from "@/components/form/builder/schema-generation-tab";
import { useAtom } from "jotai";
import {
  builderStoreAtom,
  formSettingAtom,
  selectedGridHeaderAtom,
  sidebarCollapsedAtom,
  activeEntityIdAtom,
} from "@/store";
import EditFormModal from "@/components/modals/form-metadata-modal";
import ExportFormModal from "@/components/modals/export-form-modal";
import { useModal } from "@/hooks/useModal";
import { useForm, useUpdateForm } from "@/hooks/useForm";
import {
  EntitiesValues,
  InterpreterStoreData,
  validateSchema,
} from "@coltorapps/builder";
import FormNotFoundPage from "./FormNotFoundPage";
import { FormDefinition } from "@/types/domain";
import { ZodError } from "zod";
import useValidatorStore from "@/hooks/useValidatorStore";
import { useValidateForm } from "@/hooks/useValidator";
import { parseFormData } from "@/utils/parser";
import ApplicationForm from "@ui/ApplicationForm";
import LanguageEditor from "@/components/form/builder/language-editor";

const formBuilderTabPrefix = "form_builder.tabs";
const DUPLICATE_FIELD_NAME_ERROR_FLAG = Symbol("DuplicateFieldNameError");
const DIRTY_SNAPSHOT_VERSION = "v2";

type DuplicateFieldNameError = ZodError & {
  [DUPLICATE_FIELD_NAME_ERROR_FLAG]: true;
};

function createDuplicateFieldNameError(
  message: string,
): DuplicateFieldNameError {
  const error = new ZodError([
    {
      code: "custom",
      message,
      path: [],
    },
  ]) as DuplicateFieldNameError;
  error[DUPLICATE_FIELD_NAME_ERROR_FLAG] = true;
  return error;
}

function isDuplicateFieldNameError(
  error: unknown,
): error is DuplicateFieldNameError {
  if (!error || typeof error !== "object") {
    return false;
  }

  return (
    DUPLICATE_FIELD_NAME_ERROR_FLAG in (error as Record<PropertyKey, unknown>)
  );
}

function toComponentLabel(type?: string) {
  if (!type) return "form";
  if (type === EntityKey.expressionField) return "Expression";
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}`;
}

function createFormEditorSnapshot(input: {
  schema?: FormDefinition["schema"];
  validation?: FormDefinition["validation"];
  defaultLang?: string;
  translationLangs?: string[];
  labelTranslations?: Record<string, Record<string, string>>;
}) {
  return JSON.stringify({
    schema: input.schema
      ? hydrateSchemaWithRequiredDefaults(input.schema)
      : undefined,
    validation: input.validation ?? {},
    defaultLang: input.defaultLang ?? "en",
    translationLangs: input.translationLangs ?? [],
    labelTranslations: input.labelTranslations ?? {},
  });
}

export const EditFormPage = () => {
  const { formId: formId } = useParams<{ formId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { open, isOpen, close } = useModal();
  const {
    open: openExport,
    isOpen: isExportOpen,
    close: closeExport,
  } = useModal();
  const [valuesJson, setValuesJson] = useState<
    EntitiesValues<typeof basicFormBuilder>
  >({});
  const [activeTab, setActiveTab] = useState<string>("form-builder");
  const [builderRevision, setBuilderRevision] = useState(0);
  const [builderSyncedFormKey, setBuilderSyncedFormKey] = useState<
    string | null
  >(null);
  const [settingsSyncedFormKey, setSettingsSyncedFormKey] = useState<
    string | null
  >(null);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);
  const syncedFormKeyRef = useRef<string | null>(null);
  const {
    form,
    isLoading: isFormLoading,
    refetch: refetchForm,
  } = useForm(formId);
  const currentFormKey = useMemo(
    () =>
      form ? `${DIRTY_SNAPSHOT_VERSION}:${form.id}:${form.revisionId}` : null,
    [form?.id, form?.revisionId],
  );
  const { mutate: updateForm, isPending: isUpdating } = useUpdateForm();
  const { mutateAsync: validateForm } = useValidateForm();
  const { initiateValidatorStore, removeValidator } = useValidatorStore();
  const [, setBstore] = useAtom(builderStoreAtom);
  const [formSetting, setFormSetting] = useAtom(formSettingAtom);
  const [, setSelectedGridHeader] = useAtom(selectedGridHeaderAtom);
  const [activeEntityId, setActiveEntityIdState] = useAtom(activeEntityIdAtom);

  const setActiveEntityId: Dispatch<SetStateAction<string | null>> =
    useCallback(
      (nextValue) => {
        setActiveEntityIdState((prevValue) => {
          const resolvedNextValue =
            typeof nextValue === "function"
              ? (nextValue as (value: string | null) => string | null)(
                  prevValue,
                )
              : nextValue;

          if (resolvedNextValue !== prevValue) {
            setSelectedGridHeader(null);
          }

          return resolvedNextValue;
        });
      },
      [setSelectedGridHeader, setActiveEntityIdState],
    );

  const builderStore = useBuilderStore(basicFormBuilder, {
    events: {
      onEntityAdded(payload) {
        setBuilderRevision((revision) => revision + 1);
        setActiveEntityId(payload.entity.id);
      },
      onEntityDeleted(payload) {
        setBuilderRevision((revision) => revision + 1);
        const rootEntityId = builderStore.getData().schema.root[0];

        if (payload.entity.id === activeEntityId && rootEntityId) {
          setActiveEntityId(rootEntityId);
        } else {
          setActiveEntityId(null);
        }
        removeValidator(payload.entity.id);
      },
      onEntityAttributeUpdated(payload) {
        setBuilderRevision((revision) => revision + 1);
        void builderStore.validateEntityAttribute(
          payload.entity.id,
          payload.attributeName,
        );
      },
    },
  });

  // Effect 1: sync the builder store whenever the saved schema changes
  useEffect(() => {
    if (!form?.schema || !currentFormKey) return;
    const hydratedSchema = hydrateSchemaWithRequiredDefaults(form.schema);
    validateSchema(hydratedSchema, basicFormBuilder)
      .then(() => {
        console.debug("[schema-sync] hydrated schema", hydratedSchema);
        initiateValidatorStore(hydratedSchema);
        builderStore.setData({
          schema: hydratedSchema,
          entitiesAttributesErrors: {},
          schemaError: undefined,
        });
        setBuilderRevision((revision) => revision + 1);
        setBuilderSyncedFormKey(currentFormKey);
        const rootEntityId = builderStore.getData().schema.root[0];
        setActiveEntityId(rootEntityId ?? null);
      })
      .catch((error) => {
        console.error("[schema-sync] validation failed", error);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.schema, currentFormKey, builderStore]);

  // Effect 2: sync formSetting from the backend whenever the form's translation
  // data changes. This runs on initial page load (hard refresh) and whenever the
  // server revision changes. We deliberately watch individual scalar fields so
  // that structural sharing in React Query doesn't mask a changed value.
  useEffect(() => {
    if (!form?.validation || !currentFormKey) return;
    console.log("[EditFormPage] syncing formSetting →", {
      revisionId: form.revisionId,
      defaultLang: form.defaultLang,
      translationLangs: form.translationLangs,
      labelTranslationCount: Object.keys(form.labelTranslations ?? {}).length,
    });
    setFormSetting({
      validation: form.validation,
      defaultLang: form.defaultLang ?? "en",
      translationLangs: form.translationLangs ?? [],
      labelTranslations: form.labelTranslations ?? {},
    });
    setSettingsSyncedFormKey(currentFormKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentFormKey,
    form?.revisionId,
    form?.translationLangs,
    form?.defaultLang,
    form?.labelTranslations,
    form?.validation,
  ]);

  useEffect(() => {
    setBstore(builderStore);
  }, [builderStore]);

  // default collapse sidebar when entering this page
  const [, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom);
  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  const currentSnapshot = useMemo(
    () =>
      createFormEditorSnapshot({
        schema: builderStore.getData().schema,
        validation: formSetting.validation,
        defaultLang: formSetting.defaultLang,
        translationLangs: formSetting.translationLangs,
        labelTranslations: formSetting.labelTranslations,
      }),
    [builderStore, builderRevision, formSetting],
  );

  useEffect(() => {
    if (
      !currentFormKey ||
      builderSyncedFormKey !== currentFormKey ||
      settingsSyncedFormKey !== currentFormKey
    ) {
      return;
    }

    if (syncedFormKeyRef.current === currentFormKey) {
      return;
    }

    syncedFormKeyRef.current = currentFormKey;
    setSavedSnapshot(currentSnapshot);
  }, [
    currentFormKey,
    builderSyncedFormKey,
    settingsSyncedFormKey,
    currentSnapshot,
  ]);

  const isSyncedToCurrentForm =
    Boolean(currentFormKey) &&
    builderSyncedFormKey === currentFormKey &&
    settingsSyncedFormKey === currentFormKey;

  const isDirty =
    Boolean(savedSnapshot) &&
    isSyncedToCurrentForm &&
    currentSnapshot !== savedSnapshot;

  const unsavedChangesMessage = t("toast.unsaved_form_changes_confirm");
  const currentPathRef = useRef(
    `${location.pathname}${location.search}${location.hash}`,
  );

  useEffect(() => {
    currentPathRef.current = `${location.pathname}${location.search}${location.hash}`;
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!isDirty || event.defaultPrevented) {
        return;
      }

      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }

      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("href")?.startsWith("#")
      ) {
        return;
      }

      const targetUrl = new URL(anchor.href, window.location.href);
      if (targetUrl.origin !== window.location.origin) {
        return;
      }

      const nextPath = `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
      if (nextPath === currentPathRef.current) {
        return;
      }

      event.preventDefault();
      if (window.confirm(unsavedChangesMessage)) {
        navigate(nextPath);
      }
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [isDirty, navigate, unsavedChangesMessage]);

  useEffect(() => {
    const handlePopState = () => {
      if (!isDirty) {
        return;
      }

      if (!window.confirm(unsavedChangesMessage)) {
        window.history.pushState(null, "", currentPathRef.current);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isDirty, unsavedChangesMessage]);

  const navigateWithDirtyCheck = useCallback(
    (path: string) => {
      if (!isDirty || window.confirm(unsavedChangesMessage)) {
        navigate(path);
      }
    },
    [isDirty, navigate, unsavedChangesMessage],
  );

  // Must be defined before any early returns to satisfy Rules of Hooks.
  // The callback body safely uses form! — it's only ever called after the
  // early-return guards have confirmed form is non-null.
  //
  // `overrides` lets callers (e.g. LanguageEditor) pass the freshly-computed
  // state values synchronously, bypassing React's async setFormSetting batching.
  // Without this, a save triggered immediately after setFormSetting would still
  // read the previous formSetting from the closure (stale-closure problem).
  const handleSaveTranslations = useCallback(
    async (overrides?: {
      translationLangs?: string[];
      labelTranslations?: Record<string, Record<string, string>>;
    }) => {
      const savedSchema = hydrateSchemaWithRequiredDefaults(form!.schema);
      const currentSchema = builderStore.getData().schema;
      if (JSON.stringify(currentSchema) !== JSON.stringify(savedSchema)) {
        toast({
          variant: "destructive",
          title: t("toast.save_form_changes_before_translations"),
          description: t("toast.save_form_changes_before_translations_desc"),
        });
        throw new Error(
          "Form changes must be saved before saving translations.",
        );
      }

      const schemaValidationResult = await builderStore.validateSchema();
      if (!schemaValidationResult.success) {
        if (
          schemaValidationResult.reason.code === "InvalidEntitiesAttributes"
        ) {
          const firstInvalidEntityId = Object.keys(
            schemaValidationResult.reason.payload.entitiesAttributesErrors,
          )[0];
          if (builderStore.getSchema().entities[firstInvalidEntityId]) {
            setActiveEntityId(firstInvalidEntityId);
          }
        }

        toast({
          variant: "destructive",
          title: t("toast.save_form_changes_before_translations"),
          description: t("toast.save_form_changes_before_translations_desc"),
        });
        throw new Error(
          "Form changes must be saved before saving translations.",
        );
      }

      const effectiveSetting = { ...formSetting, ...overrides };
      const nextForm = {
        ...form!,
        validation: effectiveSetting.validation,
        defaultLang: effectiveSetting.defaultLang,
        translationLangs: effectiveSetting.translationLangs,
        labelTranslations: effectiveSetting.labelTranslations,
        schema: builderStore.getData().schema,
      };
      await new Promise<void>((resolve, reject) => {
        updateForm(nextForm, {
          onSuccess() {
            setSavedSnapshot(createFormEditorSnapshot(nextForm));
            resolve();
          },
          onError(err) {
            reject(err);
          },
        });
      });
    },
    [form, formSetting, builderStore, updateForm, setActiveEntityId, toast, t],
  );

  if (isFormLoading) {
    // TODO: loading page
    return <div>{t("loading")}</div>;
  }

  console.debug({ form });

  if (!form) {
    return <FormNotFoundPage />;
  }

  const handleTabChange = async (tabKey: string) => {
    if (tabKey === "preview" || tabKey === "schema-generation") {
      const result = await builderStore.validateSchema();
      // TODO: need to validate no duplicate field name here
      if (result.success) {
        setActiveEntityId(null);
        setActiveTab(tabKey);
        return;
      }
      let toastTitle = t("toast.fix_highlighted_errors");
      if (
        result.reason.code === "InvalidEntitiesAttributes" &&
        activeEntityId &&
        !result.reason.payload.entitiesAttributesErrors[activeEntityId]
      ) {
        const entityId = Object.keys(
          result.reason.payload.entitiesAttributesErrors,
        )[0];
        if (builderStore.getSchema().entities[entityId]) {
          setActiveEntityId(entityId);
        }

        const entityType = builderStore.getSchema().entities[entityId]?.type;
        const componentLabel = toComponentLabel(entityType);
        toastTitle = t("toast.fix_highlighted_errors_at_component", {
          component: componentLabel,
        });

        console.debug({ result });
      }
      console.debug({ result });
      toast({
        variant: "destructive",
        title: toastTitle,
      });
      console.debug({ result });
    } else {
      setActiveTab(tabKey);
    }
  };

  const handlePreviewSubmit = async (
    values: InterpreterStoreData<typeof basicFormBuilder>,
  ) => {
    console.debug("[EditFormPage] previewSubmit:start", {
      entityCount: Object.keys(values.entitiesValues ?? {}).length,
    });

    const isFormValidatorValid = await validateFormValidatorsBeforeSave(
      values.entitiesValues,
    );
    console.debug("[EditFormPage] previewSubmit:validatorResult", {
      isFormValidatorValid,
    });
    if (!isFormValidatorValid) {
      console.debug("[EditFormPage] previewSubmit:blocked-by-form-validator");
      return;
    }

    console.debug("[EditFormPage] previewSubmit:advance-to-schema-generation");
    setActiveTab("schema-generation");
    setValuesJson(values.entitiesValues);
    toast({
      variant: "success",
      title: t("toast.preview_submission_successful"),
    });
  };

  function renderTabContent() {
    switch (activeTab) {
      case "form-builder":
        return (
          <BasicFormBuilder
            builderStore={builderStore}
            activeEntityId={activeEntityId}
            setActiveEntityId={setActiveEntityId}
          />
        );
      case "preview":
        return (
          <>
            <div className="md:p-6 p-4 max-w-6xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
                <ApplicationForm
                  form={{
                    name: form?.name!,
                    description: form?.description ?? "",
                  }}
                  formSchema={builderStore.getSchema()}
                  onSave={handlePreviewSubmit}
                  onSaveDraft={() => {}}
                  isDirty={true}
                />
              </div>
            </div>
            {/* <FormPreview
              builderStore={builderStore}
              form={{ name: form?.name!, description: form?.description }}
              setActiveTab={setActiveTab}
              setValuesJson={setValuesJson}
            /> */}
          </>
        );
      case "language-editor":
        return <LanguageEditor onSave={handleSaveTranslations} />;
      case "schema-generation":
        return (
          <SchemaGenerationTab
            builderStore={builderStore}
            activeEntityId={activeEntityId}
            onEntityError={() => {}}
            valuesJson={valuesJson ?? {}}
          />
        );
      default:
        return <div className="p-6">Content for {activeTab}</div>;
    }
  }

  function validateFormFieldNames(form: FormDefinition) {
    const schema = builderStore.getData().schema ?? form.schema;
    const entities = schema?.entities ?? {};

    const nameMap = new Map<string, { ids: string[]; displayName: string }>();

    Object.entries(entities).forEach(([entityId, entity]) => {
      const rawName = (
        entity?.attributes as Record<string, unknown> | undefined
      )?.name;
      if (typeof rawName !== "string") {
        return;
      }

      const trimmedName = rawName.trim();
      if (!trimmedName) {
        return;
      }

      const normalizedKey = trimmedName.toLowerCase();
      const existing = nameMap.get(normalizedKey);
      if (existing) {
        existing.ids.push(entityId);
      } else {
        nameMap.set(normalizedKey, {
          ids: [entityId],
          displayName: trimmedName,
        });
      }
    });

    const duplicates = Array.from(nameMap.values()).filter(
      (entry) => entry.ids.length > 1,
    );

    const duplicateEntityIds = new Set<string>();
    duplicates.forEach((entry) => {
      entry.ids.forEach((id) => duplicateEntityIds.add(id));
    });

    const entitiesAttributesErrors = builderStore.getEntitiesAttributesErrors();
    Object.entries(entitiesAttributesErrors).forEach(
      ([entityId, attributeErrors]) => {
        if (duplicateEntityIds.has(entityId)) {
          return;
        }
        const attributeError = attributeErrors?.name;
        if (attributeError && isDuplicateFieldNameError(attributeError)) {
          builderStore.resetEntityAttributeError(entityId, "name");
        }
      },
    );

    if (!duplicateEntityIds.size) {
      return true;
    }

    duplicates.forEach(({ ids, displayName }) => {
      ids.forEach((entityId) => {
        const duplicateError = createDuplicateFieldNameError(
          t("form_builder.duplicate_field_name", { name: displayName }),
        );
        builderStore.setEntityAttributeError(entityId, "name", duplicateError);
      });
    });

    if (!duplicateEntityIds.has(activeEntityId ?? "")) {
      const firstDuplicateId = duplicateEntityIds.values().next().value;
      if (firstDuplicateId) {
        setActiveEntityId(firstDuplicateId);
      }
    }

    return false;
  }

  async function validateFormValidatorsBeforeSave(
    formData?: EntitiesValues<typeof basicFormBuilder>,
  ): Promise<boolean> {
    console.debug("[EditFormPage] validateFormValidators:start", {
      hasFormData: Boolean(formData),
      configuredValidatorCount: formSetting.validation.validators.length,
    });

    const apiFormValidators = formSetting.validation.validators
      .filter(
        (validator) =>
          validator.isApi &&
          typeof validator.code === "string" &&
          validator.code.trim() !== "",
      )
      .map((validator) => ({
        code: validator.code as string,
        errorMessage: validator.errorMessage ?? "Validation failed.",
      }));

    console.debug("[EditFormPage] validateFormValidators:apiValidators", {
      count: apiFormValidators.length,
    });

    if (apiFormValidators.length === 0) {
      console.debug(
        "[EditFormPage] validateFormValidators:skip-no-api-validators",
      );
      return true;
    }

    const payloadFormData = parseFormData(
      (formData ?? valuesJson ?? {}) as Record<string, unknown>,
      builderStore.getData().schema as FormDefinition["schema"],
    ).data;
    console.debug("[EditFormPage] validateFormValidators:payloadBuilt", {
      keys: Object.keys(payloadFormData ?? {}).length,
    });

    try {
      const response = await validateForm({
        codes: [],
        registryIds: [],
        formValidators: apiFormValidators,
        formData: payloadFormData,
      });
      const result = response.data;
      console.debug("[EditFormPage] validateFormValidators:response", {
        isValid: result?.isValid,
        errorCount: result?.errors?.length ?? 0,
      });
      if (!result?.isValid) {
        const message =
          result?.errors?.[0]?.message ??
          result?.message ??
          "Validation failed.";
        toast({
          variant: "destructive",
          title: t("toast.validation_failed"),
          description: message,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.debug("[EditFormPage] validateFormValidators:exception", {
        error,
      });
      const fallbackMessage = "Validation failed.";
      const backendMessage =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: unknown } }).response ===
          "object" &&
        (error as { response?: { data?: unknown } }).response !== null &&
        "data" in
          ((error as { response?: { data?: unknown } }).response as {
            data?: unknown;
          }) &&
        typeof (
          (error as { response?: { data?: { message?: unknown } } }).response
            ?.data as { message?: unknown }
        )?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : undefined;

      toast({
        variant: "destructive",
        title: t("toast.validation_failed"),
        description: backendMessage ?? fallbackMessage,
      });
      return false;
    }
  }

  async function saveAsPublished(form: FormDefinition) {
    const schemaValidationResult = await builderStore.validateSchema();
    if (!schemaValidationResult.success) {
      let toastTitle = t("toast.fix_highlighted_errors");
      if (
        schemaValidationResult.reason.code === "InvalidEntitiesAttributes" &&
        activeEntityId &&
        !schemaValidationResult.reason.payload.entitiesAttributesErrors[
          activeEntityId
        ]
      ) {
        const firstInvalidEntityId = Object.keys(
          schemaValidationResult.reason.payload.entitiesAttributesErrors,
        )[0];
        if (builderStore.getSchema().entities[firstInvalidEntityId]) {
          setActiveEntityId(firstInvalidEntityId);
        }

        const entityType =
          builderStore.getSchema().entities[firstInvalidEntityId]?.type;
        const componentLabel = toComponentLabel(entityType);
        toastTitle = t("toast.fix_highlighted_errors_at_component", {
          component: componentLabel,
        });
      }

      toast({
        variant: "destructive",
        title: toastTitle,
      });
      return;
    }

    if (!validateFormFieldNames(form)) {
      return;
    }
    const nextForm = {
      ...form,
      validation: formSetting.validation,
      defaultLang: formSetting.defaultLang,
      translationLangs: formSetting.translationLangs,
      labelTranslations: formSetting.labelTranslations,
      publishStatus: FormStatus.Published,
      schema: builderStore.getData().schema,
    };
    updateForm(nextForm, {
      onSuccess(data) {
        setSavedSnapshot(createFormEditorSnapshot(nextForm));
        void refetchForm();
        toast({ title: t("toast.form_saved_as_published") });
        console.debug({ "saved as published": data });
      },
    });
  }

  async function saveAsTemplate(form: FormDefinition) {
    const schemaValidationResult = await builderStore.validateSchema();
    if (!schemaValidationResult.success) {
      let toastTitle = t("toast.fix_highlighted_errors");
      if (
        schemaValidationResult.reason.code === "InvalidEntitiesAttributes" &&
        activeEntityId &&
        !schemaValidationResult.reason.payload.entitiesAttributesErrors[
          activeEntityId
        ]
      ) {
        const firstInvalidEntityId = Object.keys(
          schemaValidationResult.reason.payload.entitiesAttributesErrors,
        )[0];
        if (builderStore.getSchema().entities[firstInvalidEntityId]) {
          setActiveEntityId(firstInvalidEntityId);
        }

        const entityType =
          builderStore.getSchema().entities[firstInvalidEntityId]?.type;
        const componentLabel = toComponentLabel(entityType);
        toastTitle = t("toast.fix_highlighted_errors_at_component", {
          component: componentLabel,
        });
      }

      toast({
        variant: "destructive",
        title: toastTitle,
      });
      return;
    }

    if (!validateFormFieldNames(form)) {
      return;
    }
    const nextForm = {
      ...form,
      validation: formSetting.validation,
      defaultLang: formSetting.defaultLang,
      translationLangs: formSetting.translationLangs,
      labelTranslations: formSetting.labelTranslations,
      publishStatus: FormStatus.Draft,
      schema: builderStore.getData().schema,
    };
    updateForm(nextForm, {
      onSuccess(data) {
        setSavedSnapshot(createFormEditorSnapshot(nextForm));
        void refetchForm();
        toast({ title: t("toast.form_saved_as_draft") });
        console.debug({ "saved as draft": data });
      },
    });
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <EditFormModal
        isOpen={isOpen}
        close={close}
        initialData={{
          name: form.name,
          description: form.description,
          tags: form.tags,
          defaultLang: formSetting.defaultLang,
        }}
        onSubmit={(data) => {
          // Update formSetting immediately so the Language Editor and
          // this modal both reflect the new default language right away,
          // even before the server response arrives.
          setFormSetting((prev) => ({
            ...prev,
            defaultLang: data.defaultLang,
          }));
          const nextForm = {
            ...form,
            name: data.name,
            description: data.description,
            tags: data.tags,
            defaultLang: data.defaultLang,
          };
          updateForm(nextForm, {
            onSuccess(res) {
              setSavedSnapshot(
                createFormEditorSnapshot({
                  ...nextForm,
                  validation: formSetting.validation,
                  translationLangs: formSetting.translationLangs,
                  labelTranslations: formSetting.labelTranslations,
                  schema: builderStore.getData().schema,
                }),
              );
              console.debug({ res });
              close();
            },
          });
        }}
      />
      <ExportFormModal
        isOpen={isExportOpen}
        close={closeExport}
        formId={form.id}
        formName={form.name}
      />
      {/* Header */}
      <div className="border-b border-gray-200 flex-shrink-0 h-15 px-5">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center space-x-3">
            <Button
              variant={"tertiary"}
              className="p-2 ring-stroke"
              onClick={() => navigateWithDirtyCheck("/forms")}
            >
              <BackIcon />
            </Button>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold text-gray-900">
                {form.name}
              </h1>
              <button
                className="p-1 hover:bg-gray-2 rounded transition-colors"
                onClick={open}
              >
                <EditIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="flex space-x-8 h-full">
            {tabItems.map((tab) => (
              <TabButton
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                active={activeTab === tab.key}
              >
                {t(`${formBuilderTabPrefix}.${tab.labelKey}`) ?? tab.label}
              </TabButton>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <div
              className={`flex h-9 items-center gap-2 rounded-full border px-3 text-sm font-medium ${
                isUpdating
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : isDirty
                    ? "border-amber-200 bg-amber-50 text-amber-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  isUpdating
                    ? "bg-blue-500"
                    : isDirty
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                }`}
              />
              {isUpdating
                ? t("form_builder.save_status.saving")
                : isDirty
                  ? t("form_builder.save_status.unsaved")
                  : t("form_builder.save_status.saved")}
            </div>
            <Button
              variant="secondary"
              icon={<ExportIcon className="w-4 h-4" />}
              className="text-gray-700 hover:bg-gray-50"
              onClick={openExport}
            >
              {t("buttons.export")}
            </Button>
            <Button
              variant="secondary"
              className="text-gray-700 hover:bg-gray-50"
              onClick={() => void saveAsTemplate(form)}
              disabled={
                isUpdating || !builderStore.getData().schema.root.length
              }
            >
              {t("buttons.save_template")}
            </Button>
            <Button
              className="bg-slate-800 hover:bg-slate-700 text-white"
              onClick={() => void saveAsPublished(form)}
              disabled={
                isUpdating || !builderStore.getData().schema.root.length
              }
            >
              {isUpdating ? t("buttons.saving") : t("buttons.save")}
            </Button>
          </div>
        </div>
      </div>
      {/* Page Content */}
      <div className="flex-1 overflow-auto bg-gray-2">{renderTabContent()}</div>
    </div>
  );
};

// TODO:

// readonly: date, dropdown, checkbox, toggle,
// disabled: number, currency, checkbox, radio, toggle, file download, url,
// editable: upload,
//
