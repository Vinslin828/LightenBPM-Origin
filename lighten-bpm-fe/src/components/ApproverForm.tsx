import { useEffect, useMemo, useState } from "react";
import { Application, ReviewStatus } from "@/types/application";
import {
  InterpreterEntities,
  useInterpreterStore,
} from "@coltorapps/builder-react";
import { basicFormBuilder } from "./form/builder/definition";
import { usePreloadMasterDataForExpressions } from "@/hooks/useMasterData";
import { useSetAtom } from "jotai";
import { interpreterStoreAtom, runtimeApplicationAtom } from "@/store";
import { EntitiesValues } from "@coltorapps/builder";
import ApproveRejectTab, {
  useApproveRejectTab,
} from "./tabs/reject-approve-tab";
import { Textarea } from "@ui/textarea";
import { Button } from "@ui/button";
import {
  useApproveApplication,
  useRejectApplication,
} from "@/hooks/useApplication";
import { useToast } from "@ui/toast";
import { useTranslation } from "react-i18next";
import useValidatorStore from "@/hooks/useValidatorStore";
import { parseFormData } from "@/utils/parser";
import {
  createVisibleEntityComponents,
  getHiddenEntityIds,
} from "@/utils/form-visibility";
import { useCodeHelper } from "@/hooks/useCode/useCodeHelper";
import {
  buildZodErrors,
  getDynamicRequiredErrors,
} from "@/utils/dynamic-status-validation";
type Props = Application & {
  onChange?: (values?: EntitiesValues<typeof basicFormBuilder>) => void;
};

export default function ApproverForm({
  formInstance,
  onChange,
  ...props
}: Props) {
  const { form, data } = formInstance;
  const { t } = useTranslation();
  const [isValidating, setIsValidating] = useState(false);
  const { decision, setDecision } = useApproveRejectTab();
  const [comment, setComment] = useState("");
  const setIStore = useSetAtom(interpreterStoreAtom);
  const setRuntimeApplication = useSetAtom(runtimeApplicationAtom);

  usePreloadMasterDataForExpressions(form.schema);

  const interpreterStore = useInterpreterStore(basicFormBuilder, form.schema, {
    initialData: data ?? {},
  });
  const { executeCode } = useCodeHelper({
    formSchema: form.schema,
    formData: data ?? {},
    application: { ...props, formInstance },
  });
  const hiddenEntityIds = useMemo(
    () => getHiddenEntityIds(form.schema),
    [form.schema],
  );
  const renderableEntityComponents = useMemo(
    () => createVisibleEntityComponents(hiddenEntityIds),
    [hiddenEntityIds],
  );
  const { toast } = useToast();
  const { mutate: approveApplication, isPending: isApproving } =
    useApproveApplication({
      onSuccess: () => {
        toast({
          variant: "success",
          title: "Successfully approve application.",
        });
        // navigate("/dashboard?tab=approval");
      },
    });
  const { mutate: rejectApplication, isPending: isRejecting } =
    useRejectApplication({
      onSuccess: () => {
        toast({
          variant: "success",
          title: "Successfully reject application.",
        });
        // navigate("/dashboard?tab=approval");
      },
    });
  const { executeAllRegistry, executeAllLocalValidator, executeFormValidator } =
    useValidatorStore();

  //   const [decision, setDecision] = useState<"approve" | "reject" | null>(null);

  async function handleValidation() {
    if (isValidating || isApproving || isRejecting) return;

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
        handleSubmit();
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

  function handleSubmit() {
    const entitiesValues = interpreterStore.getEntitiesValues();
    const { data: mappedData } = parseFormData(
      entitiesValues,
      formInstance.form.schema,
    );
    console.debug("approvalId", props.approvalId);
    if (decision === "approve") {
      approveApplication({
        serialNumber: props.serialNumber,
        comment,
        approvalId: props.approvalId,
        formData: mappedData,
      });
    } else if (decision === "reject") {
      rejectApplication({
        serialNumber: props.serialNumber,
        comment,
        approvalId: props.approvalId,
        formData: mappedData,
      });
    }
  }

  useEffect(() => {
    interpreterStore.setData({
      entitiesValues: data,
      entitiesErrors: {},
    });
  }, [data, interpreterStore]);

  useEffect(() => {
    setIStore((prev) => (prev === interpreterStore ? prev : interpreterStore));
  }, [interpreterStore, setIStore]);

  useEffect(() => {
    setRuntimeApplication({
      ...props,
      formInstance,
    } as Application);
  }, [formInstance, props, setRuntimeApplication]);

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          // handleSubmit();
        }}
        onKeyDownCapture={(e) => {
          if (e.key !== "Enter") return;
          const target = e.target as HTMLElement | null;
          if (target?.tagName.toLowerCase() === "textarea") return;
          e.preventDefault();
        }}
        className="space-y-6"
      >
        <InterpreterEntities
          interpreterStore={interpreterStore}
          components={renderableEntityComponents}
        />

        <div className="flex flex-col py-4 gap-3">
          {props.reviewStatus === ReviewStatus.Pending && (
            <div className="flex flex-col gap-3">
              <div className="text-sm font-medium text-dark/50">Decisions</div>
              <ApproveRejectTab decision={decision} setDecision={setDecision} />
            </div>
          )}
          <div className="flex flex-col gap-3">
            <dt className="text-sm font-medium text-dark">Comment</dt>
            <dd className="mt-1 text-base text-dark font-semibold whitespace-pre-wrap flex flex-row gap-3">
              <Textarea
                className="h-29"
                value={props.comment ?? comment}
                disabled={
                  !!props.comment ||
                  props.reviewStatus === ReviewStatus.Approved ||
                  props.reviewStatus === ReviewStatus.Rejected
                }
                onChange={(e) => setComment(e.target.value)}
              />
            </dd>
          </div>
        </div>
        {props.reviewStatus === ReviewStatus.Pending && (
          <div className="flex flex-col items-center pt-5">
            <Button
              // variant={"destructive"}
              onClick={handleValidation}
              loading={isApproving || isRejecting}
              disabled={!decision}
            >
              Submit
            </Button>
          </div>
        )}
      </form>
    </>
  );
}
