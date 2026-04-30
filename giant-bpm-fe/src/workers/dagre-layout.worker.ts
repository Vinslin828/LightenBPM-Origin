import dagre from "dagre";
import { Edge, Position } from "@xyflow/react";
import { LayoutOptions, WorkflowNode, WorkflowNodeKey } from "@/types/flow";

// Default node dimensions
const NODE_WIDTH = 280;
const NODE_HEIGHT = 84;

type DagreNode =
  | WorkflowNode
  | { id: string; width: number; height: number; measured?: undefined };

/**
 * Adds dummy nodes to the graph to ensure that all paths from a root to a leaf
 * have the same number of nodes. This helps create a more balanced layout.
 * @param nodes The original workflow nodes.
 * @param edges The original edges.
 * @returns An object containing all nodes (original + dummy) and all edges (original + dummy).
 */
const addDummyNodes = (
  nodes: DagreNode[],
  edges: Edge[],
): { allNodes: DagreNode[]; allEdges: Edge[] } => {
  const adj: Map<string, string[]> = new Map();
  const revAdj: Map<string, string[]> = new Map();
  nodes.forEach((n) => {
    adj.set(n.id, []);
    revAdj.set(n.id, []);
  });
  edges.forEach((edge) => {
    adj.get(edge.source)?.push(edge.target);
    revAdj.get(edge.target)?.push(edge.source);
  });

  const roots = nodes.filter(
    (node) => (revAdj.get(node.id) ?? []).length === 0,
  );
  const depths = new Map<string, number>();

  function dfs(nodeId: string, depth: number) {
    const currentDepth = depths.get(nodeId) ?? -1;
    if (depth > currentDepth) {
      depths.set(nodeId, depth);
      const children = adj.get(nodeId) ?? [];
      for (const childId of children) {
        dfs(childId, depth + 1);
      }
    }
  }
  roots.forEach((root) => dfs(root.id, 0));

  const leaves = nodes.filter((node) => (adj.get(node.id) ?? []).length === 0);
  let maxDepth = 0;
  leaves.forEach((leaf) => {
    const depth = depths.get(leaf.id) ?? 0;
    if (depth > maxDepth) {
      maxDepth = depth;
    }
  });

  const dummyNodes: DagreNode[] = [];
  const dummyEdges: Edge[] = [];
  const dummyNodeIdPrefix = "dummy-node-for-layout-";

  leaves.forEach((leaf) => {
    const leafDepth = depths.get(leaf.id) ?? 0;
    let parentId = leaf.id;
    for (let i = leafDepth; i < maxDepth; i++) {
      const dummyId = `${dummyNodeIdPrefix}${leaf.id}-${i}`;
      dummyNodes.push({
        id: dummyId,
        width: 1,
        height: 1,
        style: { backgroundColor: "blue" },
      });
      dummyEdges.push({
        id: `dummy-edge-${parentId}-to-${dummyId}`,
        source: parentId,
        target: dummyId,
      });
      parentId = dummyId;
    }
  });

  return {
    allNodes: [...nodes, ...dummyNodes],
    allEdges: [...edges, ...dummyEdges],
  };
};

const addConditionDummyNodes = (
  nodes: WorkflowNode[],
  edges: Edge[],
): { allNodes: DagreNode[]; allEdges: Edge[] } => {
  const adj: Map<string, string[]> = new Map();
  const revAdj: Map<string, string[]> = new Map();
  nodes.forEach((n) => {
    adj.set(n.id, []);
    revAdj.set(n.id, []);
  });
  edges.forEach((edge) => {
    adj.get(edge.source)?.push(edge.target);
    revAdj.get(edge.target)?.push(edge.source);
  });

  const roots = nodes.filter(
    (node) => (revAdj.get(node.id) ?? []).length === 0,
  );
  const depths = new Map<string, number>();

  function dfs(nodeId: string, depth: number) {
    const currentDepth = depths.get(nodeId) ?? -1;
    if (depth > currentDepth) {
      depths.set(nodeId, depth);
      const children = adj.get(nodeId) ?? [];
      for (const childId of children) {
        dfs(childId, depth + 1);
      }
    }
  }
  roots.forEach((root) => dfs(root.id, 0));

  const dummyNodes: DagreNode[] = [];
  const addedEdges: Edge[] = [];
  const edgesToRemove = new Set<string>();
  const dummyNodeIdPrefix = "dummy-node-for-layout-";

  // Handle merge nodes
  const mergeNodes = nodes.filter(
    (node) => (revAdj.get(node.id) ?? []).length > 1,
  );
  mergeNodes.forEach((mergeNode) => {
    const predecessors = revAdj.get(mergeNode.id) ?? [];
    if (predecessors.length < 2) return;

    const maxDepth = predecessors.reduce(
      (max, predId) => Math.max(max, depths.get(predId) ?? 0),
      0,
    );

    predecessors.forEach((predId) => {
      const predDepth = depths.get(predId) ?? 0;
      const depthDiff = maxDepth - predDepth;

      if (depthDiff > 0) {
        const edge = edges.find(
          (e) => e.source === predId && e.target === mergeNode.id,
        );
        if (edge) {
          edgesToRemove.add(edge.id);
        }

        let parentId = predId;
        for (let i = 0; i < depthDiff; i++) {
          const dummyId = `${dummyNodeIdPrefix}${predId}-to-${mergeNode.id}-${i}`;
          dummyNodes.push({ id: dummyId, width: 1, height: 1 });
          addedEdges.push({
            id: `dummy-edge-${parentId}-to-${dummyId}`,
            source: parentId,
            target: dummyId,
          });
          parentId = dummyId;
        }
        addedEdges.push({
          id: `dummy-edge-${parentId}-to-${mergeNode.id}`,
          source: parentId,
          target: mergeNode.id,
        });
      }
    });
  });

  const remainingEdges = edges.filter((e) => !edgesToRemove.has(e.id));
  const currentNodes = [...nodes, ...dummyNodes];
  const currentEdges = [...remainingEdges, ...addedEdges];

  // Handle original leaves with potentially updated graph
  const { allNodes: finalNodes, allEdges: finalEdges } = addDummyNodes(
    currentNodes,
    currentEdges,
  );

  return { allNodes: finalNodes, allEdges: finalEdges };
};

/**
 * Creates and configures a new Dagre graph instance.
 * @param options Layout options.
 * @returns A configured Dagre graph.
 */
const createDagreGraph = (options: LayoutOptions): dagre.graphlib.Graph => {
  const { direction = "TB", nodeSpacing = 50, rankSpacing = 100 } = options;

  const dagreGraph = new dagre.graphlib.Graph({ compound: true });
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: nodeSpacing,
    ranksep: rankSpacing,
  });
  return dagreGraph;
};

/**
 * Populates the Dagre graph with nodes and edges.
 * @param dagreGraph The Dagre graph instance.
 * @param nodes The nodes to add.
 * @param edges The edges to add.
 * @param options Layout options.
 */
const populateGraph = (
  dagreGraph: dagre.graphlib.Graph,
  nodes: DagreNode[],
  edges: Edge[],
  options: LayoutOptions,
) => {
  const { nodeWidth = NODE_WIDTH, nodeHeight = NODE_HEIGHT } = options;

  nodes.forEach((node) => {
    const width = node.measured?.width ?? node.width ?? nodeWidth;
    const height = node.measured?.height ?? node.height ?? nodeHeight;
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });
};

const groupConditionSubflows = (
  dagreGraph: dagre.graphlib.Graph,
  nodes: WorkflowNode[],
  edges: Edge[],
) => {
  const edgeMap = new Map(edges.map((e) => [e.source, e])); // Maps source to the full edge object
  const incomingEdgeCounts = edges.reduce((acc, edge) => {
    acc.set(edge.target, (acc.get(edge.target) || 0) + 1);
    return acc;
  }, new Map<string, number>());

  nodes.forEach((node) => {
    if (
      node.type === WorkflowNodeKey.Condition &&
      node.data?.conditions &&
      Array.isArray(node.data.conditions) &&
      node.data.conditions.length >= 1
    ) {
      const subGraphNodeIds = new Set<string>();
      const queue: string[] = [node.id]; // Start with the condition node itself
      const visited = new Set<string>();

      let head = 0;
      while (head < queue.length) {
        const currentId = queue[head++];
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        subGraphNodeIds.add(currentId);

        // If the current node is the condition node, its successors are the branches
        if (currentId === node.id) {
          const successors = node.data.conditions
            .map((c) => c.next)
            .filter(Boolean) as string[];
          queue.push(...successors);
        } else {
          // For other nodes, follow the single outgoing edge
          const outgoingEdge = edgeMap.get(currentId);
          if (outgoingEdge) {
            const targetId = outgoingEdge.target;
            // Stop if the target is a merge point (more than 1 incoming edge)
            if ((incomingEdgeCounts.get(targetId) || 1) <= 1) {
              queue.push(targetId);
            }
          }
        }
      }

      // Apply dummy nodes logic to balance the subgraph
      const subNodes = nodes.filter((n) => subGraphNodeIds.has(n.id));
      const subEdges = edges.filter(
        (e) => subGraphNodeIds.has(e.source) && subGraphNodeIds.has(e.target),
      );

      const { allNodes: balancedNodes, allEdges: balancedEdges } =
        addDummyNodes(subNodes, subEdges);

      const subNodeIdSet = new Set(subNodes.map((n) => n.id));
      const dummyNodes = balancedNodes.filter((n) => !subNodeIdSet.has(n.id));
      const dummyEdges = balancedEdges.filter((e) =>
        e.id?.startsWith("dummy-edge-"),
      );

      dummyNodes.forEach((n) => {
        dagreGraph.setNode(n.id, { width: n.width, height: n.height });
        subGraphNodeIds.add(n.id); // Add dummy to the group
      });

      dummyEdges.forEach((e) => {
        dagreGraph.setEdge(e.source, e.target);
      });

      // Create a subgraph and parent all identified nodes
      const subgraphId = `sg-${node.id}`;
      dagreGraph.setNode(subgraphId, {
        label: `subgraph ${node.id}`,
        // clusterLabelPos: "top",
      });

      subGraphNodeIds.forEach((subNodeId) => {
        dagreGraph.setParent(subNodeId, subgraphId);
      });
    }
  });
};

/**
 * Aligns nodes within the same rank to a common top edge.
 * @param dagreGraph The Dagre graph instance after layout.
 * @param nodes All nodes in the graph.
 * @param options Layout options.
 */
const alignNodesToTop = (
  dagreGraph: dagre.graphlib.Graph,
  nodes: DagreNode[],
  options: LayoutOptions,
) => {
  const { nodeWidth = NODE_WIDTH, nodeHeight = NODE_HEIGHT } = options;
  const ranks: Record<string, { nodes: DagreNode[]; minTopY: number }> = {};
  const nodeDimensions = new Map<string, { width: number; height: number }>();

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    if (!nodeWithPosition) return;

    const width = node.measured?.width ?? node.width ?? nodeWidth;
    const height = node.measured?.height ?? node.height ?? nodeHeight;
    nodeDimensions.set(node.id, { width, height });

    const rankY = String(nodeWithPosition.y);
    if (!ranks[rankY]) {
      ranks[rankY] = { nodes: [], minTopY: Infinity };
    }
    ranks[rankY].nodes.push(node);
  });

  Object.values(ranks).forEach((rank) => {
    let minTopY = Infinity;
    rank.nodes.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const { height } = nodeDimensions.get(node.id)!;
      const topY = nodeWithPosition.y - height / 2;
      if (topY < minTopY) {
        minTopY = topY;
      }
    });

    rank.nodes.forEach((node) => {
      const nodeWithPosition = dagreGraph.node(node.id);
      const { height } = nodeDimensions.get(node.id)!;
      nodeWithPosition.y = minTopY + height / 2;
    });
  });
};

/**
 * Maps the calculated layout from Dagre back to the workflow nodes.
 * @param nodes The original workflow nodes.
 * @param dagreGraph The laid-out Dagre graph.
 * @param direction The layout direction.
 * @returns An array of workflow nodes with updated positions.
 */
const getLayoutedNodes = (
  nodes: WorkflowNode[],
  dagreGraph: dagre.graphlib.Graph,
  direction: LayoutOptions["direction"] = "TB",
): WorkflowNode[] => {
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    if (!nodeWithPosition) return node;

    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: nodeWithPosition.x,
        y: nodeWithPosition.y,
      },
    };
  });
};

/**
 * This is the core layout function that will be executed inside the Web Worker.
 */
function performLayout(
  nodes: WorkflowNode[],
  edges: Edge[],
  options: LayoutOptions = {},
): { nodes: WorkflowNode[]; edges: Edge[] } {
  // 1. Add dummy nodes for conditional branches to ensure balanced layouts.
  const { allNodes, allEdges } = addDummyNodes(nodes, edges);

  // console.debug(allNodes.length, JSON.stringify({ allNodes }));

  // 2. Create and configure the Dagre graph.
  const dagreGraph = createDagreGraph(options);
  populateGraph(dagreGraph, allNodes, allEdges, options);

  // 3. Apply custom layout constraints, like ranking nodes at the same level.
  // groupConditionSubflows(dagreGraph, nodes, edges);

  // 4. Run the Dagre layout algorithm.
  dagre.layout(dagreGraph);

  // 5. Perform post-layout adjustments, like top-aligning nodes in the same rank.
  alignNodesToTop(dagreGraph, allNodes, options);

  // 6. Map the calculated positions back to the original nodes.
  const layoutedNodes = getLayoutedNodes(nodes, dagreGraph, options.direction);

  // Note: The original edges are returned. Dummy edges are not needed for rendering.
  return { nodes: layoutedNodes, edges };
}

// Listen for messages from the main thread
self.onmessage = (
  event: MessageEvent<{
    nodes: WorkflowNode[];
    edges: Edge[];
    options: LayoutOptions;
  }>,
) => {
  const { nodes, edges, options } = event.data;
  // Perform the layout and post the result back to the main thread
  const layoutedElements = performLayout(nodes, edges, options);
  self.postMessage(layoutedElements);
};
