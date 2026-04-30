import {
  VisibilityRule,
  FormNodeType,
  WorkflowNodeKey,
  ApplicantSource,
} from "@/types/flow";

import { ChevronDown, Info } from "lucide-react";
import AttributePanelHeader from "../../attribute-panel-header";
import { FormIcon, StartIcon } from "@/components/icons";
import { Input } from "@ui/input";
import { useFlowBuilder } from "@/hooks/useFlowBuilder";
import FormBindingModal from "../../../modals/form-binding-modal";
import { useModal } from "@/hooks/useModal";
import { FormDefinition } from "@/types/domain";
import { useBindFormToWorkflow, useWorkflow } from "@/hooks/useWorkflow";
import { useParams } from "react-router-dom";
import Accordion from "@ui/accordion";
import { useEffect, useState } from "react";
import { RadioGroup } from "@ui/radio-group";
import VisibilitySetting from "../../visibility-setting";
import { buildDefaultVisibilityRules } from "@/const/flow";

type Props = {
  nodeId: string;
};

export default function FormAttribute({ nodeId }: Props) {
  const { getNodeById, updateNode, resetConditionNodeBranch } =
    useFlowBuilder();
  const node = getNodeById(nodeId) as FormNodeType | undefined;
  const { open, isOpen, close } = useModal();
  const { mutate: bindForm } = useBindFormToWorkflow({
    onSuccess(response) {
      updateNode("form-node", {
        form: response.data,
        componentRules: buildDefaultVisibilityRules(response.data?.schema),
      });
      resetConditionNodeBranch();
    },
  });
  const { flowId } = useParams<{ flowId: string }>();
  const { workflow } = useWorkflow(flowId);
  const [openKeys, setOpenKeys] = useState<string[]>([
    "default-visibility",
    "advanced-settings",
  ]);
  const [serialPrefixError, setSerialPrefixError] = useState<string | null>(
    null,
  );

  const serialPrefixDraft =
    node?.data.serialPrefix ?? workflow?.serialPrefix ?? "APP";

  const SERIAL_PREFIX_PATTERN = /^[A-Z0-9]{1,3}$/;
  const validateSerialPrefix = (value: string): string | null => {
    if (value.length === 0) return "Prefix is required";
    if (value.length > 3) return "Max 3 characters";
    if (!SERIAL_PREFIX_PATTERN.test(value))
      return "Only uppercase letters (A-Z) and digits (0-9)";
    return null;
  };

  const handleSerialPrefixChange = (raw: string) => {
    const next = raw.toUpperCase().slice(0, 3);
    setSerialPrefixError(null);
    updateNode(nodeId, { serialPrefix: next });
  };

  const handleSerialPrefixBlur = () => {
    const error = validateSerialPrefix(serialPrefixDraft);
    if (error) {
      setSerialPrefixError(error);
    }
  };

  const applicantSource: ApplicantSource =
    node?.data.applicantSource ?? "selection";
  const componentRules: VisibilityRule[] =
    node && Array.isArray(node?.data.componentRules)
      ? node.data.componentRules
      : [];

  useEffect(() => {
    if (!node?.data.form?.schema) return;
    if (componentRules.length > 0) return;

    const defaultRules = buildDefaultVisibilityRules(node.data.form.schema);
    if (!defaultRules.length) return;

    updateNode(nodeId, { componentRules: defaultRules });
  }, [nodeId, node?.data.form?.schema, componentRules.length, updateNode]);

  const handleBinding = (form: FormDefinition) => {
    if (!flowId) return;
    bindForm({ formId: form.id, flowId: flowId });
  };

  return (
    <div className="flex flex-col">
      <FormBindingModal
        isOpen={isOpen}
        onClose={close}
        onConfirm={(form) => handleBinding(form)}
        selectedFormId={node?.data.form?.id}
      />
      {/* Header */}
      <AttributePanelHeader
        icon={<FormIcon className="text-primary-text" />}
        componentType={WorkflowNodeKey.Form}
        className="bg-white border-stroke"
      />

      <div className="flex-1 overflow-y-auto flex flex-col bg-gray-2">
        {/* Content */}
        <div className="px-5 py-4">
          <div className="space-y-6">
            {/* Form Name */}
            <div>
              <label className="block text-sm font-medium text-dark mb-3">
                Linked form
              </label>
              <div
                className="flex flex-row gap-1 items-center"
                onClick={() => {
                  open();
                }}
              >
                <Input
                  value={node?.data.form?.name || ""}
                  readOnly
                  className="cursor-pointer"
                  placeholder="Select a form"
                  hasClearIcon={false}
                  rightIcon={
                    <ChevronDown className="w-4 h-4 text-primary-text" />
                  }
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-dark mb-3">
                Description
              </label>
              <Input
                value={node?.data.description ?? ""}
                placeholder="eg. Employee onboarding form"
                onChange={(e) =>
                  updateNode(nodeId, { description: e.target.value })
                }
              />
            </div>
          </div>
        </div>
        <Accordion
          key="default-visibility"
          className="w-full"
          openKeys={openKeys}
          onOpen={setOpenKeys}
          onClose={setOpenKeys}
          defaultOpenAll={false}
          items={[
            {
              key: "default-visibility",
              name: (
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="text-dark text-base font-semibold">
                    Default visibility
                  </div>
                </div>
              ),
              contentClassName: "p-4",
              content: (
                <div className="flex w-full flex-col gap-4">
                  <div className="text-sm font-medium text-secondary-text">
                    Configure visibility for the form to protect sensitive
                    information from
                    <span className="text-primary-text">APPLICANTS.</span>
                  </div>
                  <VisibilitySetting
                    value={componentRules}
                    formSchema={node?.data.form?.schema}
                    defaultSource="form"
                    onChange={(nextRules) =>
                      updateNode(nodeId, { componentRules: nextRules })
                    }
                    formName={node?.data.form?.name}
                    header={
                      <div className="self-stretch h-12 px-5 py-3 rounded-md border border-stroke flex justify-between items-center overflow-hidden">
                        <div className="flex items-center gap-2">
                          <StartIcon className="w-5 h-5 text-gray-500" />
                          <div className="text-gray-500 text-base font-medium leading-6">
                            Start Point
                            {/* TODO: node type */}
                          </div>
                        </div>
                        <div className="text-slate-400 text-base font-medium leading-6">
                          Default visibility
                          {/* TODO: form-node: default visibility, approval-node: approver type */}
                        </div>
                      </div>
                    }
                  />
                </div>
              ),
            },
            {
              key: "advanced-settings",
              name: (
                <div className="flex w-full items-center justify-between gap-2">
                  <div className="text-dark text-base font-semibold">
                    Advanced settings
                  </div>
                </div>
              ),
              contentClassName: "p-4",
              content: (
                <div className="flex w-full flex-col gap-4">
                  <div className="flex flex-col gap-2.5">
                    <label className="text-dark font-body-medium-medium">
                      Application serial number
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        className="w-[154px]"
                        placeholder="Prefix"
                        maxLength={3}
                        value={serialPrefixDraft}
                        onChange={(e) =>
                          handleSerialPrefixChange(e.target.value)
                        }
                        onBlur={handleSerialPrefixBlur}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.currentTarget.blur();
                          }
                        }}
                        error={!!serialPrefixError}
                        hasClearIcon={false}
                      />
                      <span className="text-base font-medium text-secondary-text">
                        -
                      </span>
                      <span className="text-base font-medium text-secondary-text">
                        yyyymmddxxxx
                      </span>
                    </div>
                    {serialPrefixError ? (
                      <p className="text-xs font-medium text-red-500">
                        {serialPrefixError}
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-secondary-text">
                        Up to 3 uppercase letters or digits. Applications will
                        be numbered {serialPrefixDraft || "APP"}-YYYYMMDD0001.
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className=" text-dark font-body-medium-medium">
                      Applicant source
                    </div>
                    <RadioGroup
                      name="applicant-source"
                      value={applicantSource}
                      onChange={(value) =>
                        updateNode(nodeId, {
                          applicantSource: value as ApplicantSource,
                        })
                      }
                      options={[
                        {
                          label: "Use applicant selection",
                          value: "selection",
                        },
                        { label: "Submitter", value: "submitter" },
                      ]}
                    />
                  </div>
                  {applicantSource === "selection" && (
                    <div className="flex gap-2 items-start px-3 py-2.5 rounded-md border border-giant-blue/20 bg-giant-blue/10">
                      <Info className="w-5 h-5 text-giant-blue shrink-0 mt-0.5" />
                      <p className="text-sm font-medium text-dark leading-snug">
                        Workflow logic will follow the SELECTED applicant, no
                        need to add an additional applicant field to the form.
                      </p>
                    </div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
