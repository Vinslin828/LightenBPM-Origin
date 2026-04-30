/**
 * flow_definition Utilities
 */

import {
  FlowDefinition,
  Node,
  NodeType,
  ConditionBranch,
  SimpleCondition,
  ComplexCondition,
  ExpressionCondition,
  ApproverConfig,
  ApproverType,
} from '../../types';
import { FunctionCallExtractor } from '../../expression-engine';

/**
 * Get all form field names referenced in a flow definition
 * @returns Array of field names referenced in the flow
 */
export function getReferencedFieldNames(
  flowDefinition: FlowDefinition,
): string[] {
  return getReferencedFieldNamesRecursive(flowDefinition);
}

/**
 * Finds a node in the flow definition by its key
 * @param flowDefinition - The flow definition
 * @param nodeKey - The key of the node to find
 * @returns The node or null if not found
 */
export function findNodeByKey(
  flowDefinition: FlowDefinition,
  nodeKey: string,
): Node | null {
  const node = flowDefinition.nodes.find((n) => n.key === nodeKey);
  return node || null;
}

/**
 * Gets the start node from the flow definition
 * @param flowDefinition - The flow definition
 * @returns The start node or null if not found
 */
export function getStartNode(flowDefinition: FlowDefinition): Node | null {
  return flowDefinition.nodes.find((n) => n.type === NodeType.START) || null;
}

/**
 * Resolves the description of a node. When nodeKey is null, falls back to the
 * start node's description.
 *
 * For APPROVAL nodes the description lives on the approver config:
 *   - SINGLE: `approvers.description`
 *   - PARALLEL: `approvers[approverGroupIndex].description`
 * If the approver-level description is unset, falls back to `node.description`.
 *
 * @param flowDefinition - The flow definition
 * @param nodeKey - The node key, or null to mean the start node
 * @param approverGroupIndex - Group index for PARALLEL approval nodes (defaults to 0)
 * @returns The description or null if not set / node not found
 */
export function resolveNodeDescription(
  flowDefinition: FlowDefinition,
  nodeKey: string | null,
  approverGroupIndex?: number | null,
): string | null {
  const targetNode = nodeKey
    ? findNodeByKey(flowDefinition, nodeKey)
    : getStartNode(flowDefinition);
  if (!targetNode) return null;

  if (targetNode.type === NodeType.APPROVAL) {
    const approvalNode = targetNode;
    const approverConfig = Array.isArray(approvalNode.approvers)
      ? approvalNode.approvers[approverGroupIndex ?? 0]
      : approvalNode.approvers;
    return approverConfig?.description ?? approvalNode.description ?? null;
  }

  return targetNode.description ?? null;
}

/**
 * Whether the given approver group requires every user in the group to
 * approve before the group is considered complete (AND consensus).
 *
 * SPECIFIC_USERS lists explicitly named users; the natural reading is "each
 * named person must sign". Other approver types (ROLE, DEPARTMENT_HEAD, ...)
 * resolve to a set of users where any one approving is sufficient.
 */
export function requiresAllApprovers(approverConfig: ApproverConfig): boolean {
  return approverConfig.type === ApproverType.SPECIFIC_USERS;
}

/**
 * Checks if a value contains a reference expression (any getter function)
 * Supports: getFormField(), getApplicantProfile(), getApplication()
 * @param value - The value to check
 * @returns True if the value contains a valid reference expression
 */
export function isReferenceExpression(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  const extractor = new FunctionCallExtractor();
  const calls = extractor.extract(value);
  return calls.length > 0;
}

/**
 * Type guard to check if a branch is a SimpleCondition
 * @param branch - The condition branch to check
 * @returns True if the branch is a SimpleCondition (has field and operator)
 */
export function isSimpleCondition(
  branch: ConditionBranch,
): branch is SimpleCondition {
  return 'field' in branch && 'operator' in branch;
}

/**
 * Type guard to check if a branch is a ComplexCondition
 * @param branch - The condition branch to check
 * @returns True if the branch is a ComplexCondition (has left, logic, right)
 */
export function isComplexCondition(
  branch: ConditionBranch,
): branch is ComplexCondition {
  return 'logic' in branch && 'left' in branch && 'right' in branch;
}

/**
 * Type guard to check if a branch is an ExpressionCondition
 * @param branch - The condition branch to check
 * @returns True if the branch is an ExpressionCondition (has expression)
 */
export function isExpressionCondition(
  branch: ConditionBranch,
): branch is ExpressionCondition {
  return 'expression' in branch;
}

/**
 * Internal recursive helper to get form field names from any value
 */
function getReferencedFieldNamesRecursive(value: unknown): string[] {
  const fieldNames: string[] = [];
  const extractor = new FunctionCallExtractor();

  if (!value || typeof value !== 'object') {
    return fieldNames;
  }

  // If it's an array, recurse into each element
  if (Array.isArray(value)) {
    value.forEach((item) => {
      fieldNames.push(...getReferencedFieldNamesRecursive(item));
    });
    return fieldNames;
  }

  // If it's an object, check each property
  for (const val of Object.values(value as Record<string, unknown>)) {
    if (typeof val === 'string') {
      // Extract form field names from the expression
      const names = extractor.getFormFieldNames(val);
      fieldNames.push(...names);
    } else if (typeof val === 'object' && val !== null) {
      // Recurse into nested objects/arrays
      fieldNames.push(...getReferencedFieldNamesRecursive(val));
    }
  }

  return fieldNames;
}
