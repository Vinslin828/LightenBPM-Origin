import { Button } from "@ui/button";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@/utils/cn";
import { ConditionNodeType } from "@/types/flow";
import NodeToolMenu from "../../node-tool";
import {
  useFlowBuilderActions,
  useFlowSelection,
} from "@/hooks/useFlowBuilder";
import { ConditionIcon, TrashIcon } from "@/components/icons";

function ConditionNode({
  id,
  data,
  selected = false,
}: NodeProps<ConditionNodeType>) {
  const { smartRemoveNode: removeNode } = useFlowBuilderActions();
  const { selectedNodeId } = useFlowSelection();
  const isSelected = selected || selectedNodeId === id;

  return (
    <>
      <div
        className={cn(
          "relative",
          isSelected && "ring-2 ring-lighten-blue rounded-md",
        )}
      >
        <NodeToolMenu
          toolbarProps={{ nodeId: id }}
          node={{ id }}
          isVisible={isSelected}
          showDownButton={false}
        />

        <Handle
          type="target"
          position={Position.Top}
          className="invisible"
          id="top"
        />
        <div className="w-[280px] h-[84px] bg-white rounded-md shadow-sm overflow-hidden flex">
          <div className="h-full w-1 bg-secondary flex-shrink-0" />
          <div className="flex flex-col justify-between p-3 flex-1">
            <div className="flex flex-row items-center gap-2 text-primary-text">
              <ConditionIcon className="w-5 h-5 text-primary-text" />
              <span className="text-xs font-medium">Condition</span>
              {isSelected && (
                <Button
                  variant={"icon"}
                  className="rounded-full bg-gray-2 p-1 absolute right-2.5 top-2.5 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNode(id);
                  }}
                >
                  <TrashIcon className="w-3.5 h-3.5 text-secondary-text" />
                </Button>
              )}
            </div>
            <div className="flex items-center text-primary-text h-6 w-fit px-2 bg-gray-3 rounded-xs text-xs font-medium">
              {data.conditions.length} Conditions
            </div>
          </div>
        </div>

        <Handle
          type="source"
          position={Position.Bottom}
          className="invisible"
          id="bottom"
        />
      </div>
    </>
  );
}

export default ConditionNode;
