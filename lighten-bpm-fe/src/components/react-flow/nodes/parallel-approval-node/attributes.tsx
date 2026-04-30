import {
  FormNodeType,
  ParallelApprovalNodeData,
  WorkflowNodeKey,
} from "@/types/flow";
import AttributePanelHeader from "../../attribute-panel-header";
import { SupervisorIcon } from "@/components/icons";
import AndOrButton from "@ui/button/and-or-button";
import { useFlowBuilder } from "@/hooks/useFlowBuilder";
import { Input } from "@ui/input";
import { SharedApprovalAttributes } from "../approval-node/approval-attributes";

type Props = {
  id: string;
};

export default function ParalellApprovalAttribute({ id }: Props) {
  const { getNodeById, updateNode, nodes } = useFlowBuilder();
  const node = getNodeById(id);
  const data = node?.data as ParallelApprovalNodeData | undefined;
  const formNode = nodes.find(
    (workflowNode) => workflowNode.type === WorkflowNodeKey.Form,
  ) as FormNodeType | undefined;

  if (typeof data?.selectedApprovalIndex === "number") {
    // render single panel
    return (
      <SharedApprovalAttributes
        data={data.approvals[data.selectedApprovalIndex]}
        formData={formNode?.data.form}
        controlId={`${id}-${data.selectedApprovalIndex}`}
        onChange={(newData) => {
          const newApprovals = data.approvals.map((approval, index) =>
            index === data.selectedApprovalIndex
              ? { ...approval, ...newData }
              : approval,
          );
          updateNode(id, {
            approvals: newApprovals,
          });
        }}
      />
    );
  } else {
    // render parallel panel
    return (
      <div className="flex flex-col h-full bg-gray-2">
        {/* Header */}
        <AttributePanelHeader
          icon={<SupervisorIcon className="text-yellow" />}
          componentType={WorkflowNodeKey.ParallelApproval}
        />
        <div className="bg-gray-2 p-5">
          <div>Description</div>
          <Input
            value={data?.description}
            placeholder="eg. Financial check"
            onChange={(e) => {
              updateNode(id, {
                description: e.target.value,
              });
            }}
          />
        </div>
        <div className="flex flex-col bg-gray-2 p-5">
          <span className="pb-3 text-dark text-base font-medium">
            Approval logic
          </span>

          <AndOrButton
            value={data?.logic ?? "and"}
            onChange={(value) => {
              updateNode(id, { logic: value });
            }}
          />
        </div>
      </div>
    );
  }
}
