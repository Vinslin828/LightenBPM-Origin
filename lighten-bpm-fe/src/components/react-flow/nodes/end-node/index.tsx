import { Handle, Position, NodeProps, NodeToolbar } from "@xyflow/react";

import { FlagIcon } from "@/components/icons";
import { EndNodeType } from "@/types/flow";
import NodeToolMenu from "../../node-tool";
import { useFlowSelection } from "@/hooks/useFlowBuilder";

const EndNode = ({ id, selected = false }: NodeProps<EndNodeType>) => {
  const { selectedNodeId } = useFlowSelection();
  const isSelected = selected || selectedNodeId === id;
  return (
    <div className="w-[280px] flex justify-center">
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
      <div className="bg-white box-border border border-[#dfe4ea] border-solid flex flex-row gap-3 items-center justify-start px-5 py-3 relative rounded-md w-32 h-14">
        <div className="relative shrink-0 size-4">
          <FlagIcon className="block max-w-none size-full text-[#4a607e]" />
        </div>
        <div className="font-medium leading-[0] not-italic relative shrink-0 text-[#4a607e] text-[12px] text-left text-nowrap">
          <p className="block leading-[24px] whitespace-pre">End Point</p>
        </div>
      </div>
    </div>
  );
};

export default EndNode;
