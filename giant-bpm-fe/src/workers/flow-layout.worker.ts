import { Edge, Position, XYPosition } from "@xyflow/react";
import { LayoutOptions, WorkflowNode, WorkflowNodeKey } from "@/types/flow";

/**
 * Calculate subtree width.
 * @param nodeMap The map of node.
 * @param parentNodesMap The map of parent nodes.
 * @param childNodesMap The map of child nodes.
 * @param startNode The start node.
 * @param options The layout options.
 * @returns An map of subtree width.
 */
const calculateSubtreeWidth = (
  nodeMap: Map<string, WorkflowNode>,
  parentNodesMap: Map<string, WorkflowNode[]>,
  childNodesMap: Map<string, WorkflowNode[]>,
  startNode: WorkflowNode,
  options: LayoutOptions,
): Map<string, number> => {
  const nodeWidth = options.nodeWidth ?? 300;
  const nodeSpacing = options.nodeSpacing ?? 50;

  const subtreeWidthMap = new Map<string, number>();
  const queue: WorkflowNode[] = [];
  queue[0] = startNode;
  for (let i = 0; i < queue.length; i++) {
    const currentNode = queue[i];

    const childNodes = childNodesMap.get(currentNode.id);
    if (!childNodes || childNodes.length == 0) {
      // end node
      continue;
    }

    // get measured width of child nodes as subtree width
    let subtreeWidth = 0;
    childNodes.forEach((childNode) => {
      const widthWithSpacing =
        (childNode.measured?.width ?? nodeWidth) + nodeSpacing;
      subtreeWidthMap.set(childNode.id, widthWithSpacing);
      subtreeWidth += widthWithSpacing;
      queue.push(childNode);
    });

    // update subtree width of parents
    let updatingNode = currentNode;
    while (true) {
      const updatingNodeSubtreeWidth =
        subtreeWidthMap.get(updatingNode.id) ?? nodeWidth + nodeSpacing;
      if (subtreeWidth <= updatingNodeSubtreeWidth) break;

      subtreeWidthMap.set(updatingNode.id, subtreeWidth);

      const updatingParentNodes = parentNodesMap.get(updatingNode.id);
      if (!updatingParentNodes || updatingParentNodes.length != 1) break;

      updatingNode = updatingParentNodes[0];
      subtreeWidth = 0;
      const updatingChildNodes = childNodesMap.get(updatingNode.id);
      updatingChildNodes?.forEach((updatingChildNode) => {
        subtreeWidth +=
          subtreeWidthMap.get(updatingChildNode.id) ?? nodeWidth + nodeSpacing;
      });
    }
  }

  return subtreeWidthMap;
};

/**
 * Calculate positions.
 * @param nodeMap The map of node.
 * @param parentNodesMap The map of child nodes.
 * @param childNodesMap The map of child nodes.
 * @param startNode The start node.
 * @param options The layout options.
 * @returns An map of position.
 */
const calculatePositions = (
  nodeMap: Map<string, WorkflowNode>,
  parentNodesMap: Map<string, WorkflowNode[]>,
  childNodesMap: Map<string, WorkflowNode[]>,
  subtreeWidthMap: Map<string, number>,
  startNode: WorkflowNode,
  options: LayoutOptions,
): Map<string, XYPosition> => {
  const nodeWidth = options.nodeWidth ?? 280;
  const nodeHeight = options.nodeHeight ?? 84;
  const rankSpacing = options.rankSpacing ?? 150;

  const positionMap = new Map<string, XYPosition>();
  const queue: WorkflowNode[] = [];
  queue[0] = startNode;
  positionMap.set(startNode.id, { x: 0, y: 0 });
  for (let i = 0; i < queue.length; i++) {
    const currentNode = queue[i];
    const currentNodeWidth = currentNode.measured?.width ?? nodeWidth;
    const currentNodeHeight = currentNode.measured?.height ?? nodeHeight;
    let currentNodePosition = positionMap.get(currentNode.id);
    if (!currentNodePosition) continue;

    const parentNodes = parentNodesMap.get(currentNode.id);
    if (parentNodes && parentNodes.length > 1) {
      let parentNodesMinCenterX = Number.MAX_VALUE;
      let parentNodesMaxCenterX = -Number.MAX_VALUE;
      let parentNodesMaxY = -Number.MAX_VALUE;
      parentNodes.forEach((parentNode) => {
        const parentNodeHeight = parentNode.measured?.height ?? nodeHeight;
        const parentNodePosition = positionMap.get(parentNode.id);
        if (!parentNodePosition) return;

        const parentNodeCenterX = parentNodePosition.x;
        parentNodesMinCenterX = Math.min(
          parentNodesMinCenterX,
          parentNodeCenterX,
        );
        parentNodesMaxCenterX = Math.max(
          parentNodesMaxCenterX,
          parentNodeCenterX,
        );
        parentNodesMaxY = Math.max(
          parentNodesMaxY,
          parentNodePosition.y + parentNodeHeight,
        );
      });
      currentNodePosition = {
        x: (parentNodesMinCenterX + parentNodesMaxCenterX) / 2,
        y: parentNodesMaxY + rankSpacing,
      };
      positionMap.set(currentNode.id, currentNodePosition);
    }

    const childNodes = childNodesMap.get(currentNode.id);
    if (!childNodes || childNodes.length == 0) {
      // end node
      positionMap.set(currentNode.id, { x: 0, y: currentNodePosition.y });
      continue;
    }

    let lastChildNodeCenterX = currentNodePosition.x;
    let lastChildNodeSubtreeWidth = 0;
    let childNodesMinCenterX = Number.MAX_VALUE;
    let childNodesMaxCenterX = -Number.MAX_VALUE;
    childNodes.forEach((childNode) => {
      const width = childNode.measured?.width ?? nodeWidth;
      const subtreeWidth = subtreeWidthMap.get(childNode.id) ?? width;

      const centerX =
        lastChildNodeCenterX + (lastChildNodeSubtreeWidth + subtreeWidth) / 2;
      const y = currentNodePosition.y + currentNodeHeight + rankSpacing;
      positionMap.set(childNode.id, { x: centerX, y: y });
      childNodesMinCenterX = Math.min(centerX, childNodesMinCenterX);
      childNodesMaxCenterX = Math.max(centerX, childNodesMaxCenterX);

      const childParentNodes = parentNodesMap.get(childNode.id);
      if (
        childParentNodes &&
        childParentNodes.length > 0 &&
        currentNode.id == childParentNodes[childParentNodes.length - 1].id
      ) {
        queue.push(childNode);
      }

      lastChildNodeCenterX = centerX;
      lastChildNodeSubtreeWidth = subtreeWidth;
    });

    // center child nodes
    const offsetX =
      currentNodePosition.x - (childNodesMinCenterX + childNodesMaxCenterX) / 2;
    childNodes.forEach((childNode) => {
      const pos = positionMap.get(childNode.id);
      if (!pos) return;

      positionMap.set(childNode.id, { x: pos.x + offsetX, y: pos.y });
    });
  }
  return positionMap;
};

/**
 * @param nodes The original workflow nodes.
 * @param positionMap The calculated position map.
 * @returns An array of workflow nodes with updated positions.
 */
const getLayoutedNodes = (
  nodes: WorkflowNode[],
  positionMap: Map<string, XYPosition>,
): WorkflowNode[] => {
  return nodes.map((node) => {
    const position = positionMap.get(node.id);
    if (!position) return node;

    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: position.x,
        y: position.y,
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
  options: LayoutOptions,
): { nodes: WorkflowNode[]; edges: Edge[] } {
  const nodeMap = nodes.reduce(
    (map: Map<string, WorkflowNode>, node: WorkflowNode) =>
      map.set(node.id, node),
    new Map<string, WorkflowNode>(),
  );
  const parentNodesMap = new Map<string, WorkflowNode[]>();
  nodes.forEach((node) => {
    const parentNodes: WorkflowNode[] = [];
    edges
      .filter((edge) => edge.target === node.id)
      .forEach((edge) => {
        const parentNode = nodeMap.get(edge.source);
        if (parentNode) parentNodes.push(parentNode);
      });
    parentNodesMap.set(node.id, parentNodes);
  });
  const childNodesMap = new Map<string, WorkflowNode[]>();
  nodes.forEach((node) => {
    const childNodes: WorkflowNode[] = [];
    edges
      .filter((edge) => edge.source === node.id)
      .forEach((edge) => {
        const childNode = nodeMap.get(edge.target);
        if (childNode) childNodes.push(childNode);
      });
    childNodesMap.set(node.id, childNodes);
  });
  const startNode = nodes[0];
  const subtreeWidthMap = calculateSubtreeWidth(
    nodeMap,
    parentNodesMap,
    childNodesMap,
    startNode,
    options,
  );
  const positionMap = calculatePositions(
    nodeMap,
    parentNodesMap,
    childNodesMap,
    subtreeWidthMap,
    startNode,
    options,
  );
  const layoutedNodes = getLayoutedNodes(nodes, positionMap);
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
