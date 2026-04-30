import {
  FlowDefinition,
  NodeType,
  FormSchema,
  FormFieldEntity,
  COMPONENT_RULE_ACTION,
  ComponentRule,
  ApprovalMethod,
  ApprovalNode,
} from '../../flow-engine/types';
import {
  findNodeByKey,
  getStartNode,
} from '../../flow-engine/shared/flow/flow-utils';

// =============================================================================
// Types
// =============================================================================

export const VIEWER_ROLE = {
  ADMIN: 'admin',
  APPLICANT_DRAFT: 'applicant_draft',
  APPLICANT: 'applicant',
  APPROVER: 'approver',
  APPROVER_ACTIVE: 'approver_active',
} as const;

export type ViewerRole = (typeof VIEWER_ROLE)[keyof typeof VIEWER_ROLE];

export interface ResolvedComponentRules {
  hiddenNames: string[];
  editableNames: string[];
  disableNames: string[];
  requiredNames: string[];
}

/**
 * Identifies an approver group a viewer is assigned to.
 * - nodeKey: the approval node's key
 * - groupIndex: index into node.approvers (parallel) or 0 (single)
 */
export interface ApproverGroupRef {
  nodeKey: string;
  groupIndex: number;
}

interface NodeRules {
  hiddenNames: string[];
  editableNames: string[];
  disableNames: string[];
  requiredNames: string[];
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Resolve final component rules based on viewer role.
 *
 * Start node rules are read from flowDefinition. Approver rules are looked up
 * from flowDefinition using `myApproverGroups` — one entry per ApproverConfig
 * the viewer belongs to (single approval node contributes one group; parallel
 * approval contributes one group per matching approverConfig).
 *
 * | Role             | hidden              | editable    | disabled               | required              |
 * |------------------|---------------------|-------------|------------------------|-----------------------|
 * | admin            | —                   | —           | start node             | start node            |
 * | applicant_draft  | start node          | start node  | start node             | start node            |
 * | applicant        | start node          | —           | start node             | start node            |
 * | approver         | approver intersect  | —           | start node             | —                     |
 * | approver_active  | approver intersect  | approver    | start + approver merge | start + approver union|
 */
export function resolveComponentRules(
  flowDefinition: FlowDefinition,
  role: ViewerRole,
  myApproverGroups: ApproverGroupRef[] = [],
): ResolvedComponentRules {
  const startRules = getStartNodeRules(flowDefinition);

  switch (role) {
    case VIEWER_ROLE.ADMIN:
      return {
        hiddenNames: [],
        editableNames: [],
        disableNames: startRules.disableNames,
        requiredNames: startRules.requiredNames,
      };

    case VIEWER_ROLE.APPLICANT_DRAFT:
      return startRules;

    case VIEWER_ROLE.APPLICANT:
      return {
        hiddenNames: startRules.hiddenNames,
        editableNames: [],
        disableNames: startRules.disableNames,
        requiredNames: startRules.requiredNames,
      };

    case VIEWER_ROLE.APPROVER: {
      const approverRules = getApproverRules(flowDefinition, myApproverGroups);
      return {
        hiddenNames: approverRules.hiddenNames,
        editableNames: [],
        disableNames: startRules.disableNames,
        requiredNames: [],
      };
    }

    case VIEWER_ROLE.APPROVER_ACTIVE: {
      const approverRules = getApproverRules(flowDefinition, myApproverGroups);
      return approverRules;
    }
  }
}

/**
 * Resolve `ApproverGroupRef[]` → component_rules arrays from flowDefinition,
 * then merge them into a single NodeRules result.
 *
 * - Single approval node: approvers is an object → used when groupIndex === 0
 * - Parallel approval node: approvers is an array → indexed by groupIndex
 *
 * Hidden: intersection across all groups (only hide if hidden in ALL groups).
 * Editable / Disable / Required: union across all groups.
 */
function getApproverRules(
  flowDefinition: FlowDefinition,
  groups: ApproverGroupRef[],
): NodeRules {
  if (groups.length === 0) {
    return emptyNodeRules();
  }

  const perGroup: NodeRules[] = [];
  for (const { nodeKey, groupIndex } of groups) {
    const node = findNodeByKey(flowDefinition, nodeKey);
    if (!node || node.type !== NodeType.APPROVAL) continue;
    const approverConfig = getApproverConfigByIndex(node, groupIndex);
    if (!approverConfig) continue;
    perGroup.push(extractRuleNames(approverConfig.component_rules ?? []));
  }

  if (perGroup.length === 0) {
    return emptyNodeRules();
  }

  // Hidden: intersection; editable / disable / required: union.
  const hiddenSets = perGroup.map((g) => new Set(g.hiddenNames));
  const hiddenNames = [...hiddenSets[0]].filter((name) =>
    hiddenSets.every((set) => set.has(name)),
  );

  return {
    hiddenNames,
    editableNames: perGroup.flatMap((g) => g.editableNames),
    disableNames: perGroup.flatMap((g) => g.disableNames),
    requiredNames: perGroup.flatMap((g) => g.requiredNames),
  };
}

function getApproverConfigByIndex(node: ApprovalNode, groupIndex: number) {
  if (node.approval_method === ApprovalMethod.SINGLE) {
    return groupIndex === 0 ? node.approvers : undefined;
  }
  return node.approvers[groupIndex];
}

/**
 * Apply component rules to form_schema and form_data.
 *
 * 1. Removes hidden components from root, entities, and form_data.
 * 2. Applies readonly: editable → readonly: false, others → readonly: true.
 * 3. Applies disabled: disable → disabled: true, others → disabled: false.
 * 4. Applies required: required → required: true, others → required: false.
 *
 * Returns new objects without mutating originals.
 */
export function applyComponentRules(
  formSchema: FormSchema,
  formData: Record<string, unknown>,
  hiddenComponentNames: string[],
  editableComponentNames: string[] = [],
  disableComponentNames: string[] = [],
  requiredComponentNames: string[] = [],
): { filteredSchema: FormSchema; filteredData: Record<string, unknown> } {
  // Step 1: Hide
  const { schema, data } = filterHiddenComponents(
    formSchema,
    formData,
    hiddenComponentNames,
  );

  // Step 2: Readonly (editable → readonly: false, others → readonly: true)
  const withReadonly = applyReadonlyToEntities(schema, editableComponentNames);

  // Step 3: Disabled (disable → disabled: true, others → disabled: false)
  const withDisabled = applyDisableToEntities(
    withReadonly,
    disableComponentNames,
  );

  // Step 4: Required (required → required: true, others → required: false)
  const filteredSchema = applyRequiredToEntities(
    withDisabled,
    requiredComponentNames,
  );

  return { filteredSchema, filteredData: data };
}

// =============================================================================
// Private — rule extractors
// =============================================================================

/**
 * Partition a ComponentRule[] into per-action name arrays.
 * Shared between start-node and approver-group rule collection.
 */
function extractRuleNames(rules: ComponentRule[]): NodeRules {
  const hiddenNames: string[] = [];
  const editableNames: string[] = [];
  const disableNames: string[] = [];
  const requiredNames: string[] = [];

  for (const rule of rules) {
    if (rule.condition) continue;
    if (rule.actions.includes(COMPONENT_RULE_ACTION.HIDE)) {
      hiddenNames.push(rule.component_name);
    }
    if (rule.actions.includes(COMPONENT_RULE_ACTION.EDITABLE)) {
      editableNames.push(rule.component_name);
    }
    if (rule.actions.includes(COMPONENT_RULE_ACTION.DISABLED)) {
      disableNames.push(rule.component_name);
    }
    if (rule.actions.includes(COMPONENT_RULE_ACTION.REQUIRED)) {
      requiredNames.push(rule.component_name);
    }
  }

  return { hiddenNames, editableNames, disableNames, requiredNames };
}

function emptyNodeRules(): NodeRules {
  return {
    hiddenNames: [],
    editableNames: [],
    disableNames: [],
    requiredNames: [],
  };
}

/**
 * Extract component rules from start node.
 */
function getStartNodeRules(flowDefinition: FlowDefinition): NodeRules {
  const startNode = getStartNode(flowDefinition);
  if (
    !startNode ||
    !('component_rules' in startNode) ||
    !startNode.component_rules
  ) {
    return emptyNodeRules();
  }
  return extractRuleNames(startNode.component_rules);
}

// =============================================================================
// Private — schema transformers
// =============================================================================

/**
 * Remove hidden components from root, entities, and form_data.
 *
 * Handles container components (components with `children`):
 * 1. A hidden leaf is removed; its id is also stripped from parent's
 *    `children` array and `slotMapping`.
 * 2. If a container's children all become hidden, the container itself
 *    is propagated as hidden (repeated until stable, so nested containers
 *    collapse correctly).
 */
function filterHiddenComponents(
  formSchema: FormSchema,
  formData: Record<string, unknown>,
  hiddenComponentNames: string[],
): { schema: FormSchema; data: Record<string, unknown> } {
  if (hiddenComponentNames.length === 0) {
    return { schema: formSchema, data: formData };
  }

  const hiddenNameSet = new Set(hiddenComponentNames);

  // Step 1: collect leaf hidden entity ids by matching name.
  const hiddenEntityIds = new Set<string>();
  for (const [entityId, entity] of Object.entries(formSchema.entities)) {
    if (entity.attributes?.name && hiddenNameSet.has(entity.attributes.name)) {
      hiddenEntityIds.add(entityId);
    }
  }

  // Step 2: propagate — if all children of a container are hidden, the
  // container itself becomes hidden. Loop until stable to handle nesting.
  let changed = true;
  while (changed) {
    changed = false;
    for (const [entityId, entity] of Object.entries(formSchema.entities)) {
      if (hiddenEntityIds.has(entityId)) continue;
      const children = entity.children;
      if (
        children &&
        children.length > 0 &&
        children.every((childId) => hiddenEntityIds.has(childId))
      ) {
        hiddenEntityIds.add(entityId);
        changed = true;
      }
    }
  }

  // Step 3: collect names of every hidden entity (including propagated
  // containers) so we can strip them from form_data.
  const hiddenNamesAll = new Set<string>();
  for (const id of hiddenEntityIds) {
    const name = formSchema.entities[id]?.attributes?.name;
    if (name) hiddenNamesAll.add(name);
  }

  // Step 4: rebuild root without hidden top-level entities.
  const filteredRoot = formSchema.root.filter((id) => !hiddenEntityIds.has(id));

  // Step 5: rebuild entities, cleaning surviving containers' `children`
  // and `slotMapping` references to hidden entities.
  const filteredEntities: FormSchema['entities'] = {};
  for (const [entityId, entity] of Object.entries(formSchema.entities)) {
    if (hiddenEntityIds.has(entityId)) continue;

    let cleaned: FormFieldEntity = entity;

    if (entity.children?.some((childId) => hiddenEntityIds.has(childId))) {
      cleaned = {
        ...cleaned,
        children: entity.children.filter((id) => !hiddenEntityIds.has(id)),
      };
    }

    const slotMapping = entity.attributes?.slotMapping;
    if (
      slotMapping &&
      Object.keys(slotMapping).some((id) => hiddenEntityIds.has(id))
    ) {
      const newSlotMapping: Record<string, number> = {};
      for (const [childId, slot] of Object.entries(slotMapping)) {
        if (!hiddenEntityIds.has(childId)) newSlotMapping[childId] = slot;
      }
      cleaned = {
        ...cleaned,
        attributes: { ...cleaned.attributes, slotMapping: newSlotMapping },
      };
    }

    filteredEntities[entityId] = cleaned;
  }

  // Step 6: rebuild form_data without hidden field values.
  const filteredData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(formData)) {
    if (!hiddenNamesAll.has(key)) {
      filteredData[key] = value;
    }
  }

  return {
    schema: { root: filteredRoot, entities: filteredEntities },
    data: filteredData,
  };
}

/**
 * Apply readonly attribute to all entities.
 * Editable components → readonly: false, others → readonly: true.
 */
function applyReadonlyToEntities(
  formSchema: FormSchema,
  editableComponentNames: string[],
): FormSchema {
  const editableNames = new Set(editableComponentNames);

  const updatedEntities: FormSchema['entities'] = {};
  for (const [entityId, entity] of Object.entries(formSchema.entities)) {
    const isEditable =
      entity.attributes?.name && editableNames.has(entity.attributes.name);
    updatedEntities[entityId] = {
      ...entity,
      attributes: { ...entity.attributes, readonly: !isEditable },
    };
  }

  return { root: formSchema.root, entities: updatedEntities };
}

/**
 * Apply disabled attribute to all entities.
 * Disable components → disabled: true, others → disabled: false.
 */
function applyDisableToEntities(
  formSchema: FormSchema,
  disableComponentNames: string[],
): FormSchema {
  const disableNames = new Set(disableComponentNames);

  const updatedEntities: FormSchema['entities'] = {};
  for (const [entityId, entity] of Object.entries(formSchema.entities)) {
    const isDisable =
      entity.attributes?.name && disableNames.has(entity.attributes.name);
    updatedEntities[entityId] = {
      ...entity,
      attributes: { ...entity.attributes, disabled: !!isDisable },
    };
  }

  return { root: formSchema.root, entities: updatedEntities };
}

/**
 * Apply required attribute to all entities.
 * Required components → required: true, others → required: false.
 */
function applyRequiredToEntities(
  formSchema: FormSchema,
  requiredComponentNames: string[],
): FormSchema {
  const requiredNames = new Set(requiredComponentNames);

  const updatedEntities: FormSchema['entities'] = {};
  for (const [entityId, entity] of Object.entries(formSchema.entities)) {
    const isRequired =
      entity.attributes?.name && requiredNames.has(entity.attributes.name);
    updatedEntities[entityId] = {
      ...entity,
      attributes: { ...entity.attributes, required: !!isRequired },
    };
  }

  return { root: formSchema.root, entities: updatedEntities };
}
