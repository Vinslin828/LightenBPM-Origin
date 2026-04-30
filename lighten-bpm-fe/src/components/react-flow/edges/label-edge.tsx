import { useMemo } from "react";
import {
  EdgeLabelRenderer,
  BaseEdge,
  type Edge,
  type EdgeProps,
  getSmoothStepPath,
} from "@xyflow/react";
import { useFlowBuilder } from "@/hooks/useFlowBuilder";
import { WorkflowNodeKey } from "@/types/flow";

type Props = EdgeProps<
  Edge<{ label: string; index: number; isHighlighted?: boolean }>
>;

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
}: Props) {
  const centerY = targetY - sourceY + sourceY - 60;
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    centerY,
    targetPosition,
  });

  // const edgePath = `M ${sourceX} ${sourceY} L ${sourceX} ${centerY} L ${targetX} ${centerY} L ${targetX} ${targetY}`;
  const { getNodeById, getEdgeById } = useFlowBuilder();
  const edge = getEdgeById(id);
  const sourceNode = edge ? getNodeById(edge?.source) : undefined;
  const targetNode = edge ? getNodeById(edge?.target) : undefined;
  const childIndex = useMemo(() => {
    if (sourceNode?.type === WorkflowNodeKey.Condition) {
      return sourceNode?.data.conditions
        .map((n) => n.next)
        .indexOf(targetNode?.id ?? "");
    }
  }, [sourceNode]);

  const isHighlighted = data?.isHighlighted ? data.isHighlighted : false;

  const conditionLabel = useMemo(() => {
    if (!data || !data.label) {
      return undefined;
    }
    if (
      sourceNode &&
      targetNode &&
      sourceNode.type === WorkflowNodeKey.Condition &&
      childIndex
    ) {
      // const childIndex = childIndex?.indexOf(targetNode?.id ?? "");
      if (sourceNode?.data.conditions[childIndex]) {
        if (sourceNode.data.conditions[childIndex].isExpression) {
          return sourceNode.data.conditions[childIndex].branch?.expression
            ? sourceNode.data.conditions[childIndex].branch?.expression
            : "Condition: ";
        }
        return sourceNode.data.conditions[childIndex].name;
      } else {
        return data.label;
      }
    }
  }, [data, sourceNode, targetNode, childIndex]);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: isHighlighted ? "var(--color-lighten-blue)" : undefined,
          strokeWidth: isHighlighted ? 1.5 : undefined,
        }}
      />
      <EdgeLabelRenderer>
        {data?.label && (
          // <EdgeLabel
          //   transform={`translate(-50%, -100%) translate(${targetX}px,${targetY - 10}px)`}
          //   label={data?.label}
          // />
          <div
            style={{
              transform: `translate(-50%, -100%) translate(${targetX}px,${targetY - 10}px)`,
            }}
            className="no-darg no-pan w-fit absolute"
          >
            <ConditionLabel
              index={childIndex === 0 ? undefined : childIndex}
              label={childIndex === 0 ? "Fallback" : conditionLabel}
            />
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}
type ConditonLabelProps = {
  index?: number;
  label?: string;
};
function ConditionLabel({ index, label }: ConditonLabelProps) {
  return (
    <div className="px-0.5 h-6 bg-white rounded-3xl flex flex-row text-xs text-primary-text items-center">
      {index && (
        <div className="rounded-full bg-gray-2 text-primary-text h-5 w-5 flex items-center justify-center text-xs">
          {index}
        </div>
      )}
      {label && (
        <div className="px-2 max-w-[250px] overflow-ellipsis overflow-hidden whitespace-nowrap">
          {label}
        </div>
      )}
    </div>
  );
}
