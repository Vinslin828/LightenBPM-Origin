import LabelEdge from "@/components/react-flow/edges/label-edge";
import { MenuEdge } from "@/components/react-flow/edges/menu-edge";
import ApprovalNode from "@/components/react-flow/nodes/approval-node";
import ConditionNode from "@/components/react-flow/nodes/condition-node";
import EndNode from "@/components/react-flow/nodes/end-node";
import FormNode from "@/components/react-flow/nodes/form-node";
import ParallelApprovalNode from "@/components/react-flow/nodes/parallel-approval-node";
import SubflowNode from "@/components/react-flow/nodes/subflow-node";
import DummyNode from "@/components/react-flow/nodes/dummy-node";
import { SelectOption } from "@ui/select/single-select";
import {
  ApprovalNodeType,
  ApproverType,
  VisibilityRule,
  VisibilityAction,
  WorkflowEdgeKey,
  WorkflowNode,
  WorkflowNodeKey,
} from "@/types/flow";
import { EntityKey } from "@/types/form-builder";
import { Edge, StepEdge } from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import { PlaceholderNode } from "@/components/react-flow/nodes/placeholder-nodes";
import { FormDefinition } from "@/types/domain";

export const nodeTypes = {
  // header: HeaderNode,
  [WorkflowNodeKey.End]: EndNode,
  [WorkflowNodeKey.Approval]: ApprovalNode,
  [WorkflowNodeKey.ParallelApproval]: ParallelApprovalNode,
  [WorkflowNodeKey.Condition]: ConditionNode,
  [WorkflowNodeKey.Subflow]: SubflowNode,
  [WorkflowNodeKey.Form]: FormNode,
  [WorkflowNodeKey.Placeholder]: PlaceholderNode,
  [WorkflowNodeKey.DummyNode]: DummyNode,
  // menu: MenuNode,
};

export const edgeTypes = {
  [WorkflowEdgeKey.Step]: StepEdge,
  [WorkflowEdgeKey.Menu]: MenuEdge,
  [WorkflowEdgeKey.Label]: LabelEdge,
};

export const initialNodes: WorkflowNode[] = [
  {
    type: WorkflowNodeKey.Form,
    id: "form-node",
    data: {
      next: "end-node",
      parents: null,
    },
    position: { x: 0, y: 0 }, // poistion is not important since we use auto layout
  },
  {
    type: WorkflowNodeKey.End,
    id: "end-node",
    position: { x: 0, y: 0 }, // poistion is not important since we use auto layout
    data: {
      next: null,
      parents: ["form-node"],
    },
  },
];

export const initialEdges: Edge[] = [
  {
    id: uuidv4(),
    source: initialNodes[0].id,
    target: initialNodes[1].id,
    type: WorkflowEdgeKey.Label,
    data: { isHightLighted: true },
  },
];

export const approverTypeOptions: SelectOption<ApproverType>[] = [
  {
    label: "approver_type.applicant",
    value: ApproverType.Applicant,
    key: ApproverType.Applicant,
  },
  {
    label: "approver_type.applicant-report-line",
    value: ApproverType.ApplicantReportLine,
    key: ApproverType.ApplicantReportLine,
  },
  {
    label: "approver_type.user-report-line",
    value: ApproverType.UserReportLine,
    key: ApproverType.UserReportLine,
  },
  {
    label: "approver_type.department-supervisor",
    value: ApproverType.DepartmentSupervisor,
    key: ApproverType.DepartmentSupervisor,
  },
  {
    label: "approver_type.role",
    value: ApproverType.Role,
    key: ApproverType.Role,
  },
  {
    label: "approver_type.user",
    value: ApproverType.User,
    key: ApproverType.User,
  },
];

export const createDefaultWorkflowNode = (
  nodeType: WorkflowNode["type"],
  config?: { parents?: string[] | null; next?: string | null },
): WorkflowNode => {
  const position = { x: 0, y: 0 };
  const id = `${nodeType}-${Date.now()}`;

  switch (nodeType) {
    case WorkflowNodeKey.Approval:
      return {
        id,
        type: WorkflowNodeKey.Approval,
        position,
        data: {
          description: "",
          approver: ApproverType.Applicant,
          shouldSkip: true,
          componentRules: [],
          next: config?.next ?? null,
          parents: config?.parents ?? null,
        },
      };
    case WorkflowNodeKey.ParallelApproval:
      const newApprovalNode = createDefaultWorkflowNode(
        WorkflowNodeKey.Approval,
      ) as ApprovalNodeType;
      return {
        id,
        type: WorkflowNodeKey.ParallelApproval,
        position,
        // width: 594,
        // height: 136,
        data: {
          next: config?.next ?? null,
          parents: config?.parents ?? null,
          logic: "and",
          description: "",
          selectedApprovalIndex: null,
          approvals: [
            {
              ...newApprovalNode["data"],
            },
            {
              ...newApprovalNode["data"],
            },
          ],
        },
      };
    case WorkflowNodeKey.Condition:
      return {
        id,
        type: WorkflowNodeKey.Condition,
        position,

        data: {
          description: "",

          conditions: [
            {
              isExpression: false,
              name: "fallback-branch",
              next: null,
              branch: undefined,
            },
          ],
          next: config?.next ?? null,
          parents: config?.parents ?? null,
        },
      };

    case WorkflowNodeKey.Subflow:
      return {
        id,
        type: WorkflowNodeKey.Subflow,
        position,
        data: {
          description: "",
          workflow: null,
          workflowId: null,
          next: config?.next ?? null,
          parents: config?.parents ?? null,
        },
      };
    case WorkflowNodeKey.Form:
      return {
        id,
        type: WorkflowNodeKey.Form,
        position,
        data: {
          description: "",
          formName: "Employee Onboarding Form",
          formId: "",
          shouldSkip: true,
          componentRules: [],
          next: config?.next ?? null,
          parents: config?.parents ?? null,
        },
      };
    case WorkflowNodeKey.End:
      return {
        id,
        type: WorkflowNodeKey.End,
        position,
        selectable: false,
        data: {
          next: config?.next ?? null,
          parents: config?.parents ?? null,
        },
      };
    case WorkflowNodeKey.Placeholder:
      return {
        id,
        type: WorkflowNodeKey.Placeholder,
        position,
        data: {
          next: config?.next ?? null,
          parents: config?.parents ?? null,
        },
      };
    default:
      throw new Error(`Unknown node type: ${nodeType}`);
  }
};

export const getNodeLabelKey = (nodeKey: WorkflowNodeKey): string => {
  switch (nodeKey) {
    case WorkflowNodeKey.End:
      return "end_node";
    case WorkflowNodeKey.Approval:
      return "approval_node";
    case WorkflowNodeKey.ParallelApproval:
      return "parallel_approval_node";
    case WorkflowNodeKey.Condition:
      return "condition_node";
    case WorkflowNodeKey.Subflow:
      return "subflow_node";
    case WorkflowNodeKey.Form:
      return "form_node";
    default:
      return "unknown_node";
  }
};

export const VISIBILITY_ACTIONS = [
  VisibilityAction.HIDE,
  VisibilityAction.REQUIRED,
  VisibilityAction.EDITABLE,
  VisibilityAction.DISABLED,
] as const;

export const DEFAULT_VISIBILITY_OPTIONS: VisibilityAction[] = [
  VisibilityAction.HIDE,
  VisibilityAction.EDITABLE,
  VisibilityAction.DISABLED,
  VisibilityAction.REQUIRED,
];

export const VISIBILITY_OPTIONS: Partial<
  Record<EntityKey, VisibilityAction[]>
> = {
  [EntityKey.buttonDownload]: [
    VisibilityAction.HIDE,
    VisibilityAction.DISABLED,
  ],
  [EntityKey.buttonUrl]: [VisibilityAction.HIDE, VisibilityAction.DISABLED],
  [EntityKey.buttonApi]: [VisibilityAction.HIDE, VisibilityAction.EDITABLE],
  [EntityKey.buttonUpload]: [
    VisibilityAction.HIDE,
    VisibilityAction.REQUIRED,
    VisibilityAction.EDITABLE,
    VisibilityAction.DISABLED,
  ],
  [EntityKey.expressionField]: [VisibilityAction.HIDE],
  [EntityKey.grid]: [VisibilityAction.HIDE, VisibilityAction.EDITABLE],
  [EntityKey.separatorField]: [VisibilityAction.HIDE],
  [EntityKey.container]: [],
  [EntityKey.labelField]: [VisibilityAction.HIDE],
};

export const getVisibilityOptions = (
  entityType: EntityKey,
): VisibilityAction[] =>
  VISIBILITY_OPTIONS[entityType] ?? DEFAULT_VISIBILITY_OPTIONS;

export const supportsVisibilityAction = (
  entityType: EntityKey,
  action: VisibilityAction,
): boolean => getVisibilityOptions(entityType).includes(action);

export type VisibilityRuleSource = "form" | "approval";

const isVisibilityAction = (action: string): action is VisibilityAction =>
  VISIBILITY_ACTIONS.includes(action as VisibilityAction);

export const normalizeVisibilityActions = (
  actions: string[] = [],
): VisibilityRule["actions"] => {
  const normalized = Array.from(new Set(actions.filter(isVisibilityAction)));

  if (normalized.includes(VisibilityAction.HIDE)) {
    return [VisibilityAction.HIDE];
  }

  return normalized;
};

export const normalizeVisibilityRules = (
  rules: VisibilityRule[] | undefined,
): VisibilityRule[] => {
  if (!Array.isArray(rules)) return [];

  return rules.reduce<VisibilityRule[]>((acc, rule) => {
    if (!rule?.componentName) return acc;

    const actions = normalizeVisibilityActions(rule.actions);
    if (!actions.length) return acc;

    acc.push({
      ...rule,
      actions,
    });
    return acc;
  }, []);
};

const getBooleanAttribute = (
  attributes: Record<string, unknown>,
  key: string,
): boolean | undefined => {
  const value = attributes[key];
  return typeof value === "boolean" ? value : undefined;
};

const getRequiredAttribute = (
  attributes: Record<string, unknown>,
): boolean | undefined => {
  const directRequired = getBooleanAttribute(attributes, "required");
  if (directRequired !== undefined) return directRequired;

  const validator = attributes.validator;
  if (validator && typeof validator === "object") {
    const validatorRequired = getBooleanAttribute(
      validator as Record<string, unknown>,
      "required",
    );
    if (validatorRequired !== undefined) return validatorRequired;
  }

  return undefined;
};

const getHideAttribute = (
  attributes: Record<string, unknown>,
): boolean | undefined => {
  const hide = getBooleanAttribute(attributes, "hide");
  if (hide !== undefined) return hide;

  return getBooleanAttribute(attributes, "hidden");
};

const getSchemaDerivedVisibilityRules = (
  formSchema?: FormDefinition["schema"],
): VisibilityRule[] => {
  if (!formSchema?.entities) return [];

  return Object.values(formSchema.entities).reduce<VisibilityRule[]>(
    (acc, entity) => {
      const availableActions =
        VISIBILITY_OPTIONS[entity.type as EntityKey] ??
        DEFAULT_VISIBILITY_OPTIONS;

      const attributes = (entity.attributes ?? {}) as Record<string, unknown>;
      const componentName = attributes.name;
      if (typeof componentName !== "string" || !componentName.trim()) {
        return acc;
      }

      const actions: VisibilityAction[] = [];
      const isHidden = getHideAttribute(attributes) === true;
      const isDisabled = getBooleanAttribute(attributes, "disabled") === true;
      const isReadonly = getBooleanAttribute(attributes, "readonly");
      const isRequired = getRequiredAttribute(attributes) === true;

      if (isHidden && availableActions.includes(VisibilityAction.HIDE)) {
        actions.push(VisibilityAction.HIDE);
      } else if (
        isDisabled &&
        availableActions.includes(VisibilityAction.DISABLED)
      ) {
        actions.push(VisibilityAction.DISABLED);
      } else {
        if (
          isRequired &&
          availableActions.includes(VisibilityAction.REQUIRED)
        ) {
          actions.push(VisibilityAction.REQUIRED);
        }

        const shouldBeEditable = isReadonly === undefined ? true : !isReadonly;
        if (
          shouldBeEditable &&
          availableActions.includes(VisibilityAction.EDITABLE)
        ) {
          actions.push(VisibilityAction.EDITABLE);
        }
      }

      if (!actions.length) return acc;

      acc.push({
        componentName: componentName.trim(),
        actions: normalizeVisibilityActions(actions),
      });
      return acc;
    },
    [],
  );
};

export const buildDefaultVisibilityRules = (
  formSchema?: FormDefinition["schema"],
): VisibilityRule[] => getSchemaDerivedVisibilityRules(formSchema);

export const buildApprovalVisibilityRules = (
  formSchema?: FormDefinition["schema"],
): VisibilityRule[] =>
  getSchemaDerivedVisibilityRules(formSchema).map((rule) => ({
    ...rule,
    actions: rule.actions.filter(
      (action) => action !== VisibilityAction.EDITABLE,
    ),
  }));

export const buildDefaultVisibilityRulesBySource = (
  formSchema: FormDefinition["schema"] | undefined,
  source: VisibilityRuleSource,
): VisibilityRule[] =>
  source === "approval"
    ? buildApprovalVisibilityRules(formSchema)
    : buildDefaultVisibilityRules(formSchema);

export const resolveEffectiveVisibilityRules = (
  rules: VisibilityRule[] | undefined,
  formSchema: FormDefinition["schema"] | undefined,
  source: VisibilityRuleSource,
): VisibilityRule[] => {
  const normalizedRules = normalizeVisibilityRules(rules);
  if (normalizedRules.length > 0) {
    return normalizedRules;
  }

  return buildDefaultVisibilityRulesBySource(formSchema, source);
};

export const getVisibilityFallbackActionsByComponent = (
  formSchema: FormDefinition["schema"] | undefined,
  source: VisibilityRuleSource,
): Record<string, VisibilityAction[]> => {
  return buildDefaultVisibilityRulesBySource(formSchema, source).reduce<
    Record<string, VisibilityAction[]>
  >((acc, rule) => {
    acc[rule.componentName] = normalizeVisibilityActions(rule.actions);
    return acc;
  }, {});
};

export const buildDefaultEditableRules = buildDefaultVisibilityRules;
