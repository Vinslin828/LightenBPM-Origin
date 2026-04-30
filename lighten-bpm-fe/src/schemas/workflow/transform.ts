import { FlowDefinition, FormDefinition } from "@/types/domain";
import {
  BindFormResponse,
  WorkflowListItemResponse,
  WorkflowListResponse,
  WorkflowResponse,
  WorkflowRevisionResponse,
} from "./response";
import { tFormRevisionSchema, tFormSchema } from "../form/transform";
import z from "zod";
import { FormStatus } from "@/types/form-builder";
import {
  ApplicantSource,
  ApprovalNodeType,
  ApproverType,
  ApproveMethod,
  ConditionBranch,
  ConditionNodeData,
  ConditionNodeType,
  EndNodeData,
  EndNodeType,
  FormNodeData,
  FormNodeType,
  ParallelApprovalNodeData,
  ParallelApprovalNodeType,
  SubflowNodeData,
  SubflowNodeType,
  WorkflowNode,
  WorkflowNodeKey,
  WorkflowEdgeKey,
  UiExpression,
  CodeExpression,
  VisibilityAction,
  VisibilityRule,
  Branch as fBranch,
} from "@/types/flow";
import { Edge } from "@xyflow/react";
import {
  normalizeVisibilityRules,
  resolveEffectiveVisibilityRules,
} from "@/const/flow";

// const FORM_FIELD_REGEX = /\{\{\s*form\.([^.]+)\.value\s*\}\}/;

// const parseFormFieldReference = (field: string) => {
//   const match = field.match(FORM_FIELD_REGEX);
//   return match ? match[1] : field;
// };

const parseBranchFields = (branch: Branch): ConditionBranch["branch"] => {
  if ("expression" in branch) {
    return {
      expression: branch.expression,
    };
  }
  if ("logic" in branch) {
    return {
      logic: branch.logic,
      left: parseBranchFields(branch.left) as fBranch,
      right: parseBranchFields(branch.right) as fBranch,
    };
  }
  return {
    ...branch,
    field: branch.field,
  };
};

import {
  ApprovalNodeResponse,
  ApproverObjectResponse,
  ConditionNodeResponse,
  FlowDefinitionResponse,
  NodeResponse,
  Branch, // Import Branch
} from "./flow-definition";
import { FormResponse } from "../form/response";
import getConditionTreeName from "@/utils/get-tree-name";
import { tagSchema } from "../master-data/response";
import { tTag } from "../master-data/transform";
import is from "zod/v4/locales/is.cjs";
import { transformPaginatedResponse } from "../shared";

// Component visibility rules parser/deparser.
const isVisibilityAction = (action: string): action is VisibilityAction =>
  action === VisibilityAction.HIDE ||
  action === VisibilityAction.EDITABLE ||
  action === VisibilityAction.DISABLED ||
  action === VisibilityAction.REQUIRED;

export const parseComponentRulesForApi = (
  rules: VisibilityRule[] | undefined,
  allowedComponentNames?: Set<string>,
): Array<{
  component_name: string;
  actions: VisibilityAction[];
  condition?: string;
}> => {
  if (!Array.isArray(rules)) return [];

  return rules.reduce<
    Array<{
      component_name: string;
      actions: VisibilityAction[];
      condition?: string;
    }>
  >((acc, rule) => {
    if (!rule?.componentName) return acc;
    if (
      allowedComponentNames &&
      !allowedComponentNames.has(rule.componentName)
    ) {
      return acc;
    }

    const actions = Array.from(new Set(rule.actions ?? [])).filter(
      isVisibilityAction,
    );

    if (!actions.length) return acc;
    acc.push({
      component_name: rule.componentName,
      actions: actions.includes(VisibilityAction.HIDE)
        ? [VisibilityAction.HIDE]
        : actions,
      ...(rule.condition ? { condition: rule.condition } : {}),
    });
    return acc;
  }, []);
};

const deparseComponentRulesFromApi = (
  rules:
    | Array<{
        component_name: string;
        actions: string[];
        condition?: string;
      }>
    | undefined,
  allowedComponentNames?: Set<string>,
): VisibilityRule[] => {
  if (!Array.isArray(rules)) return [];

  return normalizeVisibilityRules(
    rules.reduce<VisibilityRule[]>((acc, rule) => {
      if (!rule?.component_name) return acc;
      if (
        allowedComponentNames &&
        !allowedComponentNames.has(rule.component_name)
      ) {
        return acc;
      }

      const actions = Array.from(new Set(rule.actions ?? []))
        .map((action) =>
          action === "disable" ? VisibilityAction.DISABLED : action,
        )
        .filter(isVisibilityAction);

      if (!actions.length) return acc;

      acc.push({
        componentName: rule.component_name,
        actions: actions.includes(VisibilityAction.HIDE)
          ? [VisibilityAction.HIDE]
          : actions,
        ...(rule.condition ? { condition: rule.condition } : {}),
      });
      return acc;
    }, []),
  );
};

const getAllowedComponentNamesFromFormSchema = (
  schema?: FormDefinition["schema"],
): Set<string> | undefined => {
  if (!schema?.entities) return undefined;

  const names = new Set<string>();
  Object.values(schema.entities).forEach((entity) => {
    const attributes = (entity?.attributes ?? {}) as Record<string, unknown>;
    const name = attributes.name;
    if (typeof name === "string" && name.trim().length > 0) {
      names.add(name.trim());
    }
  });

  return names;
};

const getAllowedComponentNamesFromBindingForm = (
  bindingForm?: FormResponse,
): Set<string> | undefined => {
  const entities = bindingForm?.revision?.form_schema?.entities;
  if (!entities) return undefined;

  const names = new Set<string>();
  Object.entries(entities).forEach(([entityKey, entity]) => {
    if (entityKey) names.add(entityKey);

    const attributes = ((entity as { attributes?: Record<string, unknown> })
      .attributes ?? {}) as Record<string, unknown> | undefined;
    const name = attributes?.name;
    if (typeof name === "string" && name.trim().length > 0) {
      names.add(name.trim());
    }
  });

  return names;
};

const getAllowedComponentNamesFromWorkflowNodes = (
  nodes: WorkflowNode[],
): Set<string> | undefined => {
  const formNode = nodes.find((node) => node.type === WorkflowNodeKey.Form);
  const formSchema = (formNode?.data as FormNodeType["data"] | undefined)?.form
    ?.schema;
  return getAllowedComponentNamesFromFormSchema(formSchema);
};

const getWorkflowFormSchema = (
  nodes: WorkflowNode[],
): FormDefinition["schema"] | undefined => {
  const formNode = nodes.find((node) => node.type === WorkflowNodeKey.Form);
  return (formNode?.data as FormNodeType["data"] | undefined)?.form?.schema;
};

// =================================================================
// Frontend -> Backend Parsers
// =================================================================

/**
 * Recursively sanitizes a frontend branch structure to conform to the backend schema
 * by converting `undefined` to `null`.
 * @param branch The frontend branch object.
 * @returns A sanitized branch object or null.
 */
function sanitizeBranch(branch: ConditionBranch["branch"]): Branch | null {
  if (!branch) {
    return null;
  }

  if ("expression" in branch) {
    return {
      expression: branch.expression,
    };
  }

  // Check if it's a complex ConditionNode
  if ("logic" in branch) {
    const left = sanitizeBranch(branch.left);
    const right = sanitizeBranch(branch.right);

    // If either side is null after sanitizing, the complex node is invalid for the backend.
    if (left === null || right === null) {
      return null;
    }

    return {
      logic: branch.logic,
      left: left,
      right: right,
    };
  }

  // It's a simple Expression
  const expression = branch as UiExpression;

  const isStringOperator =
    expression.operator === "contains" ||
    expression.operator === "not_contains" ||
    expression.operator === "equals" ||
    expression.operator === "not_equals";

  if (!isStringOperator) {
    // Convert to number

    return {
      ...expression,
      field: `${expression.field}`,
      value: Number(expression.value),
    };
  } else {
    return {
      ...expression,

      field: `${expression.field}`,
      value: String(expression.value),
    };
  }
}

/**
 * Converts a single frontend ApprovalNodeData to a backend ApproverObjectPayload.
 * This is a placeholder implementation and needs to be filled out with actual logic.
 * @param approvalData - The frontend approval node data.
 * @returns The backend approver object payload.
 */
function parseSingleApprover(
  approvalData: ApprovalNodeType["data"],
): ApproverObjectResponse {
  const ensureInt = (value?: string | number | null): number | undefined => {
    if (value === undefined || value === null) {
      return undefined;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.trunc(value);
    }
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return Math.trunc(parsed);
      }
    }
    return undefined;
  };

  const isJobGradeMethod = (
    method: ApproveMethod | undefined,
  ): method is ApproveMethod & { jobGrade: number } =>
    Boolean(method && "jobGrade" in method);

  const isApproveLevelMethod = (
    method: ApproveMethod | undefined,
  ): method is ApproveMethod & { approveLevel: number } =>
    Boolean(method && "approveLevel" in method);

  const buildHierarchyConfig = (method?: ApproveMethod, advanced?: string) => {
    let hierarchyMethod: "to_job_grade" | "to_level" = "to_job_grade";
    let jobGrade: number | undefined;
    let level: number | undefined;

    if (isJobGradeMethod(method)) {
      hierarchyMethod = "to_job_grade";
      jobGrade = method.jobGrade;
    } else if (isApproveLevelMethod(method)) {
      hierarchyMethod = "to_level";
      level = method.approveLevel;
    } else {
      jobGrade = 0;
    }

    const config: {
      method: "to_job_grade" | "to_level";
      job_grade?: number;
      level?: number;
      org_reference_field?: string;
    } = { method: hierarchyMethod };

    if (jobGrade !== undefined) {
      config.job_grade = jobGrade;
    }
    if (level !== undefined) {
      config.level = level;
    }
    if (advanced) {
      config.org_reference_field = advanced;
    }

    return config;
  };

  switch (approvalData.approver) {
    case ApproverType.Applicant:
      return {
        type: "applicant",
        config: {},
        description: approvalData.description,
        reuse_prior_approvals: approvalData.shouldSkip ?? true,
      };

    case ApproverType.ApplicantReportLine:
      return {
        type: "applicant_reporting_line",
        config: buildHierarchyConfig(
          approvalData.approveMethod,
          approvalData.advancedSetting,
        ),
        description: approvalData.description,
        reuse_prior_approvals: approvalData.shouldSkip ?? true,
      };

    case ApproverType.UserReportLine: {
      const specificUser = approvalData.specificUser;
      const parsedUserId = ensureInt(specificUser?.userId ?? "");
      const hasExplicitType = specificUser && "type" in specificUser;
      const source: "manual" | "form_field" = hasExplicitType
        ? specificUser!.type === "reference"
          ? "form_field"
          : "manual"
        : parsedUserId !== undefined
          ? "manual"
          : "form_field";

      const config: {
        source: "manual" | "form_field";
        user_id?: number;
        form_field?: string;
        method: "to_job_grade" | "to_level";
        job_grade?: number;
        level?: number;
        org_reference_field?: string;
      } = {
        source,
        ...buildHierarchyConfig(
          approvalData.approveMethod,
          approvalData.advancedSetting,
        ),
      };

      if (source === "manual") {
        config.user_id = parsedUserId ?? ensureInt(specificUser.userId) ?? 0;
      } else {
        const referenceValue =
          specificUser.type === "reference"
            ? (specificUser.reference ?? specificUser.userId ?? "")
            : (specificUser.userId ?? "");
        config.form_field = referenceValue;
      }

      return {
        type: "specific_user_reporting_line",
        config,
        description: approvalData.description,
        reuse_prior_approvals: approvalData.shouldSkip ?? true,
      };
    }
    case ApproverType.DepartmentSupervisor: {
      const departmentSupervisor = approvalData.departmentSupervisor;
      let source: "manual" | "form_field" = "manual";
      let orgUnitId: number | undefined;
      let formField: string | undefined;

      if (departmentSupervisor?.type === "manual") {
        source = "manual";
        orgUnitId = ensureInt(departmentSupervisor.departmentId) ?? 0;
      } else if (departmentSupervisor?.type === "reference") {
        source = "form_field";
        formField = departmentSupervisor.reference ?? "";
      } else {
        orgUnitId = 0;
      }

      const config: {
        source: "manual" | "form_field";
        org_unit_id?: number;
        form_field?: string;
      } = { source };

      if (source === "manual") {
        config.org_unit_id = orgUnitId ?? 0;
      } else {
        config.form_field = formField ?? "";
      }

      return {
        type: "department_head",
        config,
        description: approvalData.description,
        reuse_prior_approvals: approvalData.shouldSkip ?? true,
      };
    }
    case ApproverType.Role: {
      const roleId = ensureInt(approvalData.specificRole?.roleId) ?? 0;
      return {
        type: "role",
        config: {
          role_id: roleId,
        },
        description: approvalData.description,
        reuse_prior_approvals: approvalData.shouldSkip ?? true,
      };
    }

    case ApproverType.User: {
      const specificUser = approvalData.specificUser;
      const isExpressionSource = specificUser?.type === "reference";
      const expressionValue = isExpressionSource
        ? (specificUser?.reference ?? specificUser?.userId ?? "")
        : "";

      const manualUser = specificUser as
        | { type: "manual"; userIds?: string[] }
        | undefined;
      const parsedUserIds = (manualUser?.userIds ?? [])
        .map((id) => ensureInt(id))
        .filter((id): id is number => id !== undefined);

      return {
        type: "specific_users",
        config: isExpressionSource
          ? {
              source: "expression",
              expression: expressionValue,
            }
          : {
              source: "manual",
              user_ids: parsedUserIds,
            },
        description: approvalData.description,
        reuse_prior_approvals: approvalData.shouldSkip ?? true,
      };
    }

    default:
      return {
        type: "applicant",
        config: {},
        description: undefined,
        reuse_prior_approvals: true,
      };
  }
}

// =================================================================
// Backend -> Frontend Deparsers
// =================================================================

function deparseSingleApprover(
  singleApprover: ApproverObjectResponse,
): ApprovalNodeType["data"] {
  let data: ApprovalNodeType["data"];

  const buildApproveMethod = (method: {
    method: "to_job_grade" | "to_level";
    job_grade?: number;
    level?: number;
  }): ApproveMethod => {
    if (method.method === "to_job_grade") {
      return {
        method: "to_job_grade",
        jobGrade: method.job_grade ?? 0,
      };
    } else {
      // method.method === 'to_level'
      return {
        method: "to_level",
        approveLevel: method.level ?? 0,
      };
    }
  };

  switch (singleApprover.type) {
    case "applicant":
      data = {
        description: singleApprover.description,
        approver: ApproverType.Applicant,
        shouldSkip: singleApprover.reuse_prior_approvals ?? true,
        next: null,
        parents: null,
      };
      break;

    case "applicant_reporting_line": {
      const config = singleApprover.config;
      data = {
        description: singleApprover.description,
        approver: ApproverType.ApplicantReportLine,
        approveMethod: buildApproveMethod(config),
        shouldSkip: singleApprover.reuse_prior_approvals ?? true,
        advancedSetting: config?.org_reference_field ?? "",
        next: null,
        parents: null,
      };
      break;
    }

    case "specific_user_reporting_line": {
      const config = singleApprover.config;
      data = {
        description: singleApprover.description,
        approver: ApproverType.UserReportLine,
        approveMethod: buildApproveMethod(config),
        shouldSkip: singleApprover.reuse_prior_approvals ?? true,
        advancedSetting: config?.org_reference_field ?? "",
        specificUser:
          config?.source === "form_field"
            ? {
                type: "reference" as const,
                userId: config?.form_field ?? "",
                reference: config?.form_field ?? "",
              }
            : {
                type: "manual" as const,
                userId:
                  config?.user_id !== undefined ? String(config.user_id) : "",
                user: undefined,
              },
        next: null,
        parents: null,
      };
      break;
    }

    case "department_head": {
      const config = singleApprover.config;
      data = {
        description: singleApprover.description,
        approver: ApproverType.DepartmentSupervisor,
        shouldSkip: singleApprover.reuse_prior_approvals ?? true,
        departmentSupervisor: {
          type: config?.source === "manual" ? "manual" : "reference",
          departmentId:
            config?.org_unit_id !== undefined ? String(config.org_unit_id) : "",
          reference: config?.form_field ?? "",
        },
        next: null,
        parents: null,
      };
      break;
    }

    case "role": {
      const config = singleApprover.config;
      data = {
        description: singleApprover.description,
        approver: ApproverType.Role,
        shouldSkip: singleApprover.reuse_prior_approvals ?? true,
        specificRole: {
          type: "manual",
          roleId: config?.role_id !== undefined ? String(config.role_id) : "",
          role: undefined,
        },
        next: null,
        parents: null,
      };
      break;
    }

    case "specific_users": {
      const config = singleApprover.config;
      const isExpressionSource =
        config?.source === "expression" || config?.source === "form_field";
      data = {
        description: singleApprover.description,
        approver: ApproverType.User,
        shouldSkip: singleApprover.reuse_prior_approvals ?? true,
        specificUser: isExpressionSource
          ? {
              type: "reference",
              userId: config?.expression ?? config?.form_field ?? "",
              reference: config?.expression ?? config?.form_field ?? "",
            }
          : {
              type: "manual",
              userIds: (config?.user_ids ?? []).map(String),
            },
        next: null,
        parents: null,
      };
      break;
    }

    default:
      data = {
        // description: approvalNode.description,
        approver: ApproverType.Applicant,
        next: null,
        parents: null,
      };
  }
  return {
    ...data,
  };
}

/**
 * Converts a backend node definition to a frontend React Flow node and its edges.
 * @param backendNode - The backend node object.
 * @returns An object containing the frontend node and any outgoing edges.
 */
function deparseNode(
  backendNode: NodeResponse,
  allowedComponentNames?: Set<string>,
): {
  node: WorkflowNode;
  edges: Edge[];
} {
  const position = { x: 0, y: 0 }; // Default position
  const edges: Edge[] = [];

  switch (backendNode.type) {
    case "start": {
      const startRules = deparseComponentRulesFromApi(
        backendNode.component_rules,
        allowedComponentNames,
      );
      const applicantSource: ApplicantSource =
        backendNode.applicant_source === "submitter"
          ? "submitter"
          : "selection";
      const node: FormNodeType = {
        id: backendNode.key,
        type: WorkflowNodeKey.Form,
        position,
        data: {
          description: backendNode.description,
          next: backendNode.next ?? null,
          parents: null,
          applicantSource,
          ...(startRules.length ? { componentRules: startRules } : {}),
        },
      };
      return { node, edges };
    }
    case "approval": {
      const approvalNode = backendNode as ApprovalNodeResponse;
      const approvalNodeRules = deparseComponentRulesFromApi(
        approvalNode.component_rules,
        allowedComponentNames,
      );
      if (approvalNode.approval_method === "single") {
        const singleApprover = approvalNode.approvers as ApproverObjectResponse;
        const data = deparseSingleApprover(singleApprover);
        const approverRules = deparseComponentRulesFromApi(
          singleApprover.component_rules,
          allowedComponentNames,
        );
        // New API spec stores rules inside approvers. Keep node-level fallback for older payloads.
        const componentRules =
          approverRules.length > 0 ? approverRules : approvalNodeRules;
        const node: ApprovalNodeType = {
          id: approvalNode.key,
          type: WorkflowNodeKey.Approval,
          position,
          data: {
            ...data,
            next: approvalNode.next ?? null,
            parents: null,
            ...(componentRules.length ? { componentRules } : {}),
          },
        };
        return { node, edges };
      } else {
        // Parallel
        const parallelApprovers =
          approvalNode.approvers as ApproverObjectResponse[];
        const approvals = parallelApprovers.map((approver) => {
          console.debug(
            "here 2",
            deparseSingleApprover(approver),
            approver,
            approvalNode,
          );
          const approverRules = deparseComponentRulesFromApi(
            approver.component_rules,
            allowedComponentNames,
          );
          return {
            ...deparseSingleApprover(approver),
            ...(approverRules.length ? { componentRules: approverRules } : {}),
            // description: approver.description,
            // shouldSkip: approver.reuse_prior_approvals ?? true,
          } satisfies ApprovalNodeType["data"];
        });

        const node: ParallelApprovalNodeType = {
          id: approvalNode.key,
          type: WorkflowNodeKey.ParallelApproval,
          position,
          data: {
            description: approvalNode.description,
            logic: approvalNode.approval_logic === "AND" ? "and" : "or",
            selectedApprovalIndex: null,
            approvals: approvals,
            next: approvalNode.next ?? null,
            parents: null,
          },
        };
        return { node, edges };
      }
    }

    case "condition": {
      const conditionNode = backendNode as ConditionNodeResponse;
      const node: ConditionNodeType = {
        id: conditionNode.key,
        type: WorkflowNodeKey.Condition,
        position,
        data: {
          description: conditionNode.description,
          conditions: conditionNode.conditions.map((c) => {
            const newBranch = c.branch
              ? parseBranchFields(c.branch)
              : undefined;
            const isExpression = Boolean(
              newBranch && "expression" in newBranch,
            );
            return {
              name:
                c.branch === null
                  ? "fallback-branch"
                  : isExpression
                    ? (newBranch as CodeExpression).expression
                    : getConditionTreeName(newBranch),
              isExpression,
              branch: newBranch,
              next: c.next,
            } as ConditionBranch;
          }),
          next: backendNode.next ?? null,
          parents: null,
        },
      };
      console.debug({ node });
      return { node, edges };
    }

    case "subflow": {
      const node: SubflowNodeType = {
        id: backendNode.key,
        type: WorkflowNodeKey.Subflow,
        position,
        data: {
          description: backendNode.description,
          workflowId: backendNode.subflow_id,
          workflow: null,
          next: backendNode.next ?? null,
          parents: null,
        },
      };
      return { node, edges };
    }

    case "end": {
      const node: EndNodeType = {
        id: backendNode.key,
        type: WorkflowNodeKey.End,
        position,
        data: {
          description: backendNode.description,
          next: null,
          parents: null,
        },
      };
      return { node, edges };
    }
  }
}

/**
 * Converts a backend flow definition into frontend nodes and edges.
 * @param data - The backend flow definition payload.
 * @returns An object containing the arrays of frontend nodes and edges.
 */
export function deparseFlow(
  data: FlowDefinitionResponse,
  bindingForm?: FormResponse,
): {
  nodes: WorkflowNode[];
  edges: Edge[];
} {
  const allNodes: WorkflowNode[] = [];
  const allowedComponentNames =
    getAllowedComponentNamesFromBindingForm(bindingForm);

  data.nodes.forEach((backendNode) => {
    const { node, edges } = deparseNode(backendNode, allowedComponentNames);
    allNodes.push(node);
  });

  if (bindingForm) {
    console.debug({ bindingForm });
    const formNode = allNodes.find(
      (node) => node.type === WorkflowNodeKey.Form,
    );

    if (formNode) {
      formNode.data.form = tFormSchema(bindingForm);
    }
  }

  const nodeIds = new Set(allNodes.map((n) => n.id));
  const derivedEdges: Edge[] = [];

  allNodes.forEach((node) => {
    if (node.type === WorkflowNodeKey.Condition) {
      const data = node.data as ConditionNodeData;
      data.conditions?.forEach((condition, index) => {
        if (condition.next && nodeIds.has(condition.next)) {
          derivedEdges.push({
            id: `${node.id}-condition-${index}-to-${condition.next}`,
            source: node.id,
            target: condition.next,
            type: WorkflowEdgeKey.Label,
            data: {
              label:
                condition.name === "fallback-branch"
                  ? "Fallback"
                  : condition.name,
              index,
            },
            sourceHandle: "bottom",
            targetHandle: "top",
          });
        }
      });
      return;
    }

    const nextNodeId = node.data.next;
    if (nextNodeId && nodeIds.has(nextNodeId)) {
      derivedEdges.push({
        id: `${node.id}-to-${nextNodeId}`,
        source: node.id,
        target: nextNodeId,
        type: WorkflowEdgeKey.Label,
        sourceHandle: "bottom",
        targetHandle: "top",
      });
    }
  });

  const parentMap = new Map<string, Set<string>>();
  derivedEdges.forEach((edge) => {
    const targetSet = parentMap.get(edge.target) ?? new Set<string>();
    targetSet.add(edge.source);
    parentMap.set(edge.target, targetSet);
  });

  const nodesWithParents = allNodes.map((node) => {
    const parents = Array.from(parentMap.get(node.id) ?? []);
    return {
      ...node,
      data: {
        ...node.data,
        parents,
      },
    } as WorkflowNode;
  });

  return { nodes: nodesWithParents, edges: derivedEdges };
}

/**
 * Converts frontend nodes and edges to the backend's flow definition format.
 * @param nodes - The array of frontend workflow nodes.
 * @param edges - The array of edges connecting the nodes.
 * @returns A backend-compatible flow definition payload.
 */
export function parseFlow(
  nodes: WorkflowNode[],
  _edges: Edge[],
): FlowDefinitionResponse {
  const allowedComponentNames =
    getAllowedComponentNamesFromWorkflowNodes(nodes);
  const workflowFormSchema = getWorkflowFormSchema(nodes);
  const backendNodes: NodeResponse[] = nodes
    .map((node): NodeResponse | null => {
      switch (node.type) {
        case WorkflowNodeKey.Form: {
          const formData = node.data as FormNodeType["data"];
          const applicantSource = formData.applicantSource;
          return {
            key: node.id,
            type: "start",
            next: node.data.next ?? "end", // Default to 'end' if no next node
            description: node.data.description,
            component_rules: parseComponentRulesForApi(
              resolveEffectiveVisibilityRules(
                formData.componentRules,
                formData.form?.schema ?? workflowFormSchema,
                "form",
              ),
              allowedComponentNames,
            ),
            ...(applicantSource === "submitter"
              ? { applicant_source: "submitter" as const }
              : { applicant_source: "selection" as const }),
          };
        }

        case WorkflowNodeKey.Approval: {
          const approvalData = node.data as ApprovalNodeType["data"];
          const approver = parseSingleApprover(approvalData);
          return {
            key: node.id,
            type: "approval",
            next: approvalData.next ?? undefined,
            // description: node.data.description,
            approval_method: "single",
            approvers: {
              ...approver,
              component_rules: parseComponentRulesForApi(
                resolveEffectiveVisibilityRules(
                  approvalData.componentRules,
                  workflowFormSchema,
                  "approval",
                ),
                allowedComponentNames,
              ),
            },
          };
        }

        case WorkflowNodeKey.ParallelApproval: {
          const parallelData = node.data as ParallelApprovalNodeData;
          console.debug({ parallelData });
          return {
            key: node.id,
            type: "approval",
            next: parallelData.next ?? undefined,
            description: node.data.description,
            approval_method: "parallel",
            approval_logic: parallelData.logic === "and" ? "AND" : "OR",
            approvers: parallelData.approvals.map((approval) => {
              return {
                ...parseSingleApprover(approval),
                // description: approval.description,
                // reuse_prior_approvals: approval.shouldSkip,
                component_rules: parseComponentRulesForApi(
                  resolveEffectiveVisibilityRules(
                    approval.componentRules,
                    workflowFormSchema,
                    "approval",
                  ),
                  allowedComponentNames,
                ),
              };
            }),
          };
        }

        case WorkflowNodeKey.Condition: {
          const conditionData = node.data as ConditionNodeData;
          console.debug({ conditionData });

          return {
            key: node.id,
            type: "condition",
            description: node.data.description,
            conditions: conditionData.conditions.map((cond) => {
              return {
                branch: sanitizeBranch(cond.branch),
                next: cond.next ?? "end",
              };
            }),
          };
        }

        case WorkflowNodeKey.Subflow: {
          const subflowData = node.data as SubflowNodeData;
          return {
            key: node.id,
            type: "subflow",
            next: subflowData.next ?? "",
            description: node.data.description,
            subflow_id: subflowData.workflowId ?? "",
          };
        }

        case WorkflowNodeKey.End:
          return {
            key: node.id,
            type: "end",
            description: node.data.description,
            next: undefined,
          };

        // Placeholder and Dummy nodes are not sent to the backend
        default:
          return null;
      }
    })
    .filter((node): node is NodeResponse => node !== null);

  return {
    version: 1, // Default version
    nodes: backendNodes,
  };
}

// =================================================================
// Main Transform Functions
// =================================================================

export function tWorkflowSchema(data: WorkflowResponse): FlowDefinition {
  const { nodes, edges } = data.revision.flow_definition
    ? deparseFlow(data.revision.flow_definition, data.bindingForm)
    : { nodes: [], edges: [] };
  return {
    id: data.workflow_id,
    revisionId: data.revision.revision_id,
    name: data.revision.name,
    description: data.revision.description ?? "",
    tags: z.array(tagSchema.transform(tTag)).parse(data.tags),
    version: data.revision.version,
    nodes,
    edges,
    createdAt: data.revision.created_at,
    updatedAt: "", // Backend doesn't provide top-level updatedAt
    publishStatus: data.is_active ? FormStatus.Published : FormStatus.Draft,
    serialPrefix: data.serial_prefix ?? "APP",
  };
}

export function tWorkflowListItem(
  data: WorkflowListItemResponse,
): FlowDefinition {
  return {
    id: data.workflow_id,
    revisionId: data.revisionId,
    name: data.name,
    description: data.description, // Not available in list item response
    tags: z.array(tagSchema.transform(tTag)).parse(data.tags),
    version: 1, // Not available in list item response
    nodes: [], // Not available in list item response
    edges: [], // Not available in list item response
    createdAt: data.created_at,
    updatedAt: "",
    publishStatus: data.is_active ? FormStatus.Published : FormStatus.Draft,
    serialPrefix: "APP",
  };
}

export function tWorkflowList(data: WorkflowListResponse) {
  return transformPaginatedResponse(data, tWorkflowListItem);
}
export function tWorkflowRevisionSchema(
  data: WorkflowRevisionResponse,
): FlowDefinition {
  const { nodes, edges } = data.flow_definition?.nodes
    ? deparseFlow(data.flow_definition)
    : { nodes: [], edges: [] };

  return {
    id: data.workflow_id,
    revisionId: data.revision_id,
    name: data.name,
    description: data.description ?? "",
    tags: [],
    version: data.version,
    nodes: nodes,
    edges: edges,
    createdAt: data.created_at,
    updatedAt: "",
    publishStatus:
      data.status === "ACTIVE" ? FormStatus.Published : FormStatus.Draft,
    serialPrefix: "APP",
  };
}

export function tBindFormSchema(data: BindFormResponse): FormDefinition {
  return tFormRevisionSchema(data.formRevision);
}
