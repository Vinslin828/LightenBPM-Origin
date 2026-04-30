import { nodeTypes } from "@/const/flow";
import {
  ApprovalNodeType,
  ConditionBranch,
  WorkflowNodeKey,
} from "@/types/flow";
import { Panel, useReactFlow } from "@xyflow/react";
import ApprovalAttributes from "./nodes/approval-node/attributes";
import ConditionAttribute from "./nodes/condition-node/attributes";
import { SetStateAction } from "react";
import ParalellApprovalAttribute from "./nodes/parallel-approval-node/attributes";
import FormAttribute from "./nodes/form-node/attributes";
import SubflowAttribute from "./nodes/subflow-node/attributes";
import { useFlowBuilder } from "@/hooks/useFlowBuilder";
import PermissionPanel from "./permission-panel";

export default function AttribtuesPanel() {
  const { selectedNode } = useFlowBuilder();

  const re = useReactFlow();

  re;

  function renderPanel() {
    switch (selectedNode?.type) {
      case WorkflowNodeKey.Approval:
        return <ApprovalAttributes nodeId={selectedNode.id} />;
      case WorkflowNodeKey.Form:
        return <FormAttribute nodeId={selectedNode.id} />;
      case WorkflowNodeKey.Condition:
        return (
          <ConditionAttribute
            initialData={selectedNode.data}
            nodeId={selectedNode.id}
          />
        );
      case WorkflowNodeKey.ParallelApproval:
        return <ParalellApprovalAttribute id={selectedNode.id} />;
      case WorkflowNodeKey.Subflow:
        return <SubflowAttribute nodeId={selectedNode.id} />;
      default:
        return <PermissionPanel />;
    }
  }

  // if (
  //   !selectedNode ||
  //   selectedNode.type === WorkflowNodeKey.End ||
  //   selectedNode.type === WorkflowNodeKey.Placeholder
  // ) {
  //   return <div> test</div>;
  // }
  return (
    <Panel
      position="top-right"
      className="h-full bg-white m-0 max-w-sm w-[360px] max-h-full overflow-y-auto"
    >
      {renderPanel()}
    </Panel>
  );
}
