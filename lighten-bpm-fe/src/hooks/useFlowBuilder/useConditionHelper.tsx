import {
  Branch,
  BranchLogic,
  ConditionNodeType,
  UiExpression,
  WorkflowNodeKey,
} from "@/types/flow";
import { useCallback } from "react";
import { useFlowBuilder } from ".";

export function useConditionNodeHelper(nodeId: string) {
  const { getNodeById, deleteSubtree, updateNode, nodes, applyLayout, calculateEdges } = useFlowBuilder();

  const node = getNodeById(nodeId) as ConditionNodeType;
  const branches = node?.data?.conditions ?? [];

  const flattenTree = useCallback(
    (cond: Branch): (UiExpression | BranchLogic)[] => {
      if (!cond) return [];
      if ("logic" in cond) {
        return [
          ...flattenTree(cond.left),
          cond.logic,
          ...flattenTree(cond.right),
        ];
      }
      if ("field" in cond) {
        return [cond];
      }
      return [cond];
    },
    [],
  );

  const rebuildTree = (items: (UiExpression | BranchLogic)[]): Branch => {
    if (items.length === 0) return undefined;
    if (items.length === 1) return items[0] as UiExpression;

    let tree: Branch = items[0] as UiExpression;
    for (let i = 1; i < items.length; i += 2) {
      const logic = items[i] as BranchLogic;
      const right = items[i + 1] as UiExpression;
      tree = { logic, left: tree, right };
    }
    return tree;
  };

  const removeBranch = async (actualIndex: number) => {
    const branchToRemove = branches[actualIndex];
    if (!branchToRemove) return;

    let currentNodes = nodes;

    if (branchToRemove.next) {
      const nextNode = getNodeById(branchToRemove.next);
      const parentCount = nextNode?.data?.parents?.length ?? 0;

      if (nextNode?.type !== WorkflowNodeKey.End && parentCount <= 1) {
        const { nodes: prunedNodes } = await deleteSubtree(branchToRemove.next);
        currentNodes = prunedNodes;
      } else if (nextNode) {
        // If we don't delete it (End node or shared node), we should still remove the link
        currentNodes = currentNodes.map((n) => {
          if (n.id === branchToRemove.next) {
            const existingParents = new Set(n.data.parents ?? []);
            existingParents.delete(nodeId);
            return {
              ...n,
              data: {
                ...n.data,
                parents: Array.from(existingParents),
              },
            } as any;
          }
          return n;
        });
      }
    }

    currentNodes = currentNodes.map((n) => {
      if (n.id === nodeId) {
        const data = n.data as ConditionNodeType["data"];
        const currentConditions = data.conditions || [];
        return {
          ...n,
          data: {
            ...data,
            conditions: currentConditions.filter((_, i) => i !== actualIndex),
          },
        } as any;
      }
      return n;
    });

    const newEdges = calculateEdges(currentNodes);
    await applyLayout(currentNodes, newEdges);
  };

  return {
    flattenTree,
    rebuildTree,
    removeBranch,
    branches,
    node,
  };
}
