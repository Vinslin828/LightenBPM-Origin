import { useAtom, useAtomValue } from "jotai";
import {
  edgesAtom,
  layoutOptionsAtom,
  nodesAtom,
  selectedNodeIdAtom,
} from "../../store/atoms";
import { createContext, useCallback, useContext } from "react";
import {
  VisibilityRule,
  VisibilityAction,
  ConditionBranch,
  BranchLogic,
  UiExpression,
  WorkflowNode,
  ConditionNodeType,
  WorkflowNodeKey,
  WorkflowEdgeKey,
  Branch,
  ConditionNodeData,
  ApprovalNodeType,
  FormNodeType,
  ApproverType,
  ParallelApprovalNodeType,
  CodeExpression,
} from "@/types/flow";
import {
  Edge,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  Connection,
  addEdge as addEdgeReactFlow,
} from "@xyflow/react";
import {
  createDefaultWorkflowNode,
  resolveEffectiveVisibilityRules,
} from "@/const/flow";
import { getLayoutedElements } from "../useFlowLayout";
import { useTranslation } from "react-i18next";
import { data } from "react-router-dom";
import { FormDefinition } from "@/types/domain";

const attachFallbackPlaceholder = (
  conditionNode: ConditionNodeType,
  placeholderId: string,
): ConditionNodeType => {
  const conditions = conditionNode.data.conditions ?? [];
  let fallbackFound = false;

  const updatedConditions = conditions.map((condition) => {
    if (condition.name === "fallback-branch") {
      fallbackFound = true;
      return { ...condition, next: placeholderId };
    }
    return condition;
  });

  const finalConditions = fallbackFound
    ? updatedConditions
    : [
        ...updatedConditions,
        {
          isExpression: false as const,
          name: "fallback-branch",
          next: placeholderId,
          branch: undefined,
        },
      ];

  return {
    ...conditionNode,
    data: {
      ...conditionNode.data,
      conditions: finalConditions,
    },
  };
};

const normalizeVisibilityActions = (
  actions: string[] = [],
): VisibilityRule["actions"] => {
  const normalized = Array.from(
    new Set(
      actions
        .map((action) =>
          action === "disable" ? VisibilityAction.DISABLED : action,
        )
        // readonly=true is represented by editable=false (absence of "editable").
        .filter(
          (action): action is VisibilityRule["actions"][number] =>
            action === VisibilityAction.HIDE ||
            action === VisibilityAction.EDITABLE ||
            action === VisibilityAction.DISABLED ||
            action === VisibilityAction.REQUIRED,
        ),
    ),
  );

  if (normalized.includes(VisibilityAction.HIDE)) {
    return [VisibilityAction.HIDE];
  }
  return normalized;
};

const normalizeComponentRules = (
  rules: VisibilityRule[] | undefined,
): VisibilityRule[] => {
  if (!Array.isArray(rules)) return [];

  return rules.reduce<VisibilityRule[]>((acc, rule) => {
    if (!rule?.componentName) return acc;
    const actions = normalizeVisibilityActions(rule.actions);
    acc.push({
      ...rule,
      actions,
    });
    return acc;
  }, []);
};

const getBoundFormSchema = (
  currentNodes: WorkflowNode[],
): FormDefinition["schema"] | undefined => {
  const formNode = currentNodes.find(
    (node) => node.type === WorkflowNodeKey.Form,
  ) as FormNodeType | undefined;

  return formNode?.data.form?.schema;
};

const applyDefaultVisibilityToNode = (
  node: WorkflowNode,
  formSchema: FormDefinition["schema"] | undefined,
): WorkflowNode => {
  if (!formSchema) return node;

  if (node.type === WorkflowNodeKey.Approval) {
    return {
      ...node,
      data: {
        ...node.data,
        componentRules: resolveEffectiveVisibilityRules(
          (node.data as ApprovalNodeType["data"]).componentRules,
          formSchema,
          "approval",
        ),
      },
    } as WorkflowNode;
  }

  if (node.type === WorkflowNodeKey.ParallelApproval) {
    const data = node.data as ParallelApprovalNodeType["data"];

    return {
      ...node,
      data: {
        ...data,
        approvals: data.approvals.map((approval) => ({
          ...approval,
          componentRules: resolveEffectiveVisibilityRules(
            approval.componentRules,
            formSchema,
            "approval",
          ),
        })),
      },
    } as WorkflowNode;
  }

  return node;
};

type FlowBuilderActionContextValue = {
  setSelectedNode: (nodeId: string | null) => void;
  insertNodeOnEdge: (
    nodeType: WorkflowNode["type"],
    edgeId: string,
  ) => Promise<WorkflowNode | undefined>;
  insertNodeAfter: (
    newNodeType: WorkflowNode["type"],
    sourceNodeId: string,
    labelData?: { label: string; index?: number },
  ) => Promise<WorkflowNode | undefined>;
  insertNodeBefore: (
    newNodeType: WorkflowNode["type"],
    targetNodeId: string,
  ) => Promise<WorkflowNode | undefined>;
  smartRemoveNode: (nodeId: string) => Promise<void>;
  updateNode: (
    id: string,
    dataOrFn:
      | Partial<WorkflowNode["data"]>
      | ((node: WorkflowNode) => Partial<WorkflowNode["data"]>),
    type?: WorkflowNodeKey,
  ) => void;
  replaceNode: (
    nodeId: string,
    data: Partial<WorkflowNode["data"]>,
    type: WorkflowNodeKey,
  ) => Promise<void | { nodes: WorkflowNode[]; edges: Edge[] }>;
};

export const FlowBuilderActionContext =
  createContext<FlowBuilderActionContextValue | null>(null);

export function useFlowBuilder() {
  const [nodes, setNodes] = useAtom(nodesAtom);
  const [edges, setEdges] = useAtom(edgesAtom);
  const [selectedNodeId, _setSelectedNodeId] = useAtom(selectedNodeIdAtom);
  const layoutOptions = useAtomValue(layoutOptionsAtom);
  const { t } = useTranslation();
  const selectedNode = nodes.find((node) => node.id === selectedNodeId) ?? null;

  const calculateEdges = useCallback((currentNodes: WorkflowNode[]): Edge[] => {
    const nodeIds = new Set(currentNodes.map((node) => node.id));
    const calculatedEdges: Edge[] = [];

    currentNodes.forEach((node) => {
      if (node.type === WorkflowNodeKey.Condition) {
        const conditionData = node.data as ConditionNodeData;
        conditionData.conditions?.forEach((condition, index) => {
          if (condition.next && nodeIds.has(condition.next)) {
            calculatedEdges.push({
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
        calculatedEdges.push({
          id: `${node.id}-to-${nextNodeId}`,
          source: node.id,
          target: nextNodeId,
          type: WorkflowEdgeKey.Label,
          sourceHandle: "bottom",
          targetHandle: "top",
        });
      }
    });
    console.debug("calculateEdges", { currentNodes, calculatedEdges });

    return calculatedEdges;
  }, []);

  const applyLayout = useCallback(
    async (newNodes: WorkflowNode[], newEdges?: Edge[]) => {
      const edgesForLayout = newEdges ?? calculateEdges(newNodes);
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        await getLayoutedElements(newNodes, edgesForLayout, layoutOptions);
      console.debug("applyLayout", {
        newNodes: newNodes.map((n) => ({
          id: n.id,
          // type: n.type,
          next: n.data.next,
          parents: n.data.parents,
          data: n.data,
        })),
        // newEdges: edgesForLayout,
        // layoutedNodes,
        // layoutedEdges,
        // json: JSON.stringify({ layoutedNodes, layoutedEdges }),
      });
      setEdges(layoutedEdges);
      setNodes(layoutedNodes);
      return { nodes: layoutedNodes, edges: layoutedEdges };
    },
    [layoutOptions, setNodes, setEdges, calculateEdges],
  );

  const _deleteNode = useCallback(
    async (nodeId: string) => {
      console.debug("deleteNode", nodeId);
      const nodeToRemove = nodes.find((node) => node.id === nodeId);
      if (!nodeToRemove) return;

      const childIds =
        nodeToRemove.type === WorkflowNodeKey.Condition
          ? ((
              (nodeToRemove as ConditionNodeType).data as ConditionNodeData
            ).conditions
              ?.map((condition) => condition.next)
              .filter(Boolean) ?? [])
          : [nodeToRemove.data.next].filter(Boolean);

      // For non-condition nodes we only expect a single next; pick the first to reconnect.
      const primaryChildId = childIds[0] ?? null;
      const parentIds = new Set(nodeToRemove.data.parents ?? []);
      const parentIdsArray = Array.from(parentIds);

      const updatedNodes = nodes
        .filter((node) => node.id !== nodeId)
        .map((node) => {
          if (node.id === primaryChildId) {
            const existingParents = new Set(node.data.parents ?? []);
            existingParents.delete(nodeId);
            parentIdsArray.forEach((pid) => existingParents.add(pid));

            return {
              ...node,
              data: {
                ...node.data,
                parents: Array.from(existingParents),
              },
            } as WorkflowNode;
          }

          if (!parentIds.has(node.id)) {
            return node;
          }

          if (node.type === WorkflowNodeKey.Condition) {
            const data = node.data as ConditionNodeData;
            const updatedConditions = data.conditions.map((condition) =>
              condition.next === nodeId
                ? { ...condition, next: primaryChildId }
                : condition,
            );

            return {
              ...node,
              data: {
                ...data,
                conditions: updatedConditions,
              },
            } as WorkflowNode;
          }

          if (node.data.next === nodeId) {
            return {
              ...node,
              data: { ...node.data, next: primaryChildId },
            } as WorkflowNode;
          }

          return node;
        });

      const newEdges = calculateEdges(updatedNodes);
      await applyLayout(updatedNodes, newEdges);
    },
    [nodes, applyLayout, calculateEdges],
  );

  const setSelectedNode = useCallback(
    (nodeId: string | null) => {
      _setSelectedNodeId((prev) => (prev === nodeId ? prev : nodeId));
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === nodeId,
        }))
      );
    },
    [_setSelectedNodeId, setNodes],
  );

  // Change handlers for ReactFlow
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const changedNodes = applyNodeChanges(changes, nodes) as WorkflowNode[];

      const hasDimensionChange = changes.some(
        (change) => change.type === "dimensions",
      );
      const isDragging = changes.some(
        (change) => change.type === "position" && change.dragging,
      );

      if (hasDimensionChange && !isDragging) {
        void applyLayout(changedNodes, edges);
      } else {
        setNodes(changedNodes);
      }
    },
    [nodes, edges, applyLayout, setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges(applyEdgeChanges(changes, edges));
    },
    [edges, setEdges],
  );

  const onConnect = useCallback(
    (params: Edge | Connection) => {
      setEdges((eds) => {
        console.debug("onConnect", params);
        return addEdgeReactFlow(
          { ...params, sourceHandle: "bottom", targetHandle: "top" },
          // Ensure that a node will only have one outgoing edge.
          eds.filter((edge) => edge.source !== params.source),
        );
      });
    },
    [setEdges],
  );

  // Getters
  const getNodeById = useCallback(
    (nodeId: string) => nodes.find((node) => node.id === nodeId),
    [nodes],
  );

  const getEdgeById = useCallback(
    (edgeId: string) => edges.find((edge) => edge.id === edgeId),
    [edges],
  );

  // Actions
  const addNode = useCallback(
    async (nodeType: WorkflowNode["type"]) => {
      console.debug("addNode", nodeType);
      const newNode = applyDefaultVisibilityToNode(
        createDefaultWorkflowNode(nodeType),
        getBoundFormSchema(nodes),
      );
      const updatedNodes = [...nodes, newNode];
      await applyLayout(updatedNodes, edges);
    },
    [nodes, edges, applyLayout],
  );

  const updateNode = useCallback(
    (
      id: string,
      dataOrFn:
        | Partial<WorkflowNode["data"]>
        | ((node: WorkflowNode) => Partial<WorkflowNode["data"]>),
      type?: WorkflowNodeKey,
    ) => {
      console.debug("updateNode", id, dataOrFn, type);
      let shouldRecalculateEdges = false;

      const newNodes = nodes.map((node) => {
        if (node.id !== id) return node;

        const incomingPartialData =
          typeof dataOrFn === "function" ? dataOrFn(node) : dataOrFn;

        const normalizedPartialData: Partial<WorkflowNode["data"]> = {
          ...incomingPartialData,
        };

        if ("componentRules" in normalizedPartialData) {
          normalizedPartialData.componentRules = normalizeComponentRules(
            normalizedPartialData.componentRules as VisibilityRule[] | undefined,
          );
        }

        if ("approvals" in normalizedPartialData) {
          normalizedPartialData.approvals = (
            normalizedPartialData.approvals as ApprovalNodeType["data"][]
          )?.map((approval) => ({
            ...approval,
            componentRules: normalizeComponentRules(approval.componentRules),
          }));
        }

        const mergedData = { ...node.data, ...normalizedPartialData };

        if (
          node.data.next !== mergedData.next ||
          node.type === WorkflowNodeKey.Condition ||
          "conditions" in normalizedPartialData ||
          "parents" in normalizedPartialData
        ) {
          shouldRecalculateEdges = true;
        }

        return {
          ...node,
          type: type ?? node.type,
          data: mergedData,
        } as WorkflowNode;
      });

      if (shouldRecalculateEdges) {
        void applyLayout(newNodes);
        return;
      }

      setNodes(newNodes);
    },
    [nodes, setNodes, applyLayout],
  );

  const replaceNode = useCallback(
    async (
      nodeId: string,
      data: Partial<WorkflowNode["data"]>,
      type: WorkflowNodeKey,
    ) => {
      const targetNode = nodes.find((n) => n.id === nodeId);
      if (!targetNode) {
        console.error("replaceNode: target node not found", nodeId);
        return;
      }

      if (type === WorkflowNodeKey.Condition) {
        const targetNextId = targetNode.data.next ?? null;
        const placeholderNode = createDefaultWorkflowNode(
          WorkflowNodeKey.Placeholder,
          { parents: [nodeId], next: targetNextId },
        );

        const defaultConditionData = createDefaultWorkflowNode(
          WorkflowNodeKey.Condition,
        ).data as ConditionNodeData;

        const incomingConditions =
          (data as ConditionNodeData)?.conditions ??
          defaultConditionData.conditions;

        const ensureFallback = incomingConditions.some(
          (cond) => cond.name === "fallback-branch",
        )
          ? incomingConditions
          : [
              ...incomingConditions,
              {
                isExpression: false as const,
                name: "fallback-branch",
                next: placeholderNode.id,
                branch: undefined,
              },
            ];

        const conditionsWithPlaceholder = ensureFallback.map((condition) => ({
          ...condition,
          next: placeholderNode.id,
        }));

        const newNodes = nodes.map((n) => {
          if (n.id === nodeId) {
            const mergedData: ConditionNodeData = {
              ...defaultConditionData,
              ...data,
              parents: targetNode.data.parents ?? null,
              next: null,
              conditions: conditionsWithPlaceholder,
            };

            return { ...n, data: mergedData, type };
          }

          if (targetNextId && n.id === targetNextId) {
            const updatedParents = new Set(n.data.parents ?? []);
            updatedParents.delete(nodeId);
            updatedParents.add(placeholderNode.id);

            return {
              ...n,
              data: { ...n.data, parents: Array.from(updatedParents) },
            } as WorkflowNode;
          }

          return n;
        }) as WorkflowNode[];

        const finalNodes = [...newNodes, placeholderNode];
        const finalEdges = calculateEdges(finalNodes);
        return applyLayout(finalNodes, finalEdges);
      }

      const formSchema = getBoundFormSchema(nodes);
      const newNodes = nodes.map((n) => {
        if (n.id === nodeId) {
          return applyDefaultVisibilityToNode(
            {
              ...n,
              data: {
                ...data,
                parents: n.data.parents,
                next: n.data.next,
              },
              type,
            } as WorkflowNode,
            formSchema,
          );
        }
        return n;
      }) as WorkflowNode[];
      return applyLayout(newNodes);
    },
    [nodes, applyLayout, calculateEdges],
  );

  const deleteSubtree = useCallback(
    async (nodeId: string) => {
      console.debug("deleteSubtree", nodeId);
      const nodesToDelete = new Set<string>();
      const queue: string[] = [nodeId];

      const startNode = getNodeById(nodeId);
      if (startNode?.type !== WorkflowNodeKey.End) {
        nodesToDelete.add(nodeId);
      }

      let head = 0;
      while (head < queue.length) {
        const currentId = queue[head++];
        const currentNode = getNodeById(currentId);
        if (!currentNode) continue;

        const childIds =
          currentNode.type === WorkflowNodeKey.Condition
            ? ((currentNode as ConditionNodeType).data.conditions
                ?.map((condition) => condition.next)
                .filter((id): id is string => Boolean(id)) ?? [])
            : [currentNode.data.next].filter((id): id is string => Boolean(id));

        for (const targetId of childIds) {
          const targetNode = getNodeById(targetId);
          const parentCount = targetNode?.data.parents?.length ?? 0;

          // Stop traversing when the child is a shared node.
          if (parentCount > 1) {
            continue;
          }

          if (
            targetNode?.type !== WorkflowNodeKey.End &&
            !nodesToDelete.has(targetId)
          ) {
            nodesToDelete.add(targetId);
            queue.push(targetId);
          }
        }
      }

      const newNodes = nodes
        .filter((node) => !nodesToDelete.has(node.id))
        .map((node) => {
          const filteredParents =
            node.data.parents?.filter(
              (parentId) => !nodesToDelete.has(parentId),
            ) ?? null;

          if (node.type === WorkflowNodeKey.Condition) {
            const data = node.data as ConditionNodeData;
            const updatedConditions = data.conditions.map((condition) =>
              condition.next && nodesToDelete.has(condition.next)
                ? { ...condition, next: null }
                : condition,
            );

            return {
              ...node,
              data: {
                ...data,
                parents:
                  filteredParents && filteredParents.length > 0
                    ? filteredParents
                    : null,
                conditions: updatedConditions,
              },
            } as WorkflowNode;
          }

          const nextId =
            node.data.next && nodesToDelete.has(node.data.next)
              ? null
              : node.data.next;

          return {
            ...node,
            data: {
              ...node.data,
              parents:
                filteredParents && filteredParents.length > 0
                  ? filteredParents
                  : null,
              next: nextId,
            },
          } as WorkflowNode;
        });

      const newEdges = calculateEdges(newNodes);

      await applyLayout(newNodes, newEdges);
      console.debug("deleteSubtree result", { newNodes, newEdges });
      return { nodes: newNodes, edges: newEdges };
    },
    [nodes, getNodeById, calculateEdges, applyLayout],
  );

  /**
   * Rule:
   * 1. removedNode.type === condition:
   *    a. (isUnderCondition) removedNode.source === condition: replace the whole branch with placeholder-end structure
   *    b. removeNode.source !== condition: replace the whole branch under with an end node
   * 2. removedNode.source === conditon && removedNode.target === end: (is the only child of one of a condition branches)
   *      replace the node with a placeholder node
   * 3. none of the above (is a node in a chain): delete the node and reconnect it's target and source
   */

  const smartRemoveNode = useCallback(
    async (nodeId: string) => {
      const node = nodes.find((node) => node.id === nodeId);
      if (!node) return;
      const parentIds = node.data.parents ?? [];

      if (node.type === WorkflowNodeKey.Condition) {
        if (parentIds.length === 0) return;

        const conditionParentBranchIndexes = new Map<string, number[]>();
        const simpleParentIds: Set<string> = new Set();

        parentIds.forEach((pid) => {
          const parentNode = getNodeById(pid);
          if (!parentNode) return;

          if (parentNode.type === WorkflowNodeKey.Condition) {
            const data = parentNode.data as ConditionNodeData;
            const indexes = data.conditions.reduce<number[]>(
              (acc, cond, idx) => {
                if (cond.next === nodeId) acc.push(idx);
                return acc;
              },
              [],
            );
            if (indexes.length > 0)
              conditionParentBranchIndexes.set(pid, indexes);
          } else if (parentNode.data.next === nodeId) {
            simpleParentIds.add(pid);
          }
        });

        // Find reconnection target by traversing children until a shared node or End is found.
        const reconnectionTargets: string[] = [];
        const queue: string[] = (node.data as ConditionNodeData).conditions
          .map((cond) => cond.next)
          .filter((id): id is string => Boolean(id));

        const visited = new Set<string>();
        while (queue.length) {
          const currentId = queue.shift();
          if (!currentId || visited.has(currentId)) continue;
          visited.add(currentId);

          const currentNode = getNodeById(currentId);
          if (!currentNode) continue;

          const parentCount = currentNode.data.parents?.length ?? 0;
          if (parentCount > 1 || currentNode.type === WorkflowNodeKey.End) {
            reconnectionTargets.push(currentNode.id);
            continue;
          }

          const nextIds =
            currentNode.type === WorkflowNodeKey.Condition
              ? ((currentNode.data as ConditionNodeData).conditions
                  ?.map((cond) => cond.next)
                  .filter((id): id is string => Boolean(id)) ?? [])
              : [currentNode.data.next].filter((id): id is string =>
                  Boolean(id),
                );
          queue.push(...nextIds);
        }

        const { nodes: prunedNodes } = await deleteSubtree(nodeId);
        const reconnectToId = reconnectionTargets[0] ?? null;

        // If no downstream target, just return pruned result.
        if (!reconnectToId) {
          await applyLayout(prunedNodes);
          return;
        }

        const hasConditionParent = parentIds.some(
          (pid) => getNodeById(pid)?.type === WorkflowNodeKey.Condition,
        );

        const placeholderNode =
          hasConditionParent && reconnectToId
            ? createDefaultWorkflowNode(WorkflowNodeKey.Placeholder, {
                parents: parentIds,
                next: reconnectToId,
              })
            : null;

        const linkNodeId = placeholderNode?.id ?? reconnectToId;
        const parentIdSet = new Set(parentIds);
        const updatedNodes = prunedNodes.map((n) => {
          // Rewire parents that previously pointed to the deleted condition.
          if (parentIdSet.has(n.id)) {
            if (n.type === WorkflowNodeKey.Condition) {
              const data = n.data as ConditionNodeData;
              const targetIndexes =
                conditionParentBranchIndexes.get(n.id) ?? [];
              return {
                ...n,
                data: {
                  ...data,
                  conditions: data.conditions.map((cond) =>
                    targetIndexes.includes(data.conditions.indexOf(cond)) ||
                    cond.next === nodeId ||
                    cond.next === null
                      ? { ...cond, next: linkNodeId }
                      : cond,
                  ),
                },
              } as WorkflowNode;
            }

            if (
              n.data.next === nodeId ||
              n.data.next === null ||
              simpleParentIds.has(n.id)
            ) {
              return {
                ...n,
                data: {
                  ...n.data,
                  next: linkNodeId,
                },
              } as WorkflowNode;
            }
          }

          // Ensure reconnection target inherits the deleted node's parents (or the placeholder).
          if (n.id === reconnectToId) {
            const updatedParents = new Set(n.data.parents ?? []);
            if (placeholderNode) {
              updatedParents.add(placeholderNode.id);
              parentIds.forEach((pid) => updatedParents.delete(pid));
            } else {
              parentIds.forEach((pid) => updatedParents.add(pid));
            }

            return {
              ...n,
              data: { ...n.data, parents: Array.from(updatedParents) },
            } as WorkflowNode;
          }

          return n;
        });

        const finalNodes = placeholderNode
          ? [...updatedNodes, placeholderNode]
          : updatedNodes;
        const finalEdges = calculateEdges(finalNodes);
        await applyLayout(finalNodes, finalEdges);
      } else {
        const isSourceConditionNode = parentIds.some(
          (pid) => getNodeById(pid)?.type === WorkflowNodeKey.Condition,
        );

        const targetId = node.data.next ?? null;
        const targetNode = targetId ? getNodeById(targetId) : null;
        const isAnyTargetEndNode = targetNode?.type === WorkflowNodeKey.End;

        const isAnyTargetMergedNode = targetId
          ? edges.filter((incomingEdge) => incomingEdge.target === targetId)
              .length > 1
          : false;

        console.debug({ isSourceConditionNode, isAnyTargetEndNode });

        if (
          isSourceConditionNode &&
          (isAnyTargetEndNode || isAnyTargetMergedNode)
        ) {
          await replaceNode(nodeId, {}, WorkflowNodeKey.Placeholder);
        } else {
          await _deleteNode(nodeId);
        }
      }
      console.debug("parentid", parentIds[0]);

      setSelectedNode(parentIds[0] ?? null);
    },
    [
      nodes,
      edges,
      _deleteNode,
      deleteSubtree,
      setSelectedNode,
      replaceNode,
      getNodeById,
      applyLayout,
    ],
  );

  const insertNodeOnEdge = useCallback(
    async (nodeType: WorkflowNode["type"], edgeId: string) => {
      console.debug("addNodeFromEdge", nodeType, edgeId);
      const edge = edges.find((e) => e.id === edgeId);
      if (!edge) {
        console.error("addNodeFromEdge: Edge not found with ID:", edgeId);
        return;
      }

      const newNode = applyDefaultVisibilityToNode(
        createDefaultWorkflowNode(nodeType),
        getBoundFormSchema(nodes),
      );
      const updatedNodes = [...nodes, newNode];
      const updatedEdges = edges
        .filter((e) => e.id !== edgeId)
        .concat([
          {
            ...edge,
            id: `${edge.source}-to-${newNode.id}`,
            target: newNode.id,
            sourceHandle: "bottom",
            targetHandle: "top",
          },
          {
            id: `${newNode.id}-to-${edge.target}`,
            source: newNode.id,
            target: edge.target,
            type: edge.type,
            data: edge.data,
            sourceHandle: "bottom",
            targetHandle: "top",
          },
        ]);

      await applyLayout(updatedNodes, updatedEdges);
      return newNode;
    },
    [nodes, edges, applyLayout],
  );
  const insertNodeAfter = useCallback(
    async (
      newNodeType: WorkflowNode["type"],
      sourceNodeId: string,
      labelData?: { label: string; index?: number },
    ) => {
      console.debug("insertNodeAfter", newNodeType, sourceNodeId, selectedNode);

      const sourceNode = getNodeById(sourceNodeId);

      if (!sourceNode) {
        return;
      }
      let insertedNode: WorkflowNode = applyDefaultVisibilityToNode(
        createDefaultWorkflowNode(newNodeType, {
          parents: [sourceNodeId],
          next: sourceNode.data.next,
        }),
        getBoundFormSchema(nodes),
      );
      const nodesToAdd: WorkflowNode[] = [];

      if (insertedNode.type === WorkflowNodeKey.Condition) {
        console.debug("insertNodeAfter: Inserting Condition Node");
        const placeholderNode = {
          ...createDefaultWorkflowNode(WorkflowNodeKey.Placeholder),
          data: {
            parents: [insertedNode.id],
            next: sourceNode.data.next,
          },
        } as WorkflowNode;
        insertedNode = attachFallbackPlaceholder(
          insertedNode,
          placeholderNode.id,
        );
        nodesToAdd.push(placeholderNode);
      }
      nodesToAdd.push(insertedNode);

      const updatedNodes: WorkflowNode[] = nodes.map((node) => {
        if (node.id === sourceNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              next: insertedNode.id,
            },
          } as WorkflowNode;
        }
        if (node.data.parents?.includes(sourceNodeId)) {
          console.debug({ node });
          return {
            ...node,
            data: {
              ...node.data,
              parents: node.data.parents?.map((pid) =>
                pid === sourceNodeId ? nodesToAdd[0].id : pid,
              ),
            },
          } as WorkflowNode;
        }
        return node;
      });

      const finalizedNodes = [...updatedNodes, ...nodesToAdd];

      await applyLayout(finalizedNodes);
      setSelectedNode(insertedNode.id);
      return insertedNode;
    },
    [nodes, applyLayout, setSelectedNode],
  );
  const insertNodeBefore = useCallback(
    async (newNodeType: WorkflowNode["type"], targetNodeId: string) => {
      const targetNode = getNodeById(targetNodeId);
      if (!targetNode) {
        console.error(
          `insertNodeBefore: Target node not found with ID: ${targetNodeId}`,
        );
        return;
      }

      const parentIds = targetNode.data.parents ?? [];
      if (parentIds.length === 0) {
        console.error(
          `insertNodeBefore: Target node ${targetNodeId} has no parents to insert before.`,
        );
        return;
      }
      const baseNewNode = applyDefaultVisibilityToNode(
        createDefaultWorkflowNode(newNodeType, {
          parents: parentIds,
          next: targetNodeId,
        }),
        getBoundFormSchema(nodes),
      );

      let nodesToAdd: WorkflowNode[] = [baseNewNode];
      let insertedNode: WorkflowNode = baseNewNode;
      let linkNodeId: string = baseNewNode.id;

      if (newNodeType === WorkflowNodeKey.Condition) {
        const placeholderNode = createDefaultWorkflowNode(
          WorkflowNodeKey.Placeholder,
          { parents: [baseNewNode.id], next: targetNodeId },
        );
        const conditionNodeWithFallback = attachFallbackPlaceholder(
          baseNewNode as ConditionNodeType,
          placeholderNode.id,
        );

        nodesToAdd = [conditionNodeWithFallback, placeholderNode];
        insertedNode = conditionNodeWithFallback;
        linkNodeId = placeholderNode.id;
      }

      const updatedNodes = nodes.map((node) => {
        // Update parents to point to the new link node
        if (node.id === targetNodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              parents: [linkNodeId],
            },
          } as WorkflowNode;
        }

        if (parentIds.includes(node.id)) {
          if (node.type === WorkflowNodeKey.Condition) {
            const data = node.data as ConditionNodeData;
            const updatedConditions = data.conditions.map((cond) =>
              cond.next === targetNodeId
                ? { ...cond, next: insertedNode.id }
                : cond,
            );
            return {
              ...node,
              data: { ...data, conditions: updatedConditions },
            } as WorkflowNode;
          }

          if (node.data.next === targetNodeId) {
            return {
              ...node,
              data: { ...node.data, next: insertedNode.id },
            } as WorkflowNode;
          }
        }

        return node;
      });

      // Ensure target node no longer lists previous parents (already replaced above).
      const finalNodes = [...updatedNodes, ...nodesToAdd];
      const finalEdges = calculateEdges(finalNodes);

      await applyLayout(finalNodes, finalEdges);
      setSelectedNode(insertedNode.id);
      return insertedNode;
    },
    [nodes, getNodeById, calculateEdges, applyLayout, setSelectedNode],
  );
  // Branches that will connect to the same end node
  const addConditionBranch = useCallback(
    async (
      newNodeType: WorkflowNode["type"],
      sourceNodeId: string,
      labelData?: { label: string; index?: number },
    ) => {
      const sourceNode = nodes.find((n) => n.id === sourceNodeId);
      if (!sourceNode || sourceNode.type !== WorkflowNodeKey.Condition) {
        console.error(
          "addConditionBranch: source node is missing or not a condition node",
          sourceNode,
        );
        return;
      }

      // Find the shared end node by tracing the first existing branch
      const firstBranchEdge = edges.find((e) => e.source === sourceNodeId);
      if (!firstBranchEdge) {
        console.error(
          `addNodeUnderNode: Cannot find an existing branch to trace for an end node.`,
        );
        return;
      }

      let currentNodeId: string | null = firstBranchEdge.target;
      let sharedEndNodeId: string | null = null;
      const visited = new Set<string>();

      while (currentNodeId && !visited.has(currentNodeId)) {
        visited.add(currentNodeId);
        const currentNode = nodes.find((n) => n.id === currentNodeId);
        if (currentNode) {
          const parentCount = currentNode.data.parents?.length ?? 0;
          const isMergeNode = parentCount > 1;
          if (isMergeNode || currentNode.type === WorkflowNodeKey.End) {
            sharedEndNodeId = currentNode.id;
            break;
          }
        }
        const nextEdge = edges.find((e) => e.source === currentNodeId);
        currentNodeId = nextEdge ? nextEdge.target : null;
      }

      if (!sharedEndNodeId) {
        console.error(
          "addNodeUnderNode: Could not trace existing branch to a shared End node.",
        );
        return;
      }

      // 1. Create the new node for the new branch
      const newNode = applyDefaultVisibilityToNode(
        {
          ...createDefaultWorkflowNode(newNodeType, {
            parents: [sourceNodeId],
            next: sharedEndNodeId,
          }),
        } as WorkflowNode,
        getBoundFormSchema(nodes),
      );

      const branchName = labelData?.label ?? "new-branch";

      // 2. update shared end node's parents
      const updatedNodes = nodes.map((node) => {
        if (node.id === sharedEndNodeId) {
          const existingParents = new Set(node.data.parents ?? []);
          existingParents.add(newNode.id);
          return {
            ...node,
            data: {
              ...node.data,
              parents: [node.data.parents, newNode.id].flat(),
            },
          } as WorkflowNode;
        }
        if (node.id === sourceNodeId) {
          const data = node.data as ConditionNodeData;
          const newBranch: ConditionBranch = {
            isExpression: false,
            name: branchName,
            next: newNode.id,
            branch: {
              field: "",
              operator: ">" as const,
              value: undefined,
            },
          };

          return {
            ...node,
            data: {
              ...data,
              conditions: [...(data.conditions ?? []), newBranch],
            },
          } as WorkflowNode;
        }
        return node;
      });

      // 3. Add the new node and update the condition node's data
      const finalNodes = [...updatedNodes, newNode];

      await applyLayout(finalNodes);
      return newNode;
    },
    [nodes, edges, applyLayout],
  );

  const initializeFlow = useCallback(
    async (initialNodes: WorkflowNode[], initialEdges: Edge[]) => {
      await applyLayout(initialNodes, initialEdges);
    },
    [applyLayout],
  );

  const validateExpression = (
    branch: Branch,
  ): { isValid: true } | { isValid: false; error: string } => {
    if (!branch) {
      return { isValid: true }; // Fallback branches are valid.
    }

    if ("logic" in branch) {
      const leftResult = validateExpression(branch.left);
      if (!leftResult.isValid) return leftResult;
      return validateExpression(branch.right);
    }

    const expression = branch as UiExpression;
    const isValuePresent =
      expression.value !== null &&
      expression.value !== undefined &&
      expression.value !== "";

    if (!expression.field || !expression.operator || !isValuePresent) {
      return {
        isValid: false,
        error: "flow_validation.condition_expression_incomplete",
      };
    }

    // New rule: Check value type based on operator
    const stringOperators = [
      "contains",
      "not_contains",
      "equals",
      "not_equals",
    ];
    if (stringOperators.includes(expression.operator)) {
      if (typeof expression.value !== "string") {
        return {
          isValid: false,
          error: "flow_validation.condition_value_should_be_string",
        };
      }
    } else {
      // For other operators, expect a number
      if (
        typeof expression.value !== "number" &&
        isNaN(Number(expression.value))
      ) {
        return {
          isValid: false,
          error: "flow_validation.condition_value_should_be_number",
        };
      }
    }

    return { isValid: true };
  };

  const validateNodes = useCallback(async (): Promise<
    { isSuccess: true } | { isSuccess: false; error: string }
  > => {
    // 1. making sure that there is form under form node
    const formNode = nodes.find((node) => node.type === WorkflowNodeKey.Form);
    if (!formNode) {
      return {
        isSuccess: false,
        error: t("flow_validation.no_form_node"),
      };
    }
    if (!formNode.data.form) {
      setSelectedNode(formNode.id);
      return {
        isSuccess: false,
        error: t("flow_validation.form_not_bound"),
      };
    }

    // 2. make sure data of condition node
    const conditionNodes = nodes.filter(
      (node) => node.type === WorkflowNodeKey.Condition,
    );

    const validateExpression = (
      branch: Branch,
    ): { isValid: true } | { isValid: false; error: string } => {
      if (!branch) {
        return { isValid: true }; // Fallback branches are valid.
      }

      if ("logic" in branch) {
        const leftResult = validateExpression(branch.left);
        if (!leftResult.isValid) return leftResult;
        return validateExpression(branch.right);
      }

      const expression = branch as UiExpression;
      const isValuePresent =
        expression.value !== null &&
        expression.value !== undefined &&
        expression.value !== "";

      if (!expression.field || !expression.operator || !isValuePresent) {
        return {
          isValid: false,
          error: "flow_validation.condition_expression_incomplete",
        };
      }

      const stringOperators = [
        "contains",
        "not_contains",
        "equals",
        "not_equals",
      ];
      if (stringOperators.includes(expression.operator)) {
        if (typeof expression.value !== "string") {
          return {
            isValid: false,
            error: "flow_validation.condition_value_should_be_string",
          };
        }
      } else {
        if (
          typeof expression.value !== "number" &&
          isNaN(Number(expression.value))
        ) {
          return {
            isValid: false,
            error: "flow_validation.condition_value_should_be_number",
          };
        }
      }

      return { isValid: true };
    };

    for (const node of conditionNodes) {
      const data = node.data as ConditionNodeData;
      if (!data.conditions || data.conditions.length === 0) {
        setSelectedNode(node.id);
        return {
          isSuccess: false,
          error: t("flow_validation.condition_no_branches", {
            node: data.description || node.id,
          }),
        };
      }

      const fallbackBranches = data.conditions.filter(
        (c) => c.branch === null || c.branch === undefined,
      );
      if (fallbackBranches.length !== 1) {
        setSelectedNode(node.id);
        return {
          isSuccess: false,
          error: t("flow_validation.condition_fallback_error", {
            node: data.description || node.id,
          }),
        };
      }

      for (const condition of data.conditions) {
        const nextNode = nodes.find((n) => n.id === condition.next);
        if (!condition.next || nextNode?.type === WorkflowNodeKey.Placeholder) {
          setSelectedNode(node.id);
          return {
            isSuccess: false,
            error: t("flow_validation.condition_branch_unconnected", {
              node: condition.name || node.id,
            }),
          };
        }

        if (condition.branch && !condition.isExpression) {
          const expressionValidation = validateExpression(condition.branch);
          if (!expressionValidation.isValid) {
            setSelectedNode(node.id);
            return {
              isSuccess: false,
              error: t(expressionValidation.error, {
                node: data.description || node.id,
              }),
            };
          }
        }
      }
    }

    // 3. & 4. Approval and Parallel Approval Node Validation
    const validateApprovalData = (
      data: ApprovalNodeType["data"],
    ): { isValid: true } | { isValid: false; error: string } => {
      if (
        data.approver === ApproverType.ApplicantReportLine ||
        data.approver === ApproverType.UserReportLine
      ) {
        if (data.approveMethod) {
          if (
            "jobGrade" in data.approveMethod &&
            (data.approveMethod.jobGrade ?? 0) <= 0
          ) {
            return {
              isValid: false,
              error: t("flow_validation.invalid_job_grade"),
            };
          }
          if (
            "approveLevel" in data.approveMethod &&
            (data.approveMethod.approveLevel ?? 0) <= 0
          ) {
            return {
              isValid: false,
              error: t("flow_validation.invalid_approve_level"),
            };
          }
        }
      }

      if (data.approver === ApproverType.User) {
        if (!data.specificUser) {
          return { isValid: false, error: t("flow_validation.empty_user") };
        }

        if (data.specificUser.type === "reference") {
          if (!data.specificUser.reference && !data.specificUser.userId) {
            return { isValid: false, error: t("flow_validation.empty_user") };
          }
        } else {
          const manualUser = data.specificUser as { userIds?: string[] };
          if (!manualUser.userIds || manualUser.userIds.length === 0) {
            return { isValid: false, error: t("flow_validation.empty_user") };
          }
        }
      } else if (data.approver === ApproverType.UserReportLine) {
        if (!data.specificUser) {
          return { isValid: false, error: t("flow_validation.empty_user") };
        }

        if (
          "type" in data.specificUser &&
          data.specificUser.type === "reference"
        ) {
          if (!data.specificUser.reference && !data.specificUser.userId) {
            return { isValid: false, error: t("flow_validation.empty_user") };
          }
        } else if (!data.specificUser.userId) {
          return { isValid: false, error: t("flow_validation.empty_user") };
        }
      } else if (data.approver === ApproverType.DepartmentSupervisor) {
        if (
          data.departmentSupervisor?.type === "manual" &&
          !data.departmentSupervisor.departmentId
        ) {
          return {
            isValid: false,
            error: t("flow_validation.empty_department"),
          };
        }
        if (
          data.departmentSupervisor?.type === "reference" &&
          !data.departmentSupervisor.reference
        ) {
          return {
            isValid: false,
            error: t("flow_validation.empty_department_reference"),
          };
        }
      } else if (data.approver === ApproverType.Role) {
        if (!data.specificRole?.roleId) {
          return { isValid: false, error: t("flow_validation.empty_role") };
        }
      }
      return { isValid: true };
    };

    const approvalNodes = nodes.filter(
      (node) => node.type === WorkflowNodeKey.Approval,
    ) as ApprovalNodeType[];
    for (const node of approvalNodes) {
      const result = validateApprovalData(node.data);
      if (!result.isValid) {
        setSelectedNode(node.id);
        return { isSuccess: false, error: result.error };
      }
    }

    const parallelApprovalNodes = nodes.filter(
      (node) => node.type === WorkflowNodeKey.ParallelApproval,
    ) as ParallelApprovalNodeType[];
    for (const node of parallelApprovalNodes) {
      if (!node.data.approvals || node.data.approvals.length === 0) {
        setSelectedNode(node.id);
        return {
          isSuccess: false,
          error: t("flow_validation.empty_parallel_approvers"),
        };
      }
      for (const approvalData of node.data.approvals) {
        const result = validateApprovalData(approvalData);
        if (!result.isValid) {
          setSelectedNode(node.id);
          return { isSuccess: false, error: result.error };
        }
      }
    }

    return { isSuccess: true };
  }, [nodes, t, setSelectedNode]);

  const resetConditionNodeBranch = useCallback(async () => {
    console.debug(
      "reset condition",
      nodes.map((node) => {
        if (node.type === WorkflowNodeKey.Condition) {
          return {
            ...node,
            type: WorkflowNodeKey.Condition,
            data: {
              ...node.data,
              conditions: [
                ...node.data.conditions.map((condition) => ({
                  ...condition,
                  branch: condition.branch
                    ? {
                        field: "",
                        operator: ">",
                        value: undefined,
                      }
                    : null,
                })),
              ],
            },
          } as WorkflowNode;
        }
        return node;
      }),
    );

    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.type === WorkflowNodeKey.Condition) {
          return {
            ...node,
            type: WorkflowNodeKey.Condition,
            data: {
              ...node.data,
              conditions: [
                ...node.data.conditions.map((condition) => ({
                  ...condition,
                  name: condition.branch ? "Condition:" : condition.name,
                  branch: condition.branch
                    ? {
                        field: "",
                        operator: ">",
                        value: undefined,
                      }
                    : null,
                })),
              ],
            },
          } as WorkflowNode;
        }
        return node;
      }),
    );
  }, [nodes, setNodes]);

  return {
    // State
    nodes,
    edges,
    selectedNodeId,
    selectedNode,

    // Event handlers
    onNodesChange,
    onEdgesChange,
    onConnect,

    // Setters
    setSelectedNode,

    // Getters
    getNodeById,
    getEdgeById,

    // Actions
    addNode,
    updateNode,
    deleteSubtree,
    smartRemoveNode,
    insertNodeOnEdge,
    insertNodeAfter,
    insertNodeBefore,
    addConditionBranch,
    calculateEdges,
    applyLayout,
    initializeFlow,
    replaceNode,
    validateNodes,
    resetConditionNodeBranch,
  };
}

export function useFlowSelection() {
  const selectedNodeId = useAtomValue(selectedNodeIdAtom);
  return { selectedNodeId };
}

export function useFlowBuilderActions() {
  const context = useContext(FlowBuilderActionContext);
  if (!context) {
    throw new Error("useFlowBuilderActions must be used within Flow provider");
  }
  return context;
}
