import {
  useApplication,
  useCreateApplication,
  useDiscardApplication,
  useUpdateApplication,
} from "@/hooks/useApplication";

import { Button } from "@ui/button";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { BackIcon } from "@/components/icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { Application, OverallStatus } from "@/types/application";
import { useToast } from "@ui/toast";
import DiscardModal from "@/components/modals/discard-modal";
import { useModal } from "@/hooks/useModal";
import { ApplicationInfo } from "@/components/application-info-card";
import {
  InterpreterEntities,
  useInterpreterStore,
} from "@coltorapps/builder-react";
import { basicFormBuilder } from "@/components/form/builder/definition";
import { entitiesComponents } from "@/const/form-builder";
import { FormStatus } from "@/types/form-builder";
import CancelModal from "@/components/modals/cancel-modal";
import { parseFormData } from "@/utils/parser";
import { isAxiosError } from "axios";
import { useAtom, useSetAtom } from "jotai";
import {
  formSettingAtom,
  interpreterStoreAtom,
  sidebarCollapsedAtom,
  userAtom,
  runtimeApplicationAtom,
} from "@/store";
import ReadonlyForm from "@/components/ReadonlyForm";
import useValidatorStore from "@/hooks/useValidatorStore";
import { useCodeHelper } from "@/hooks/useCode/useCodeHelper";
import { ZodError } from "zod";
import ApplicationPanelTab from "@/components/tabs/application-panel-tab";
import {
  useApplicationShares,
  useWorkflowPermissions,
} from "@/hooks/usePermissions";

export default function ApplicationDetailPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { application, isLoading, isError, refetch } =
    useApplication(applicationId);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom);

  const { getCompiledSchema } = useCodeHelper({
    formSchema: application?.formInstance.form.schema ?? {
      root: [],
      entities: {},
    },
    formData: application?.formInstance.data ?? {},
  });

  const compiledSchema = useMemo(
    () => getCompiledSchema(),
    [getCompiledSchema],
  );

  const [, setFormSetting] = useAtom(formSettingAtom);

  useEffect(() => {
    setFormSetting({
      validation: application?.formInstance.form.validation ?? {
        required: false,
        validators: [],
      },
    });
  }, [setFormSetting, application?.formInstance.form.validation]);

  useEffect(() => {
    setSidebarCollapsed(true);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        {t("loading")}
      </div>
    );
  }

  // Error state or application not found
  if (isError || !application) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-dark">
        <h1 className="text-2xl font-bold">Application Not Found</h1>
        <p className="text-lg">The requested application could not be found.</p>
        <Button onClick={() => navigate("/dashboard")} className="mt-4">
          {t("buttons.go_back_home")}
        </Button>
      </div>
    );
  }

  return (
    <ApplicationDetail
      // application={application}
      application={{
        ...application,
        formInstance: {
          ...application.formInstance,
          form: {
            ...application.formInstance.form,
            schema: compiledSchema,
          },
        },
      }}
      refetch={refetch}
    />
  );
}

function ApplicationDetail({
  application,
  refetch,
}: {
  application: Application;
  refetch: () => void;
}) {
  console.debug(
    "schema",
    application.formInstance.form.schema,
    application.formInstance.data,
  );
  const navigate = useNavigate();
  const location = useLocation();

  const { t } = useTranslation();
  const { toast } = useToast();
  const {
    open: openDiscardModal,
    isOpen: isDiscardModalOpen,
    close: closeDiscardModal,
  } = useModal();
  const {
    open: openCancelModal,
    isOpen: isCancelModalOpen,
    close: closeCancelmodal,
  } = useModal();
  const progressModalProps = useModal();
  const [user] = useAtom(userAtom);
  const [isDirty, setIsDirty] = useState(false);
  const submitter = application.submitter;
  const applicant = application.applicant;
  const setIStore = useSetAtom(interpreterStoreAtom);
  const setRuntimeApplication = useSetAtom(runtimeApplicationAtom);

  useEffect(() => {
    setRuntimeApplication(application);
  }, [application, setRuntimeApplication]);

  const { permission } = useWorkflowPermissions();
  const { shares } = useApplicationShares(application.serialNumber);

  const viewOnly = useMemo(() => {
    console.debug(
      { shares, user: user?.id },

      shares.find((s) => String(s.user_id) === user?.id),
    );
    return !!shares.find((s) => String(s.user_id) === user?.id);
  }, [shares, user]);

  console.debug({ viewOnly, user });

  console.debug({ permission, shares });
  const interpreterStore = useInterpreterStore(
    basicFormBuilder,
    application.formInstance.form.schema,
  );
  useEffect(() => {
    setIStore((prev) => (prev === interpreterStore ? prev : interpreterStore));
  }, [interpreterStore, setIStore]);
  const { mutate: discardApplication, isPending } = useDiscardApplication({
    onSuccess: () => {
      closeDiscardModal();
      toast({
        variant: "success",
        title: "The application has been discarded.",
      });
    },
  });
  const { mutate: createApplication, isPending: isSubmitting } =
    useCreateApplication({
      onSuccess: (data) => {
        toast({
          variant: "success",
          title: "The Application has been submitted successfully.",
        });
        refetch();
        if (data.data?.id) {
          navigate(`/application/${data.data.serialNumber}`);
        }
      },
      onError: (e) => {
        console.debug(e);
        toast({
          variant: "destructive",
          description: isAxiosError(e) ? e.response?.data.message : e.message,
        });
      },
    });
  const { executeAllRegistry: executeFormValidator, initiateValidatorStore } =
    useValidatorStore();

  const { mutate: updateApplication, isPending: isUpdating } =
    useUpdateApplication({
      onSuccess: (data) => {
        toast({
          variant: "success",
          title: "Application successfully updated",
        });
        // if (data.data?.id) {
        handleNavigation();
        // }
      },
      onError: (e) => {
        console.error(e.message);
        toast({
          variant: "destructive",
          description: e.message,
        });
      },
    });

  function onDiscard(serialNumber: string) {
    discardApplication(serialNumber);
    refetch();
  }
  const handleNavigation = () => {
    if (location.pathname.includes("/dashboard")) {
      navigate("/dashboard");
    } else {
      navigate("/application/history?tab=application");
    }
  };

  const handleSubmitApplication = async () => {
    if (application.overallStatus === OverallStatus.InProgress) {
      toast({
        variant: "destructive",
        description:
          "An already submitted application can't be submitted again.",
      });
      return;
    }
    if (!interpreterStore || !application.formInstance.form.schema) {
      console.error("Interpreter store or form schema not ready.");
      toast({
        variant: "destructive",
        title: t("toast.validation_failed"),
        description: "Form is not fully loaded or initialized.",
      });
      return;
    }
    // TODO:
    const result = await interpreterStore.validateEntitiesValues();

    const data = interpreterStore.getData();
    const validatorErrors = executeFormValidator(
      data.entitiesValues,
      interpreterStore.schema,
    );
    const hasValidatorErrors = Object.keys(validatorErrors).length > 0;
    const entitiesErrors = Object.entries(validatorErrors).reduce(
      (acc, [entityId, message]) => {
        acc[entityId] = new ZodError([{ code: "custom", message, path: [] }]);
        return acc;
      },
      {} as Record<string, ZodError>,
    );
    if (hasValidatorErrors) {
      interpreterStore.setEntitiesErrors(entitiesErrors);
    }

    if (result?.success && !hasValidatorErrors) {
      createApplication({
        serialNumber: application.serialNumber,
        overallStatus: OverallStatus.InProgress,
        reviewStatus: null,
        submittedBy: "",
        assigneeId: "",
        formInstance: {
          ...application.formInstance,
          data: parseFormData(result.data, application.formInstance.form.schema)
            .data,
        },
        workflowInstance: {
          workflow: {
            id: "",
            revisionId: "",
            name: "",
            description: "",
            tags: [],
            version: 0,
            nodes: [],
            edges: [],
            createdAt: "",
            updatedAt: "",
            publishStatus: FormStatus.Draft,
          },
          data: {},
        },
      });
    } else {
      console.error("Form validation failed:", result);
      toast({
        variant: "destructive",
        title: t("toast.validation_failed"),
        description: t("toast.fill_out_form_correctly"),
      });
    }
  };
  const handleSubmitDraft = async () => {
    const data = interpreterStore.getEntitiesValues();
    if (data) {
      const { data: mappedData } = parseFormData(
        data,
        application.formInstance.form.schema,
      );
      updateApplication({
        id: application.serialNumber,
        application: {
          submittedBy: user!.id,
          formInstance: {
            ...application.formInstance,
            data: mappedData,
          },
          workflowInstance: {
            // mock data here
            workflow: {
              id: "",
              name: "",
              description: "",
              department: {
                id: "",
                name: "",
                abbrev: "",
                description: "",
              },
              category: "",
              version: 0,
              nodes: [],
              edges: [],
              created_at: "",
              updated_at: "",
              publish_status: FormStatus.Published,
              department_id: "",
            },
            data: {},
          },
          assigneeId: "",
          approvalStatus: null,
          overallStatus: OverallStatus.Draft,
        },
      });
    }
    console.debug({ result: data });
  };

  useEffect(() => {
    console.debug("application detail page", application.formInstance.data);
    initiateValidatorStore(application.formInstance.form.schema);

    interpreterStore.setData({
      entitiesValues: application.formInstance.data,
      entitiesErrors: {},
    });
  }, [
    application.formInstance.data,
    application.formInstance.form.schema,
    interpreterStore,
  ]);

  useEffect(() => {
    setIsDirty(false);

    const initialData = JSON.stringify(application.formInstance.data);
    const unsubscribe = interpreterStore.subscribe((_data, events) => {
      const currentData = interpreterStore.getEntitiesValues();
      setIsDirty(JSON.stringify(currentData) !== initialData);

      events.forEach((event) => {
        if (event.name === "EntityValueUpdated") {
          interpreterStore.validateEntityValue(event.payload.entityId);
        }
      });
    });

    return unsubscribe;
  }, [interpreterStore, application.formInstance.data]);

  useEffect(() => {
    console.debug(interpreterStore);
    setIStore((prev) => (prev === interpreterStore ? prev : interpreterStore));
  }, [interpreterStore, setIStore]);

  return (
    <div className="overflow-y-auto max-h-full bg-gray-3">
      <DiscardModal
        application={application}
        isOpen={isDiscardModalOpen}
        close={closeDiscardModal}
        onDiscard={
          application.overallStatus === OverallStatus.Draft
            ? (applicationId: string) => {
                onDiscard(applicationId);
                handleNavigation();
              }
            : onDiscard
        }
        hideProgress={true}
      />
      <CancelModal
        isOpen={isCancelModalOpen}
        close={closeCancelmodal}
        onCancel={handleNavigation}
      />
      {/* Header */}
      <div className="flex flex-row items-center w-full bg-white h-15 px-5 gap-5 sticky top-0 border-b border-stroke z-5">
        <Button
          onClick={() =>
            application.overallStatus === OverallStatus.Draft && isDirty
              ? openCancelModal()
              : handleNavigation()
          }
          variant={"tertiary"}
          className="h-11 w-11 p-0"
        >
          <BackIcon className="w-5 h-5 text-dark" />
        </Button>
        <span className="font-medium text-dark text-base md:text-lg">
          {application.formInstance.form.name}
        </span>
      </div>

      {/* Content */}
      <div className="flex lg:flex-row-reverse flex-col lg:justify-between h-[calc(100dvh-104px)]">
        {/* {application.overallStatus !== OverallStatus.Draft && (
          <ApplicationProgress application={application} />
        )} */}
        <ApplicationPanelTab application={application} />
        <div className="md:p-16 md:pt-4 lg:pt-16 p-4 w-full bg-gray-3 lg:overflow-y-auto justify-items-center">
          <div className="bg-white border border-gray-200 rounded-lg shadow-md p-1 max-w-6xl w-full">
            {/* Application Information */}
            <ApplicationInfo
              application={application}
              progressModalProps={progressModalProps}
            />

            <div className="p-3">
              <div className="flex gap-4 mb-6">
                <div className="flex-1 flex flex-col gap-2.5">
                  <p className="text-base font-medium text-gray-900">
                    {t("application_page.submitter")}
                  </p>
                  <div className="flex h-12 items-center px-5 py-3 bg-gray-100 border border-stroke rounded-md">
                    <span className="flex-1 text-base text-gray-900">
                      {submitter?.name ?? application.submittedBy ?? "-"}
                    </span>
                  </div>
                </div>
                <div className="flex-1 flex flex-col gap-2.5">
                  <p className="text-base font-medium text-gray-900">
                    {t("application_page.applicant")}
                  </p>
                  <div className="flex h-12 items-center px-5 py-3 bg-gray-100 border border-stroke rounded-md">
                    <span className="flex-1 text-base text-gray-900">
                      {applicant?.name ?? "-"}
                    </span>
                  </div>
                </div>
              </div>
              <hr className="w-full mb-6 border-stroke" />
              {/* {application.formInstance.form.description && (
                <p className="text-gray-600 mb-6">
                  {application.formInstance.form.description}
                </p>
              )} */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitApplication();
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
                {application.overallStatus ===
                  OverallStatus.CompletedApproved ||
                application.overallStatus === OverallStatus.CompletedRejected ||
                application.overallStatus === OverallStatus.Canceled ||
                viewOnly ? (
                  <ReadonlyForm {...application} />
                ) : (
                  <InterpreterEntities
                    interpreterStore={interpreterStore}
                    components={entitiesComponents}
                  />
                )}
                {application.overallStatus !== OverallStatus.Canceled &&
                  application.overallStatus !==
                    OverallStatus.CompletedApproved &&
                  application.overallStatus !==
                    OverallStatus.CompletedRejected && (
                    <div className="flex md:flex-row flex-col items-center gap-3 pt-5">
                      <div className="flex flex-row justify-between gap-3 w-full">
                        {application.overallStatus === OverallStatus.Draft ? (
                          <Button
                            variant={"destructive"}
                            onClick={() => openDiscardModal()}
                            className="md:w-fit w-full"
                            type="button"
                          >
                            Discard
                          </Button>
                        ) : (
                          <Button
                            variant={"destructive"}
                            onClick={() => openDiscardModal()}
                            loading={isPending}
                            className="md:w-fit w-full"
                            type="button"
                          >
                            Discard
                          </Button>
                        )}
                        {application.overallStatus === OverallStatus.Draft && (
                          <Button
                            variant={"secondary"}
                            className="md:w-fit w-full"
                            type="button"
                            onClick={() => handleSubmitDraft()}
                            disabled={!isDirty || isUpdating}
                            loading={isUpdating}
                          >
                            Save
                          </Button>
                        )}
                      </div>
                      <Button
                        type="submit"
                        className="md:w-fit w-full"
                        disabled={
                          application.overallStatus !== OverallStatus.Draft &&
                          (!isDirty || isSubmitting)
                        }
                        loading={isSubmitting}
                      >
                        Submit
                      </Button>
                    </div>
                  )}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
