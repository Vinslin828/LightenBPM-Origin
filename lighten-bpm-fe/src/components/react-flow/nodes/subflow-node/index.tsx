import { Button } from "@ui/button";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@/utils/cn";
import { SubflowNodeType } from "@/types/flow";
import NodeToolMenu from "../../node-tool";
import {
  useFlowBuilderActions,
  useFlowSelection,
} from "@/hooks/useFlowBuilder";
import { SubflowIcon, TrashIcon } from "@/components/icons";

function SubflowNode({ id, data, selected = false }: NodeProps<SubflowNodeType>) {
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
        />
        <Handle
          type="target"
          position={Position.Top}
          className="invisible"
          id="top"
        />
        <div className="w-[280px] h-[82px] bg-white rounded-md shadow-sm overflow-hidden flex">
          <div className="h-full w-1 bg-purple flex-shrink-0" />
          <div className="flex flex-col justify-between p-3 flex-1">
            <div className="flex items-center gap-2">
              <SubflowIcon className="text-primary-text w-4 h-4" />
              <span className="text-primary-text text-xs font-medium">
                Subflow
              </span>
              {isSelected && (
                <Button
                  variant={"icon"}
                  className="rounded-full bg-gray-2 p-1 absolute right-2.5 top-2.5 cursor-pointer"
                  onClick={() => removeNode(id)}
                >
                  <TrashIcon className="w-3.5 h-3.5 text-secondary-text" />
                </Button>
              )}
            </div>
            <div className="flex items-center justify-between">
              {data.workflow ? (
                data.workflow.name
              ) : (
                <div className="h-6 px-2 bg-blue-light-5 text-lighten-blue rounded-xs text-xs font-medium flex items-center justify-center">
                  Click to configure
                </div>
              )}
            </div>
          </div>
        </div>
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

export default SubflowNode;
