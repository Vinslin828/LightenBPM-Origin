import { Handle, Position, NodeProps } from "@xyflow/react";
import { DummyNodeType } from "@/types/flow";

function DummyNode({ id, data, ...props }: NodeProps<DummyNodeType>) {
  // A dummy node is just a point for layout, so it can be very minimal.
  // It's not meant to be interacted with by the user.
  return (
    <>
      <Handle type="target" position={Position.Top} className="invisible" />
      <div
        className="w-1 h-1 bg-gray-300 rounded-full"
        style={{
          width: props.width ?? 1,
          height: props.height ?? 1,
        }}
      />
      <Handle type="source" position={Position.Bottom} className="invisible" />
    </>
  );
}

export default DummyNode;
