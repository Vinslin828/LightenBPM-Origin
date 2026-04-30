import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@/utils/cn";
import { ExternalLinkIcon } from "lucide-react";
import { FormNodeType } from "@/types/flow";
import NodeToolMenu from "../../node-tool";
import { StartIcon } from "@/components/icons";
import { useFlowSelection } from "@/hooks/useFlowBuilder";

function FormNode({ id, data, selected = false }: NodeProps<FormNodeType>) {
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
          showUpButton={false}
        />
        <Handle
          type="target"
          position={Position.Top}
          className="invisible"
          id="top"
        />
        <div className="w-[280px] min-h-[84px] bg-white rounded-md overflow-clip flex-row flex">
          <div className="flex flex-col gap-2.5 px-4 py-3 justify-between">
            <div className="flex flex-row gap-2 text-primary-text text-xs font-medium">
              <StartIcon className="w-4 h-4 " /> <div>Start Point</div>
            </div>
            {data.form?.id && data.form?.name ? (
              <div className="text-sm font-medium text-giant-blue leading-5 break-words cursor-pointer">
                <span
                  onClick={() => {
                    window.open(`/forms/${data.form?.id}`);
                  }}
                >
                  {data.form.name}
                  <ExternalLinkIcon className="inline-block w-4 h-4 align-text-bottom ml-1" />
                </span>
              </div>
            ) : (
              <div className="bg-blue-light-5 text-giant-blue rounded-xs text-xs font-medium h-6 px-2 flex items-center justify-center">
                Click to configure
              </div>
            )}
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

export default FormNode;
