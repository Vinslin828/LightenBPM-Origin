import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { BackIcon, EditIcon, ExportIcon } from "@/components/icons";
import {
  Dispatch,
  SetStateAction,
  useCallback,
  useEffect,
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

const formBuilderTabPrefix = "form_builder.tabs";
const DUPLICATE_FIELD_NAME_ERROR_FLAG = Symbol("DuplicateFieldNameError");

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

export const EditFormPage = () => {
  const { formId: formId } = useParams<{ formId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const {
    form,
    isLoading: isFormLoading,
    refetch: refetchForm,
  } = useForm(formId);
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
        setActiveEntityId(payload.entity.id);
      },
      onEntityDeleted(payload) {
        const rootEntityId = builderStore.getData().schema.root[0];

        if (payload.entity.id === activeEntityId && rootEntityId) {
          setActiveEntityId(rootEntityId);
        } else {
          setActiveEntityId(null);
        }
        removeValidator(payload.entity.id);
      },
      onEntityAttributeUpdated(payload) {
        void builderStore.validateEntityAttribute(
          payload.entity.id,
          payload.attributeName,
        );
      },
    },
  });

  useEffect(() => {
    // set form-builder schema after form data is fetched
    console.debug(form?.schema);
    if (form?.schema) {
      const hydratedSchema = hydrateSchemaWithRequiredDefaults(form.schema);
      validateSchema(hydratedSchema, basicFormBuilder)
        .then((result) => {
          console.debug(hydratedSchema);
          initiateValidatorStore(hydratedSchema);
          console.debug({ result });
          builderStore.setData({
            schema: hydratedSchema,
            entitiesAttributesErrors: {},
            schemaError: undefined,
          });
          const rootEntityId = builderStore.getData().schema.root[0];
          setActiveEntityId(rootEntityId ?? null);
        })
        .catch((error) => {
          console.error(error);
        });
    }
    if (form?.validation) {
      console.debug();
      setFormSetting({ validation: form?.validation });
    }
  }, [form?.schema, builderStore]);

  useEffect(() => {
    setBstore(builderStore);
  }, [builderStore]);

  // default collapse sidebar when entering this page
  const [, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom);
  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

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
    updateForm(
      {
        ...form,
        validation: formSetting.validation,
        publishStatus: FormStatus.Published,
        schema: builderStore.getData().schema,
      },
      {
        onSuccess(data) {
          refetchForm();
          navigate("/forms");
          toast({ title: t("toast.form_saved_as_published") });
          console.debug({ "saved as published": data });
        },
      },
    );
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
    updateForm(
      {
        ...form,
        validation: formSetting.validation,
        publishStatus: FormStatus.Draft,
        schema: builderStore.getData().schema,
      },
      {
        onSuccess(data) {
          navigate("/forms");
          toast({ title: t("toast.form_saved_as_draft") });
          console.debug({ "saved as draft": data });
        },
      },
    );
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
        }}
        onSubmit={(data) =>
          updateForm(
            {
              ...form,
              name: data.name,
              description: data.description,
              tags: data.tags,
            },
            {
              onSuccess(data) {
                console.debug({ data });
                close();
              },
            },
          )
        }
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
              onClick={() => navigate("/forms")}
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
