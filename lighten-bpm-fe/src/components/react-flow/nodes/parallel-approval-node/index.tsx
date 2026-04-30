import { Handle, Position, NodeProps } from "@xyflow/react";
import { cn } from "@/utils/cn";
import {
  ApprovalNodeType,
  ParallelApprovalNodeType,
  WorkflowNodeKey,
} from "@/types/flow";
import NodeToolMenu from "../../node-tool";
import {
  useFlowBuilderActions,
  useFlowSelection,
} from "@/hooks/useFlowBuilder";
import { Button } from "@ui/button";
import { SupervisorIcon, TrashIcon } from "@/components/icons";
import { useTranslation } from "react-i18next";
import { createDefaultWorkflowNode } from "@/const/flow";
import { ApprovalCard } from "../approval-node/approval-card";

function ParallelApprovalNode({
  id,
  data,
  selected = false,
}: NodeProps<ParallelApprovalNodeType>) {
  const {
    smartRemoveNode: removeNode,
    updateNode,
    setSelectedNode,
  } = useFlowBuilderActions();
  const { selectedNodeId } = useFlowSelection();
  const isSelected = selected || selectedNodeId === id;
  const { t } = useTranslation();

  const setSelectedApproval = (index: number | null) => {
    console.debug("here");
    updateNode(id, {
      ...data,
      selectedApprovalIndex: index,
    });
  };
  const addItem = () => {
    const _newApproval = createDefaultWorkflowNode(WorkflowNodeKey.Approval);
    updateNode(id, {
      ...data,
      approvals: [...data.approvals, _newApproval["data"]],
    });
  };
  const removeItem = (index: number) => {
    if (data.approvals.length <= 2) {
      return;
    }

    updateNode(id, {
      ...data,
      selectedApprovalIndex: null,
      approvals: data.approvals.filter((_, i) => i !== index),
    });
  };

  return (
    <>
      <div
        className={cn(
          "relative",
          isSelected &&
            data.selectedApprovalIndex === null &&
            "ring-2 ring-lighten-blue rounded-md",
        )}
        onClick={
          data.selectedApprovalIndex
            ? () => setSelectedApproval(null)
            : undefined
        }
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
        <div className="min-w-[280px] min-h-[82px] max-w-[900px] bg-white rounded-md shadow-sm">
          <div className="flex flex-col justify-between p-3 flex-1 gap-3">
            <div className="flex items-center gap-2 text-primary-text">
              <SupervisorIcon className="w-4 h-4" />
              <span className="text-[#4A607E] text-xs font-medium flex flex-row gap-1 items-center">
                Parallel Approval {data.logic && <div>({t(data.logic)})</div>}
              </span>
              <Button
                variant={"tertiary"}
                size={"sm"}
                onClick={(e) => {
                  e.stopPropagation();
                  addItem();
                }}
              >
                Add Approval
              </Button>
              {isSelected && data.selectedApprovalIndex === null && (
                <Button
                  variant={"icon"}
                  className="rounded-full bg-gray-2 p-1 absolute right-2.5 top-2.5 cursor-pointer"
                  onClick={() => removeNode(id)}
                >
                  <TrashIcon className="w-3.5 h-3.5 text-secondary-text" />
                </Button>
              )}
            </div>
            {data.description && (
              <div className="text-xs">{data.description}</div>
            )}
            <div className="flex flex-row gap-2.5 flex-wrap">
              {data?.approvals?.map((approval, index) => (
                <ApprovalItem
                  key={index}
                  data={approval}
                  selected={isSelected && index === data.selectedApprovalIndex}
                  onDelete={() => removeItem(index)}
                  onClick={() => {
                    setSelectedNode(id);
                    setSelectedApproval(
                      data.selectedApprovalIndex === index ? null : index,
                    );
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        <Handle type="source" position={Position.Bottom} id="bottom" />
      </div>
    </>
  );
}

export default ParallelApprovalNode;

type ApprovalItemProp = {
  data: ApprovalNodeType["data"];
  selected?: boolean;
  onClick?: () => void;
  onDelete?: () => void;
};
function ApprovalItem({ data, selected, ...props }: ApprovalItemProp) {
  return (
    <>
      <div
        className={cn(
          "relative ring-1 ring-stroke rounded-md",
          selected && "ring-2 ring-lighten-blue",
        )}
        onClick={(e) => {
          e.stopPropagation();
          props.onClick?.();
        }}
      >
        <ApprovalCard
          data={data}
          selected={selected}
          onRemove={() => props.onDelete?.()}
        />
      </div>
    </>
  );
}
