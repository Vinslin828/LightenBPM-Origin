import { SubflowNodeData, WorkflowNodeKey } from "@/types/flow";
import { cn } from "@/utils/cn";
import { Card } from "@ui/card";
import { SingleSelect } from "@ui/select/single-select";
import { Settings, Workflow } from "lucide-react";
import { useMemo, useState } from "react";
import AttributePanelHeader from "../../attribute-panel-header";
import { SubflowIcon } from "@/components/icons";
import { useFlowBuilder } from "@/hooks/useFlowBuilder";

type Props = {
  nodeId: string;
  initialData?: SubflowNodeData;
};
export default function SubflowAttribute({ nodeId }: Props) {
  const { getNodeById, updateNode } = useFlowBuilder();
  const node = getNodeById(nodeId);
  const data = node?.data as SubflowNodeData | undefined;

  console.debug({ node, data });

  const handleSelectWorkflow = (workflowId: string) => {
    const selectedOption = workflowOptions.find(
      (workflow) => workflow.value === workflowId,
    );
    console.debug({ selectedOption });

    updateNode(nodeId, (currentNode) => {
      // TODO:

      return {
        ...currentNode.data,
        workflowId,
        workflow: {
          // TODO:
          name: selectedOption?.label ?? "",
          id: workflowId,
        },
      };
    });
  };

  // Mock workflow options - in real app, this would come from API
  const workflowOptions = [
    { label: "Employee Onboarding", value: "1", key: "1" },
    { label: "Purchase Request", value: "2", key: "2" },
    { label: "Expense Approval", value: "3", key: "3" },
    { label: "IT Equipment Request", value: "4", key: "4" },
    { label: "Leave Request", value: "5", key: "5" },
  ];
  return (
    <div className="flex flex-col h-full">
      <AttributePanelHeader
        icon={<SubflowIcon className="text-purple" />}
        componentType={WorkflowNodeKey.Subflow}
        className="bg-purple/10 border-purple"
      />
      <div className="p-5 bg-gray-2">
        <div className="pb-2.5 text-dark text-base font-medium">
          Linked flow
        </div>
        <SingleSelect
          value={data?.workflowId ?? undefined}
          options={workflowOptions}
          placeholder="Select a subflow"
          onChange={handleSelectWorkflow}
        />
      </div>
    </div>
  );
}
