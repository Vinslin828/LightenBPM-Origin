import { Node, NodeType, ValidationIssue, ErrorCode } from '../../../types';

/**
 * Graph Validators
 *
 * Validates the graph structure of the flow:
 * - Reachability: All nodes must be reachable from START
 * - Circular references: No cycles in the flow
 */

/**
 * Validates that all nodes are reachable from the START node
 *
 * @param nodes - All nodes in the flow
 * @returns Zod error array (empty if valid)
 */
export function validateReachability(nodes: Node[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeMap = new Map(nodes.map((node) => [node.key, node]));
  const visited = new Set<string>();
  const reachableNodes = new Set<string>();

  // Find start node
  const startNode = nodes.find((node) => node.type === NodeType.START);
  if (!startNode) {
    // Should not happen as basic validation ensures start node exists
    return issues;
  }

  const traverse = (nodeKey: string) => {
    if (visited.has(nodeKey)) return;
    visited.add(nodeKey);
    reachableNodes.add(nodeKey);

    const node = nodeMap.get(nodeKey);
    if (!node) return;

    if (node.type === NodeType.CONDITION) {
      const conditionNode = node;
      conditionNode.conditions?.forEach((condition) => {
        if (condition.next) {
          traverse(condition.next);
        }
      });
    } else if ('next' in node && node.next) {
      traverse(node.next);
    }
  };

  traverse(startNode.key);

  // Check unreachable nodes
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!reachableNodes.has(node.key)) {
      issues.push({
        code: ErrorCode.UNREACHABLE_NODE,
        message: `Node '${node.key}' is not reachable from start node`,
      });
    }
  }

  return issues;
}

/**
 * Detects circular references in the flow
 *
 * @param nodes - All nodes in the flow
 * @returns Zod error array (empty if valid)
 */
export function detectCircularReferences(nodes: Node[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeMap = new Map(nodes.map((node) => [node.key, node]));
  const visiting = new Set<string>();
  const visited = new Set<string>();

  // Find start node
  const startNode = nodes.find((node) => node.type === NodeType.START);
  if (!startNode) {
    // Should not happen as basic validation ensures start node exists
    return issues;
  }

  const traverse = (nodeKey: string, path: string[] = []): boolean => {
    if (visiting.has(nodeKey)) {
      const cycleStart = path.indexOf(nodeKey);
      const cycle = path.slice(cycleStart).concat(nodeKey);
      issues.push({
        code: ErrorCode.CIRCULAR_REFERENCE,
        message: `Circular reference detected: ${cycle.join(' -> ')}`,
      });
      return false;
    }

    if (visited.has(nodeKey)) return true;

    visiting.add(nodeKey);
    const newPath = [...path, nodeKey];

    const node = nodeMap.get(nodeKey);
    if (node) {
      if (node.type === NodeType.CONDITION) {
        const conditionNode = node;
        conditionNode.conditions?.forEach((condition) => {
          if (condition.next) {
            traverse(condition.next, newPath);
          }
        });
      } else if ('next' in node && node.next) {
        traverse(node.next, newPath);
      }
    }

    visiting.delete(nodeKey);
    visited.add(nodeKey);
    return true;
  };

  traverse(startNode.key);
  return issues;
}
