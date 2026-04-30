import {
  ReactFlow,
  Background,
  ReactFlowProvider,
  useReactFlow,
  useOnSelectionChange,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { WorkflowEdgeKey } from "@/types/flow";
import { edgeTypes, nodeTypes } from "@/const/flow";
import AttribtuesPanel from "./attributes-panel";
import {
  FlowBuilderActionContext,
  useFlowBuilder,
} from "@/hooks/useFlowBuilder";
import { useCallback, useEffect, useMemo } from "react";

function FlowContent() {
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setSelectedNode,
    selectedNodeId,
    insertNodeOnEdge,
    insertNodeAfter,
    insertNodeBefore,
    smartRemoveNode,
    updateNode,
    replaceNode,
  } = useFlowBuilder();
  const { fitView } = useReactFlow();

  useEffect(() => {
    // Only fit view when initializing the page
    setTimeout(
      () => fitView({ duration: 0, maxZoom: 1, padding: { right: 360 } }),
      10,
    );
  }, [fitView]);

  const onSelectionChange = useCallback(
    ({
      nodes,
      edges: _edges,
    }: {
      nodes: Array<{ id: string }>;
      edges: Array<{ id: string }>;
    }) => {
      const nextSelectedNodeId = nodes[0]?.id ?? null;
      if (selectedNodeId === nextSelectedNodeId) {
        return;
      }
      console.debug("selection change", nodes, nextSelectedNodeId);
      setSelectedNode(nextSelectedNodeId);
    },
    [selectedNodeId, setSelectedNode],
  );

  useOnSelectionChange({
    onChange: onSelectionChange,
  });

  const actionContextValue = useMemo(
    () => ({
      setSelectedNode,
      insertNodeOnEdge,
      insertNodeAfter,
      insertNodeBefore,
      smartRemoveNode,
      updateNode,
      replaceNode,
    }),
    [
      setSelectedNode,
      insertNodeOnEdge,
      insertNodeAfter,
      insertNodeBefore,
      smartRemoveNode,
      updateNode,
      replaceNode,
    ],
  );

  return (
    <FlowBuilderActionContext.Provider value={actionContextValue}>
      <div className="flex flex-row w-full h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          panOnScroll={true}
          selectionOnDrag={true}
          panOnDrag={false}
          nodeOrigin={[0.5, 0]}
          minZoom={0.8}
          nodesDraggable={false}
          defaultEdgeOptions={{ type: WorkflowEdgeKey.Label }}
        >
          <Background bgColor="#E5E7EB" />
          <AttribtuesPanel />
        </ReactFlow>
      </div>
    </FlowBuilderActionContext.Provider>
  );
}

export function Flow() {
  return (
    <ReactFlowProvider>
      <FlowContent />
    </ReactFlowProvider>
  );
}
