import {
  Node,
  NodeType,
  RejectBehavior,
  ValidationIssue,
  ErrorCode,
  FlowDefinition,
} from '../../../types';
import { FlowAnalysisService } from '../../../analysis/flow-analysis.service';

/**
 * Context-Aware Validators
 *
 * These validators require knowledge of the entire flow structure.
 * They validate relationships between nodes, references, etc.
 *
 * All structure validation is handled by Zod schemas.
 * This file only contains validation that requires flow context.
 */

/**
 * Validates reject_config context:
 * - target_node_key is in guaranteed-preceding-nodes (for SEND_TO_SPECIFIC_NODE)
 * - selectable_node_keys are all in possible-preceding-nodes (for USER_SELECT)
 *
 * @param node - The approval node
 * @param flowDefinition - The complete flow definition
 * @returns Zod error array (empty if valid)
 */
export function validateRejectConfigContext(
  node: Extract<Node, { type: NodeType.APPROVAL }>,
  flowDefinition: FlowDefinition,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!node.reject_config) {
    return issues;
  }

  // Initialize flow analysis service for preceding-nodes validation
  const flowAnalysisService = new FlowAnalysisService();
  const guaranteedPrecedingNodes =
    flowAnalysisService.findGuaranteedPrecedingNodes(flowDefinition, node.key);
  const possiblePrecedingNodes = flowAnalysisService.findPossiblePrecedingNodes(
    flowDefinition,
    node.key,
  );
  const guaranteedPrecedingNodesSet = new Set(guaranteedPrecedingNodes);
  const possiblePrecedingNodesSet = new Set(possiblePrecedingNodes);

  // For SEND_TO_SPECIFIC_NODE, validate target_node_key is in guaranteed-preceding-nodes
  if (
    node.reject_config.behavior === RejectBehavior.SEND_TO_SPECIFIC_NODE &&
    node.reject_config.target_node_key
  ) {
    const targetNodeKey = node.reject_config.target_node_key;

    // Check if target node is in guaranteed-preceding-nodes
    // (This already ensures the node exists, is not START, and is guaranteed to be executed)
    if (!guaranteedPrecedingNodesSet.has(targetNodeKey)) {
      issues.push({
        code: ErrorCode.INVALID_REJECT_TARGET,
        message: `Approval node '${node.key}' reject_config target_node_key '${targetNodeKey}' is not guaranteed to be executed before this node. Only guaranteed preceding nodes can be used as reject targets.`,
      });
    }
  }

  // For USER_SELECT, validate selectable_node_keys are in possible-preceding-nodes
  if (
    node.reject_config.behavior === RejectBehavior.USER_SELECT &&
    node.reject_config.user_select_options?.selectable_node_keys
  ) {
    node.reject_config.user_select_options.selectable_node_keys.forEach(
      (nodeKey) => {
        // Check if node is in possible-preceding-nodes
        // (This already ensures the node exists, is not START, and might be executed)
        if (!possiblePrecedingNodesSet.has(nodeKey)) {
          issues.push({
            code: ErrorCode.INVALID_REJECT_TARGET,
            message: `Approval node '${node.key}' user_select_options.selectable_node_keys contains '${nodeKey}' which is not a possible preceding node. Only possible preceding nodes can be used as selectable reject targets.`,
          });
        }
      },
    );
  }

  return issues;
}

/**
 * Validates that all 'next' node references point to existing nodes
 *
 * Checks:
 * - Regular nodes: `next` field
 * - Condition nodes: `conditions[].next` fields
 * - Approval nodes: `next`
 *
 * @param node - The node to validate
 * @param nodeKeys - Set of all valid node keys in the flow
 * @returns Array of validation issues (empty if valid)
 */
export function validateNodeNexts(
  node: Node,
  nodeKeys: Set<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Validate 'next' field (for non-END and non-CONDITION nodes)
  if (node.type !== NodeType.END && node.type !== NodeType.CONDITION) {
    if ('next' in node && node.next && !nodeKeys.has(node.next)) {
      issues.push({
        code: ErrorCode.NODE_NOT_FOUND,
        message: `Node '${node.key}' references non-existent node '${node.next}'`,
      });
    }
  }

  // Validate CONDITION node: check all condition branches
  if (node.type === NodeType.CONDITION) {
    node.conditions?.forEach((condition, index) => {
      if (!nodeKeys.has(condition.next)) {
        issues.push({
          code: ErrorCode.NODE_NOT_FOUND,
          message: `Condition node '${node.key}' branch ${index} references non-existent node '${condition.next}'`,
        });
      }
    });
  }

  return issues;
}
