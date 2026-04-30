import { SingleSelect } from "@ui/select/single-select";
import {
  ApprovalNodeType,
  ApproverType,
  WorkflowNodeKey,
  ApproveMethod,
  DepartmentSupervisorApproval,
} from "@/types/flow";
import AttributePanelHeader from "../../attribute-panel-header";
import { ApprovalIcon, ApproveIcon } from "@/components/icons";
import { Textarea } from "@ui/textarea";
import { Input } from "@ui/input";
import { useTranslation } from "react-i18next";
import { approverTypeOptions } from "@/const/flow";
import UnitSelect from "@ui/select/unit-select";
import RoleSelect from "@ui/select/role-select";
import { Checkbox } from "@ui/checkbox";
import UserSelect from "@ui/select/user-select";
import { FormDefinition } from "@/types/domain";
import Accordion from "@ui/accordion";
import { useState } from "react";
import VisibilitySetting from "../../visibility-setting";
import { ApproverTag } from "./approver-tag";
import CodeToggle from "@ui/code-toggle";
import CodeEditButton from "@ui/button/code-edit-button";

type Props = {
  data: ApprovalNodeType["data"];
  onChange: (data: Partial<ApprovalNodeType["data"]>) => void;
  controlId?: string;
  formData?: Partial<FormDefinition>;
};

type UserRefType = "manual" | "reference";
const approverPrefix = "approver_type";
const defaultUserReferenceExpression = `function expression(){\n  // must return an arayy of user id (number array).\n  return getFormField("field_name").value?.map((v)=>Number(v));\n}`;

function getUserRefType(
  specificUser: ApprovalNodeType["data"]["specificUser"] | undefined,
): UserRefType {
  return specificUser?.type === "reference" ? "reference" : "manual";
}

export function SharedApprovalAttributes({
  data,
  onChange,
  controlId,
  formData,
}: Props) {
  const { t } = useTranslation();
  const userRefType = getUserRefType(data?.specificUser);
  const [openKeys, setOpenKeys] = useState<string[]>(["default-visibility"]);

  console.debug({ data });

  const handleApproverTypeChange = (newApproverType: ApproverType) => {
    let newApprovalData: Partial<ApprovalNodeType["data"]> = {
      approver: newApproverType,
    };

    // Create a new default data structure for the selected approver type
    switch (newApproverType) {
      case ApproverType.ApplicantReportLine:
        newApprovalData.approveMethod = { method: "to_job_grade", jobGrade: 0 };
        newApprovalData.advancedSetting = "";
        break;
      case ApproverType.UserReportLine:
        newApprovalData.specificUser = { type: "manual", userId: "" };
        newApprovalData.approveMethod = { method: "to_job_grade", jobGrade: 0 };
        newApprovalData.advancedSetting = "";
        break;
      case ApproverType.DepartmentSupervisor:
        newApprovalData.departmentSupervisor = {
          type: "manual",
          departmentId: "",
        };
        break;
      case ApproverType.Role:
        newApprovalData.specificRole = { type: "manual", roleId: "" };
        break;
      case ApproverType.User:
        newApprovalData.specificUser = { type: "manual", userIds: [] };
        break;
    }

    // Replace the old data, keeping only the base properties
    onChange({
      label: data.label,
      description: data.description,
      ...newApprovalData,
    });
  };

  const handleUserRefTypeChange = (type: UserRefType) => {
    if (type === "manual") {
      onChange({
        specificUser: {
          type: "manual",
          userIds: [],
        },
      });
      return;
    }

    const refSource = data?.specificUser as
      | { type: "reference"; reference?: string; userId?: string }
      | undefined;
    const referenceValue =
      refSource?.type === "reference"
        ? (refSource.reference ?? refSource.userId ?? "")
        : "";

    onChange({
      specificUser: {
        type: "reference",
        userId: referenceValue,
        reference: referenceValue,
      },
    });
  };

  const approveMethodName = controlId
    ? `${controlId}-approveMethod`
    : `approveMethod-${data?.approver}`;
  const specificUserReference =
    data?.specificUser?.type === "reference"
      ? (data.specificUser.reference ?? data.specificUser.userId ?? "")
      : "";
  const initialUserReferenceCode =
    specificUserReference.trim().length > 0
      ? specificUserReference
      : defaultUserReferenceExpression;

  function renderSubmenu(type?: ApproverType) {
    switch (type) {
      case ApproverType.Applicant:
        return null;
      case ApproverType.ApplicantReportLine:
      case ApproverType.UserReportLine:
        const approveMethod = data?.approveMethod as ApproveMethod;
        const isJobGrade =
          approveMethod && approveMethod.method === "to_job_grade";
        const isApproveLevel =
          approveMethod && approveMethod.method === "to_level";

        const handleMethodChange = (method: "jobGrade" | "approveLevel") => {
          const newApproveMethod: ApproveMethod =
            method === "jobGrade"
              ? { method: "to_job_grade", jobGrade: 0 }
              : { method: "to_level", approveLevel: 0 };
          onChange({ approveMethod: newApproveMethod });
        };

        const handleValueChange = (value: number) => {
          if (!approveMethod || value < 0) return;
          if (isJobGrade) {
            onChange({
              approveMethod: { ...approveMethod, jobGrade: value },
            });
          } else if (isApproveLevel) {
            onChange({
              approveMethod: { ...approveMethod, approveLevel: value },
            });
          }
        };

        return (
          <div>
            <div className="px-5 py-2 space-y-4">
              {type === ApproverType.UserReportLine && (
                <div className="space-y-2">
                  <div className="flex flex-row justify-between">
                    <div className="font-medium">
                      {t("flow_attributes.approval.select_user")}
                    </div>
                    {/* <CodeToggle
                      value={
                        data.specificUser?.type === "reference"
                          ? "code"
                          : "manual"
                      }
                      onChange={(value) => {
                        handleUserRefTypeChange(
                          value === "code" ? "reference" : "manual",
                        );
                      }}
                    /> */}
                  </div>
                  <div className="flex flex-col space-y-2 w-full">
                    {userRefType === "manual" && (
                      <UserSelect
                        placeholder={t(
                          "flow_attributes.approval.select_a_user",
                        )}
                        value={(() => {
                          const su = data?.specificUser as
                            | {
                                type: "manual";
                                userId?: string;
                                user?: import("@/types/domain").User;
                              }
                            | { type: "reference" }
                            | undefined;
                          return su?.type === "reference"
                            ? undefined
                            : (su?.user ?? su?.userId);
                        })()}
                        onValueChange={(userId, user) =>
                          onChange({
                            specificUser: {
                              type: "manual",
                              userId: userId ?? "",
                              user,
                            },
                          })
                        }
                      />
                    )}
                    {/* {userRefType === "reference" && (
                      <CodeEditButton
                        variant="validation"
                        showApiToggle={false}
                        validationReturnType={"any"}
                        value={initialUserReferenceCode}
                        formSchema={formData?.schema}
                        trigger={specificUserReference}
                        onSave={(reference) => {
                          onChange({
                            specificUser: {
                              type: "reference",
                              userId: reference,
                              reference,
                            },
                          });
                        }}
                      />
                    )} */}
                  </div>
                </div>
              )}

              <div className="font-medium">
                {t("flow_attributes.approval.select_approved_method")}
              </div>
              <div className="flex flex-col space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={approveMethodName}
                    value="jobGrade"
                    checked={isJobGrade}
                    onChange={() => handleMethodChange("jobGrade")}
                  />
                  <span>{t("flow_attributes.approval.by_job_grade")}</span>
                </label>
                {isJobGrade && (
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-sm">
                      {t("flow_attributes.approval.job_grade")}
                    </span>
                    <Input
                      type="number"
                      className="w-24 h-9"
                      hasClearIcon={false}
                      value={
                        approveMethod.jobGrade === 0
                          ? ""
                          : approveMethod.jobGrade
                      }
                      onChange={(e) =>
                        handleValueChange(parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </div>
                )}
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name={approveMethodName}
                    value="approveLevel"
                    checked={isApproveLevel}
                    onChange={() => handleMethodChange("approveLevel")}
                  />
                  <span>{t("flow_attributes.approval.by_approval_level")}</span>
                </label>
                {isApproveLevel && (
                  <div className="flex items-center gap-2 pl-6">
                    <span className="text-sm">
                      {t("flow_attributes.approval.approval_level")}
                    </span>
                    <Input
                      type="number"
                      className="w-24 h-9"
                      hasClearIcon={false}
                      value={
                        approveMethod.approveLevel === 0
                          ? ""
                          : approveMethod.approveLevel
                      }
                      onChange={(e) =>
                        handleValueChange(parseInt(e.target.value, 10) || 0)
                      }
                    />
                  </div>
                )}
              </div>
            </div>

            <AdvanceSetting />
          </div>
        );

      case ApproverType.DepartmentSupervisor:
        const deptSupervisorData = data as DepartmentSupervisorApproval;
        const isManual =
          deptSupervisorData.departmentSupervisor?.type === "manual";
        const isReference =
          deptSupervisorData.departmentSupervisor?.type === "reference";

        const handleDeptTypeChange = (type: "manual" | "reference") => {
          const newDeptSupervisor =
            type === "manual"
              ? { type: "manual" as const, departmentId: "" }
              : { type: "reference" as const, reference: "" };
          onChange({ departmentSupervisor: newDeptSupervisor });
        };

        return (
          <div className="px-5 pb-5 space-y-4">
            <div className="font-medium">
              {t("flow_attributes.approval.select_organization_unit")}
            </div>
            <div className="flex flex-col space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="deptType"
                  value="manual"
                  checked={isManual}
                  onChange={() => handleDeptTypeChange("manual")}
                />
                <span>{t("flow_attributes.approval.manual_select")}</span>
              </label>
              {isManual && (
                <div className="pl-5">
                  <UnitSelect
                    value={
                      deptSupervisorData.departmentSupervisor.department?.id ??
                      deptSupervisorData.departmentSupervisor.departmentId
                    }
                    onValueChange={(id, department) =>
                      onChange({
                        departmentSupervisor: {
                          type: "manual" as const,
                          departmentId: id,
                          department: department,
                        },
                      })
                    }
                  />
                </div>
              )}
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="deptType"
                  value="reference"
                  checked={isReference}
                  onChange={() => handleDeptTypeChange("reference")}
                />
                <span>{t("flow_attributes.approval.reference_from_form")}</span>
              </label>
              {isReference && (
                <div className="pl-5">
                  <Input
                    placeholder={t(
                      "flow_attributes.approval.enter_reference_field",
                    )}
                    value={
                      "reference" in deptSupervisorData.departmentSupervisor
                        ? deptSupervisorData.departmentSupervisor.reference
                        : ""
                    }
                    onChange={(e) =>
                      onChange({
                        departmentSupervisor: {
                          type: "reference",
                          reference: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              )}
            </div>
          </div>
        );

      case ApproverType.Role:
        return (
          <div className="px-5 pb-5">
            <div className="font-medium">
              {t("flow_attributes.approval.select_role")}
            </div>
            {data.specificRole?.type === "manual" && (
              <RoleSelect
                value={
                  data?.specificRole?.role?.id ?? data?.specificRole?.roleId
                }
                placeholder={t("flow_attributes.approval.select_a_role")}
                onValueChange={(id, department) =>
                  onChange({
                    specificRole: {
                      type: "manual",
                      roleId: id as string,
                      role: department,
                    },
                  })
                }
              />
            )}
          </div>
        );

      case ApproverType.User:
        return (
          <div className="px-5 pb-5 space-y-2">
            <div className="font-medium flex flex-row justify-between">
              <div>{t("flow_attributes.approval.select_user")}</div>
              <CodeToggle
                value={userRefType === "reference" ? "code" : "manual"}
                onChange={(value) =>
                  handleUserRefTypeChange(
                    value === "code" ? "reference" : "manual",
                  )
                }
              />
            </div>
            {userRefType === "manual" && (
              <UserSelect
                multiple
                placeholder={t("flow_attributes.approval.select_a_user")}
                value={(() => {
                  const su = data?.specificUser as
                    | {
                        type: "manual";
                        userIds?: string[];
                        users?: import("@/types/domain").User[];
                      }
                    | { type: "reference" }
                    | undefined;
                  return su?.type === "reference"
                    ? undefined
                    : (su?.users ?? su?.userIds ?? []);
                })()}
                onValueChange={(ids, users) =>
                  onChange({
                    specificUser: {
                      type: "manual",
                      userIds: ids,
                      users,
                    },
                  })
                }
              />
            )}
            {userRefType === "reference" && (
              <CodeEditButton
                variant="validation"
                showApiToggle={false}
                validationReturnType={"any"}
                value={initialUserReferenceCode}
                formSchema={formData?.schema}
                trigger={specificUserReference}
                onSave={(reference) => {
                  onChange({
                    specificUser: {
                      type: "reference",
                      userId: reference,
                      reference,
                    },
                  });
                }}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  }

  if (!data) return null;

  return (
    <div className="flex flex-col h-full">
      <AttributePanelHeader
        icon={<ApprovalIcon className="text-yellow" />}
        componentType={WorkflowNodeKey.Approval}
      />
      <div className="bg-gray-2 p-5 flex flex-col gap-4">
        {/* follow here */}
        <div>Description</div>
        <Input
          value={data?.description ?? ""}
          placeholder="eg. Financial check"
          onChange={(e) =>
            onChange({
              description: e.target.value,
            })
          }
        />
        <div>
          <div className="mb-2.5">
            {t("flow_attributes.approval.select_approve_by")}
          </div>
          <SingleSelect
            value={data?.approver}
            options={approverTypeOptions.map((opt) => ({
              ...opt,
              label: t(opt.label as string),
            }))}
            onChange={(value) =>
              handleApproverTypeChange(value as ApproverType)
            }
            placeholder={t("flow_attributes.approval.select_approver")}
          />
        </div>
      </div>
      <div className="bg-gray-2">
        {renderSubmenu(data?.approver)}
        <div className="flex flex-row px-5 gap-2 justify-center items-start pb-5">
          <Checkbox
            defaultChecked
            checked={data?.shouldSkip ?? true}
            onCheckedChange={(checked) => onChange({ shouldSkip: checked })}
          />
          Skip approvers with prior approval in reporting line
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
                    Configure visibility for this approval step.
                  </div>
                  <VisibilitySetting
                    value={data.componentRules ?? []}
                    formSchema={formData?.schema}
                    defaultSource="approval"
                    onChange={(nextRules) =>
                      onChange({ componentRules: nextRules })
                    }
                    formName={formData?.name}
                    header={
                      <div className="self-stretch h-12 rounded-md border border-stroke flex justify-between items-center overflow-hidden pr-5">
                        <div className="flex flex-row gap-5 h-full">
                          <div className="w-1 h-full bg-yellow" />
                          <div className="flex items-center gap-2">
                            <ApprovalIcon className="w-5 h-5 text-yellow" />
                            <div className="text-gray-500 text-base font-medium leading-6">
                              Approval
                            </div>
                          </div>
                        </div>
                        <div className="text-slate-400 text-base font-medium leading-6">
                          <div className="text-[#111928] text-sm font-medium flex flex-row items-center justify-center max-w-full">
                            <ApproveIcon className="h-4 w-4 mr-1.5" />
                            <div className="overflow-ellipsis overflow-hidden whitespace-nowrap">
                              {t(`${approverPrefix}.${data?.approver}`)}
                            </div>
                            <ApproverTag data={data} />
                          </div>
                        </div>
                      </div>
                    }
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

function AdvanceSetting() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col">
      <div className="bg-white px-5 text-dark font-medium w-full h-[58px] flex items-center text-base">
        {t("flow_attributes.approval.advanced_settings")}
      </div>
      <div className="flex flex-col p-5 gap-3">
        <div>{t("flow_attributes.approval.organization_reference_field")}</div>
        <Textarea placeholder="fx" />
      </div>
    </div>
  );
}
