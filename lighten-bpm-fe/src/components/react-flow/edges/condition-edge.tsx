import React from "react";
import {
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
  EdgeProps,
} from "@xyflow/react";

const LabelEdge = ({ id, data, ...props }: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath(props);

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            background: "#ffcc00",
            padding: 10,
            borderRadius: 5,
            fontSize: 12,
            fontWeight: 700,
          }}
          className="nodrag nopan"
        >
          {data?.label ? (data.label as string) : "Condition"}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default LabelEdge;
