import { basicFormBuilder } from "@/components/form/builder/definition";
import { Button } from "@ui/button";
import { useToast } from "@ui/toast";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { BackIcon } from "@/components/icons";
import { FormDefinition } from "@/types/domain";
import { FormStatus } from "@/types/form-builder";
import { OverallStatus, ReviewStatus } from "@/types/application";
import {
  useApplicationForm,
  useCreateApplication,
} from "@/hooks/useApplication";
import { useAuth } from "@/hooks/useAuth";
import { useModal } from "@/hooks/useModal";
import { useEffect, useRef, useState } from "react";
import { parseFormData } from "@/utils/parser";
import { User } from "@/types/domain";
import { useAtom } from "jotai";
import {
  draftIdAtom,
  formSettingAtom,
  interpreterStoreAtom,
  sidebarCollapsedAtom,
} from "@/store";
import useValidatorStore from "@/hooks/useValidatorStore";
import { ZodError } from "zod";
import ApplicationForm from "@ui/ApplicationForm";
import CancelModal from "@/components/modals/cancel-modal";
import { InterpreterStoreData } from "@coltorapps/builder";
import { isAxiosError } from "axios";

const EMPTY_WORKFLOW = {
  id: "",
  revisionId: "",
  name: "",
  description: "",
  tags: [
    {
      id: "",
      name: "",
      abbrev: "",
      description: "",
      createdAt: "",
      createdBy: "",
    },
  ],
  version: 0,
  nodes: [],
  edges: [],
  createdAt: "",
  updatedAt: "",
  publishStatus: FormStatus.Published,
};

export default function ApplicationFormPage() {
  const { bindingId } = useParams<{ bindingId: string }>();
  const { form, isLoading, isError } = useApplicationForm(bindingId);
  const [, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom);

  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        {t("loading")}
      </div>
    );
  }

  // Error state or form not found
  if (isError || !form) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <h1 className="text-2xl font-bold">{t("errors.form_not_found")}</h1>
        <p className="text-lg">{t("errors.form_not_found_description")}</p>
        <Button onClick={() => navigate("/dashboard")} className="mt-4">
          {t("buttons.go_back_home")}
        </Button>
      </div>
    );
  }

  return <Form form={form} />;
}

function Form({ form }: { form: FormDefinition }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [, setIStore] = useAtom(interpreterStoreAtom);

  const { user } = useAuth();
  const modalProps = useModal();
  const [isDirty, setIsDirty] = useState(false);
  const lastSchemaRef = useRef<string>("");
  const prevRenderRef = useRef<{
    isDirty: boolean;
    formId: string;
    updatedAt: string | undefined;
    formRef: FormDefinition;
    schemaRef: FormDefinition["schema"];
    isSubmitting: boolean;
    bindingId?: string;
    userId?: string;
  } | null>(null);
  const { bindingId } = useParams<{ bindingId: string }>();
  const { initiateValidatorStore } = useValidatorStore();
  const [draftId, setDraftId] = useAtom(draftIdAtom);
  const [, setFormSetting] = useAtom(formSettingAtom);
  const [applicant, setApplicant] = useState<User | null>(null);

  useEffect(() => {
    setFormSetting({ validation: form.validation });
  }, [setFormSetting, form.validation]);

  useEffect(() => {
    console.debug("initiate validator store");
    const serializedSchema = JSON.stringify(form.schema);
    if (serializedSchema !== lastSchemaRef.current) {
      lastSchemaRef.current = serializedSchema;
      initiateValidatorStore(form.schema);
    }
  }, [form.schema]);

  const buildEntitiesErrors = (validatorErrors: Record<string, string>) =>
    Object.entries(validatorErrors).reduce(
      (acc, [entityId, message]) => {
        acc[entityId] = new ZodError([{ code: "custom", message, path: [] }]);
        return acc;
      },
      {} as Record<string, ZodError>,
    );

  const createWorkflowInstance = () => ({
    workflow: EMPTY_WORKFLOW,
    data: {},
  });

  const { mutate: createApplication, isPending: isSubmitting } =
    useCreateApplication({
      onSuccess: (data) => {
        setDraftId(null);
        toast({
          variant: "success",
          title: "The Application has been submitted successfully.",
        });
        if (data.data?.id) {
          navigate(`/dashboard/application/${data.data.serialNumber}`);
        }
      },
      onError(error) {
        // console.debug({ error });
        if (isAxiosError(error) && error.response?.data.errors?.[0].message) {
          toast({
            variant: "destructive",
            title: error.response?.data.errors?.[0].message,
          });
        } else {
          toast({ variant: "destructive", title: error.message });
        }
      },
    });

  useEffect(() => {
    if (!prevRenderRef.current) {
      prevRenderRef.current = {
        isDirty,
        formId: form.id,
        updatedAt: form.updatedAt,
        formRef: form,
        schemaRef: form.schema,
        isSubmitting,
        bindingId,
        userId: user?.id,
      };
      return;
    }

    // const changes: string[] = [];
    // const prev = prevRenderRef.current;
    // if (prev.isDirty !== isDirty) changes.push("isDirty");
    // if (prev.formRef !== form) changes.push("form identity");
    // if (prev.schemaRef !== form.schema) changes.push("schema identity");
    // if (prev.formId !== form.id) changes.push("form.id");
    // if (prev.updatedAt !== form.updatedAt) changes.push("form.updatedAt");
    // if (prev.isSubmitting !== isSubmitting) changes.push("isSubmitting");
    // if (prev.bindingId !== bindingId) changes.push("bindingId");
    // if (prev.userId !== user?.id) changes.push("user.id");

    // if (changes.length > 0) {
    //   console.debug("[ApplicationFormPage] rerender diff", changes, {
    //     prev,
    //     next: {
    //       isDirty,
    //       formId: form.id,
    //       updatedAt: form.updatedAt,
    //       formRef: form,
    //       schemaRef: form.schema,
    //       isSubmitting,
    //       bindingId,
    //       userId: user?.id,
    //     },
    //   });
    // }

    prevRenderRef.current = {
      isDirty,
      formId: form.id,
      updatedAt: form.updatedAt,
      formRef: form,
      schemaRef: form.schema,
      isSubmitting,
      bindingId,
      userId: user?.id,
    };
  });

  const handleSubmitApplication = async (
    values: InterpreterStoreData<typeof basicFormBuilder>,
  ) => {
    console.debug({ values });

    const { data: mappedData } = parseFormData(
      values.entitiesValues,
      form.schema,
    );
    createApplication({
      id: bindingId!,
      submittedBy: user!.id,
      formInstance: {
        form: form,
        data: mappedData,
      },
      workflowInstance: {
        // mock data here
        ...createWorkflowInstance(),
      },
      assigneeId: "",
      reviewStatus: ReviewStatus.Pending,
      overallStatus: OverallStatus.InProgress,
      draftId,
      applicantId: applicant ? Number(applicant.id) : undefined,
    });
  };
  const handleCancel = () => {
    console.debug({ isDirty });
    if (isDirty) {
      modalProps.open();
    } else {
      console.debug("set istore null");
      navigate("/dashboard");
      // TOOD: if current url contans /dashboard navigate to /dashboard else navigate to /applicaiton/history
    }
  };

  const handleSubmitDraft = async (
    values: InterpreterStoreData<typeof basicFormBuilder>,
  ) => {
    const { data: mappedData } = parseFormData(
      values.entitiesValues,
      form.schema,
    );
    createApplication({
      id: bindingId!,
      submittedBy: user!.id,
      formInstance: {
        form: form,
        data: mappedData,
      },
      workflowInstance: {
        // mock data here
        ...createWorkflowInstance(),
      },
      assigneeId: "",
      reviewStatus: null,
      overallStatus: OverallStatus.Draft,
      draftId,
      applicantId: applicant ? Number(applicant.id) : undefined,
    });
  };

  return (
    <div className="overflow-y-auto max-h-full bg-gray-3 min-h-full">
      <CancelModal
        {...modalProps}
        onCancel={() => {
          navigate("/dashboard");
        }}
      />
      <div className="flex flex-row items-center w-full bg-white h-15 px-5 gap-5 sticky top-0 border-b border-stroke z-5">
        <Button
          onClick={handleCancel}
          variant={"tertiary"}
          className="h-11 w-11 p-0"
        >
          <BackIcon className="w-5 h-5 text-dark" />
        </Button>

        <span className="font-medium text-dark text-base md:text-lg">
          {form.name}
        </span>
      </div>
      <div className="md:p-6 p-4 max-w-6xl mx-auto">
        <div className="bg-white border border-gray-200 rounded-lg shadow-md p-6">
          <ApplicationForm
            formSchema={form.schema}
            isSubmitting={isSubmitting}
            form={form}
            onSave={handleSubmitApplication}
            onSaveDraft={handleSubmitDraft}
            isDirty={isDirty}
            setIsDirty={setIsDirty}
            onApplicantChange={setApplicant}
          />
        </div>
      </div>
    </div>
  );
}
