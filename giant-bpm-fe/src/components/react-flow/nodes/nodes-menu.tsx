import { WorkflowNode, WorkflowNodeKey } from "@/types/flow";
import { cn } from "@/utils/cn";

const nodeOptions = [
  {
    type: WorkflowNodeKey.Approval,
    label: "Approval",
    description: "Add approval step",
    color: "bg-amber-500",
  },
  {
    type: WorkflowNodeKey.ParallelApproval,
    label: "Parallel Approval",
    description: "Add parallel approval",
    color: "bg-amber-500",
  },
  {
    type: WorkflowNodeKey.Condition,
    label: "Condition",
    description: "Add conditional branch",
    color: "bg-secondary",
  },
  {
    type: WorkflowNodeKey.Subflow,
    label: "Subflow",
    description: "Add subworkflow",
    color: "bg-purple",
  },
];

interface NodesMenuProps {
  onAddNode: (nodeType: WorkflowNode["type"]) => void;
}

export default function NodesMenu({ onAddNode }: NodesMenuProps) {
  function renderMenuItem(item: (typeof nodeOptions)[number]) {
    return (
      <button
        key={item.type}
        className="flex h-11 w-40 flex-row items-center overflow-clip rounded-md bg-white shadow-lg transition-all duration-150 active:scale-95"
        onClick={(e) => {
          e.stopPropagation();
          onAddNode(item.type);
        }}
        title={item.description}
      >
        <div className={cn("h-full w-1", item.color)} />
        <div className="px-2 text-sm font-medium leading-snug text-gray-800">
          {item.label}
        </div>
      </button>
    );
  }
  return (
    <div className="flex flex-row gap-3">
      {nodeOptions.map((node) => renderMenuItem(node))}
    </div>
  );
}
