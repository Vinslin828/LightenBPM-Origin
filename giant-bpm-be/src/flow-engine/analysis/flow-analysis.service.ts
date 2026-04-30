import { Injectable } from '@nestjs/common';
import { Node, NodeType, FlowDefinition, RejectBehavior } from '../types';

/**
 * Service for analyzing flow definitions
 * Provides graph analysis algorithms for determining node relationships
 */
@Injectable()
export class FlowAnalysisService {
  /**
   * Find all nodes that are guaranteed to be traversed before reaching the target node
   * Uses path intersection algorithm to determine guaranteed predecessors
   *
   * @param flowDefinition - The flow definition to analyze
   * @param nodeKey - The target node key to analyze from
   * @returns Array of node keys that will definitely be traversed (excludes START node)
   */
  findGuaranteedPrecedingNodes(
    flowDefinition: FlowDefinition,
    nodeKey: string,
  ): string[] {
    const nodes = flowDefinition.nodes;

    // Build reverse graph (predecessors map)
    const predecessors = this.buildPredecessorsMap(nodes);

    // Find all paths from target node back to START
    const allPaths = this.findAllPathsToStart(nodeKey, predecessors, nodes);

    // If no paths found or only one path, return empty or that path
    if (allPaths.length === 0) {
      return [];
    }

    // Calculate intersection of all paths
    const guaranteedNodes = this.calculatePathIntersection(allPaths);

    // Exclude START node and target node itself
    return guaranteedNodes.filter(
      (key) => !this.isStartNode(key, nodes) && key !== nodeKey,
    );
  }

  /**
   * Find all nodes that might be traversed before reaching the target node
   * Uses path union algorithm to determine all possible predecessors
   *
   * @param flowDefinition - The flow definition to analyze
   * @param nodeKey - The target node key to analyze from
   * @returns Array of node keys that might be traversed (excludes START node)
   */
  findPossiblePrecedingNodes(
    flowDefinition: FlowDefinition,
    nodeKey: string,
  ): string[] {
    const nodes = flowDefinition.nodes;

    // Build reverse graph (predecessors map)
    const predecessors = this.buildPredecessorsMap(nodes);

    // Find all paths from target node back to START
    const allPaths = this.findAllPathsToStart(nodeKey, predecessors, nodes);

    // If no paths found, return empty
    if (allPaths.length === 0) {
      return [];
    }

    // Calculate union of all paths (all unique nodes across all paths)
    const possibleNodes = this.calculatePathUnion(allPaths);

    // Exclude START node and target node itself
    return possibleNodes.filter(
      (key) => !this.isStartNode(key, nodes) && key !== nodeKey,
    );
  }

  /**
   * Find selectable reject targets from completed nodes (runtime)
   * Returns nodes that can be selected as reject targets based on actual execution history
   *
   * Algorithm:
   * 1. Infer all traversed nodes from completed nodes (includes CONDITION nodes)
   * 2. Find all possible preceding nodes from flow definition (design-time analysis)
   * 3. Intersect with actually traversed nodes (runtime data)
   * This ensures we only return nodes that are both:
   *    - Predecessors of current node in the flow graph (excludes parallel branches)
   *    - Actually executed in this application instance
   *
   * @param flowDefinition - The flow definition
   * @param completedNodeKeys - Node keys that have been completed (nodes with workflow_node entities)
   * @param currentNodeKey - The current node key
   * @returns Array of node keys that can be selected as reject targets
   */
  findSelectableRejectTargets(
    flowDefinition: FlowDefinition,
    completedNodeKeys: string[],
    currentNodeKey: string,
  ): string[] {
    // Infer all traversed nodes (includes CONDITION nodes that don't have entities)
    const traversedNodeKeys = this.inferTraversedNodes(
      flowDefinition,
      completedNodeKeys,
    );

    // Find all possible preceding nodes from flow definition
    const possiblePredecessors = this.findPossiblePrecedingNodes(
      flowDefinition,
      currentNodeKey,
    );

    // Return intersection: nodes that are both possible predecessors AND actually traversed
    const selectableNodes = traversedNodeKeys.filter((key) =>
      possiblePredecessors.includes(key),
    );

    return selectableNodes;
  }

  /**
   * Infer all nodes that were traversed based on completed nodes
   * CONDITION nodes don't create workflow_node entities, but we can infer they were executed
   * by checking if any of their branch targets were executed
   *
   * Algorithm:
   * - Iteratively infer CONDITION nodes until no new nodes are added
   * - This handles cases where CONDITION nodes are chained (e.g., CONDITION -> CONDITION -> APPROVAL)
   *
   * @param flowDefinition - The flow definition
   * @param completedNodeKeys - Node keys that have workflow_node entities with COMPLETED status
   * @returns Array of all node keys that were traversed (includes inferred CONDITION nodes)
   */
  private inferTraversedNodes(
    flowDefinition: FlowDefinition,
    completedNodeKeys: string[],
  ): string[] {
    const traversed = new Set(completedNodeKeys);

    // Keep inferring CONDITION nodes until no new nodes are added
    // This handles chained CONDITION nodes (e.g., CONDITION -> CONDITION -> APPROVAL)
    let addedNewNodes = true;
    while (addedNewNodes) {
      addedNewNodes = false;

      flowDefinition.nodes.forEach((node) => {
        if (node.type === NodeType.CONDITION && 'conditions' in node) {
          const conditionNode = node;

          // Skip if already inferred
          if (traversed.has(conditionNode.key)) {
            return;
          }

          // Check if any branch of this condition node was taken
          const anyBranchTaken = conditionNode.conditions.some((condition) =>
            traversed.has(condition.next),
          );

          if (anyBranchTaken) {
            // This condition node was traversed
            traversed.add(conditionNode.key);
            addedNewNodes = true;
          }
        }
      });
    }

    return Array.from(traversed);
  }

  /**
   * Build a map of predecessors for each node
   * Key: node key, Value: array of predecessor node keys
   */
  private buildPredecessorsMap(nodes: Node[]): Map<string, string[]> {
    const predecessors = new Map<string, string[]>();

    // Initialize all nodes
    nodes.forEach((node) => {
      predecessors.set(node.key, []);
    });

    // Build predecessor relationships
    nodes.forEach((node) => {
      if (node.type === NodeType.CONDITION) {
        // Condition node has multiple branches
        const conditionNode = node;
        conditionNode.conditions.forEach((condition) => {
          if (condition.next) {
            const successors = predecessors.get(condition.next) || [];
            successors.push(node.key);
            predecessors.set(condition.next, successors);
          }
        });
      } else if (node.type !== NodeType.END) {
        // Regular node with single 'next'
        const next = 'next' in node ? node.next : undefined;
        if (next) {
          const successors = predecessors.get(next) || [];
          successors.push(node.key);
          predecessors.set(next, successors);
        }
      }

      // Handle approval node reject paths
      if (node.type === NodeType.APPROVAL) {
        const approvalNode = node;
        if (approvalNode.reject_config) {
          const rejectConfig = approvalNode.reject_config;

          // SEND_TO_SPECIFIC_NODE
          if (
            rejectConfig.behavior === RejectBehavior.SEND_TO_SPECIFIC_NODE &&
            rejectConfig.target_node_key
          ) {
            const successors =
              predecessors.get(rejectConfig.target_node_key) || [];
            if (!successors.includes(node.key)) {
              successors.push(node.key);
              predecessors.set(rejectConfig.target_node_key, successors);
            }
          }

          // USER_SELECT
          if (
            rejectConfig.behavior === RejectBehavior.USER_SELECT &&
            rejectConfig.user_select_options?.selectable_node_keys
          ) {
            rejectConfig.user_select_options.selectable_node_keys.forEach(
              (targetKey) => {
                const successors = predecessors.get(targetKey) || [];
                if (!successors.includes(node.key)) {
                  successors.push(node.key);
                  predecessors.set(targetKey, successors);
                }
              },
            );
          }
        }
      }
    });

    return predecessors;
  }

  /**
   * Find all paths from target node back to START using DFS
   */
  private findAllPathsToStart(
    nodeKey: string,
    predecessors: Map<string, string[]>,
    nodes: Node[],
  ): string[][] {
    const allPaths: string[][] = [];
    const visited = new Set<string>();

    const dfs = (currentKey: string, path: string[]) => {
      // Add current node to path
      const newPath = [...path, currentKey];

      // If we reached START, save this path
      if (this.isStartNode(currentKey, nodes)) {
        allPaths.push(newPath);
        return;
      }

      // Prevent infinite loops
      if (visited.has(currentKey)) {
        return;
      }

      visited.add(currentKey);

      // Explore all predecessors
      const preds = predecessors.get(currentKey) || [];
      if (preds.length === 0) {
        // Dead end - this path doesn't reach START
        visited.delete(currentKey);
        return;
      }

      preds.forEach((predKey) => {
        dfs(predKey, newPath);
      });

      visited.delete(currentKey);
    };

    dfs(nodeKey, []);
    return allPaths;
  }

  /**
   * Calculate the intersection of all paths
   * Returns nodes that appear in ALL paths
   */
  private calculatePathIntersection(paths: string[][]): string[] {
    if (paths.length === 0) {
      return [];
    }

    if (paths.length === 1) {
      return paths[0];
    }

    // Count occurrences of each node across all paths
    const nodeCount = new Map<string, number>();
    paths.forEach((path) => {
      const uniqueNodes = new Set(path);
      uniqueNodes.forEach((nodeKey) => {
        nodeCount.set(nodeKey, (nodeCount.get(nodeKey) || 0) + 1);
      });
    });

    // Return nodes that appear in all paths
    const totalPaths = paths.length;
    return Array.from(nodeCount.entries())
      .filter(([, count]) => count === totalPaths)
      .map(([nodeKey]) => nodeKey);
  }

  /**
   * Calculate the union of all paths
   * Returns all unique nodes that appear in ANY path
   */
  private calculatePathUnion(paths: string[][]): string[] {
    if (paths.length === 0) {
      return [];
    }

    if (paths.length === 1) {
      return paths[0];
    }

    // Collect all unique nodes across all paths
    const allNodes = new Set<string>();
    paths.forEach((path) => {
      path.forEach((nodeKey) => {
        allNodes.add(nodeKey);
      });
    });

    return Array.from(allNodes);
  }

  /**
   * Check if a node is a START node
   */
  private isStartNode(nodeKey: string, nodes: Node[]): boolean {
    const node = nodes.find((n) => n.key === nodeKey);
    return node?.type === NodeType.START;
  }
}
