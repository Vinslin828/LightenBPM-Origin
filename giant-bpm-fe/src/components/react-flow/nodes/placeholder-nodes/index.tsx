import { memo } from "react";

import { forwardRef, type ReactNode } from "react";
import {
  useNodeId,
  Handle,
  Position,
  type NodeProps,
  NodeToolbar,
} from "@xyflow/react";

import { BaseNode } from "@/components/react-flow/nodes/base-node";
import NodesMenu from "@/components/react-flow/nodes/nodes-menu";
import { WorkflowNode } from "@/types/flow";
import { useFlowBuilderActions } from "@/hooks/useFlowBuilder";
import { createDefaultWorkflowNode } from "@/const/flow";

export const PlaceholderNodeDemo = memo(() => {
  return (
    <PlaceholderNode>
      <div>+</div>
    </PlaceholderNode>
  );
});

("use client");

export type PlaceholderNodeProps = Partial<NodeProps> & {
  children?: ReactNode;
};

export const PlaceholderNode = forwardRef<HTMLDivElement, PlaceholderNodeProps>(
  ({}, ref) => {
    const id = useNodeId();
    const { replaceNode, setSelectedNode } = useFlowBuilderActions();

    const handleNodeTypeSelect = async (nodeType: WorkflowNode["type"]) => {
      if (id) {
        const newNode = { ...createDefaultWorkflowNode(nodeType) };
        console.debug({ newNode });
        await replaceNode(id, newNode.data, nodeType);
        setSelectedNode(id);
      }
    };

    return (
      <BaseNode
        ref={ref}
        className="w-[280px] h-[84px] border-dashed border-gray-400 bg-card p-2 text-center text-gray-400 shadow-none flex justify-center items-center"
      >
        <button>+</button>
        <NodeToolbar position={Position.Bottom}>
          <NodesMenu onAddNode={handleNodeTypeSelect} />
        </NodeToolbar>
        <Handle
          type="target"
          position={Position.Top}
          className="invisible"
          isConnectable={false}
          id="top"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          className="invisible"
          isConnectable={false}
          id="bottom"
        />
      </BaseNode>
    );
  },
);

PlaceholderNode.displayName = "PlaceholderNode";
