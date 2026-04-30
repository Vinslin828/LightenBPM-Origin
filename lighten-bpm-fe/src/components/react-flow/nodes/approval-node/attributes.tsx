import { ApprovalNodeType, FormNodeType, WorkflowNodeKey } from "@/types/flow";
import { SharedApprovalAttributes } from "./approval-attributes";
import { useFlowBuilder } from "@/hooks/useFlowBuilder";

type Props = {
  nodeId: string;
};

export default function ApprovalAttributes({ nodeId }: Props) {
  const { updateNode, getNodeById, nodes } = useFlowBuilder();
  const node = getNodeById(nodeId);
  const data = node?.data as ApprovalNodeType["data"] | undefined;
  const formNode = nodes.find(
    (workflowNode) => workflowNode.type === WorkflowNodeKey.Form,
  ) as FormNodeType | undefined;

  if (!data) return null;

  return (
    <SharedApprovalAttributes
      data={data}
      controlId={nodeId}
      formData={formNode?.data.form}
      onChange={(newData) =>
        updateNode(nodeId, (currentNode) => ({
          ...currentNode.data,
          ...newData,
        }))
      }
    />
  );
}
