import {
  ConditionBranch,
  ConditionNodeData,
  WorkflowNodeKey,
} from "@/types/flow";
import { useState } from "react";
import AttributePanelHeader from "../../attribute-panel-header";
import { ConditionIcon } from "@/components/icons";
import Accordion from "@/components/ui/accordion";
import Condition from "./conditions";

type Props = {
  initialData?: ConditionNodeData;
  nodeId: string;
};

// const mockConditioBranchData: ConditionBranch = {
//   name: "High-Value Orders",
//   next: "node-id-for-approval",
//   branch: {
//     logic: "AND",
//     left: {
//       field: "amount",
//       operator: ">",
//       value: 1000,
//     },
//     right: {
//       logic: "OR",
//       left: {
//         field: "category",
//         operator: "==",
//         value: "Electronics",
//       },
//       right: {
//         field: "category",
//         operator: "==",
//         value: "Software",
//       },
//     },
//   },
// };

export default function ConditionAttribute({ initialData, nodeId }: Props) {
  const [branches, setBranches] = useState<ConditionBranch[]>(
    initialData?.conditions ?? [],
  );

  return (
    <div className="flex flex-col h-full bg-white">
      <AttributePanelHeader
        icon={<ConditionIcon className="text-secondary" />}
        className="bg-secondary/10 border-secondary"
        componentType={WorkflowNodeKey.Condition}
      />
      <Accordion
        key={WorkflowNodeKey.Condition}
        items={[
          {
            key: "conditions",
            name: "Conditions",
            content: (
              <div className="bg-gray-2">
                <Condition
                  // initialData={[mockConditioBranchData, mockConditioBranchData]}
                  nodeId={nodeId}
                  // branches={branches}
                  // onBranchesChange={setBranches}
                />

                {/* Fallback Condition */}
                <div className="bg-white border border-[#DFE4EA] rounded-md p-4 mt-4">
                  <h3 className="text-base font-medium text-[#111928] mb-2">
                    Fallback condition
                  </h3>
                  <p className="text-sm text-[#8899A8]">
                    This condition handles all cases that do not match the
                    previous conditions.
                  </p>
                </div>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
