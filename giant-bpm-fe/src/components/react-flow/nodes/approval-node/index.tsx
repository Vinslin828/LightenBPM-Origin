import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@/utils/cn";
import { ApprovalNodeType } from "@/types/flow";
import NodeToolMenu from "../../node-tool";
import {
  useFlowBuilderActions,
  useFlowSelection,
} from "@/hooks/useFlowBuilder";
import { ApprovalCard } from "./approval-card";

function ApprovalNode({
  id,
  data,
  selected = false,
}: NodeProps<ApprovalNodeType>) {
  const { smartRemoveNode: removeNode } = useFlowBuilderActions();
  const { selectedNodeId } = useFlowSelection();
  const isSelected = selected || selectedNodeId === id;

  return (
    <>
      <div
        className={cn(
          "relative",
          isSelected && "ring-2 ring-giant-blue rounded-md",
        )}
      >
        <NodeToolMenu
          toolbarProps={{ nodeId: id }}
          node={{ id }}
          isVisible={isSelected}
        />
        <Handle
          type="target"
          position={Position.Top}
          className="invisible"
          id="top"
        />
        <ApprovalCard
          data={data}
          selected={isSelected}
          onRemove={() => removeNode(id)}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          // className="invisible"
        />
      </div>
    </>
  );
}

export default ApprovalNode;
