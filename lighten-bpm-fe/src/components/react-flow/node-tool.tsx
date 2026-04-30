import { PlusIcon } from "../icons";
import { useEffect, useState } from "react";
import { NodeToolbar, NodeToolbarProps, Position } from "@xyflow/react";
import NodesMenu from "./nodes/nodes-menu";
import { WorkflowNode } from "@/types/flow";
import { useFlowBuilderActions } from "@/hooks/useFlowBuilder";

export default function NodeToolMenu({
  toolbarProps,
  node,
  isVisible,
  showUpButton = true,
  showDownButton = true,
}: {
  toolbarProps: Omit<NodeToolbarProps, "position">;
  node: { id: string };
  isVisible: boolean;
  showUpButton?: boolean;
  showDownButton?: boolean;
}) {
  const [isToggleTop, setToggleTop] = useState(false);
  const [isToggleDown, setToggleDown] = useState(false);

  const { insertNodeAfter, insertNodeBefore, setSelectedNode } =
    useFlowBuilderActions();

  const handleAddNodeDown = async (nodeType: WorkflowNode["type"]) => {
    const newNode = await insertNodeAfter(nodeType, node.id);
    console.debug("add down", newNode);
    if (newNode) {
      // setSelectedNode(newNode.id);
    }
    setToggleDown(false);
    setToggleTop(false);
  };

  const handleAddNodeUP = async (nodeType: WorkflowNode["type"]) => {
    const newNode = await insertNodeBefore(nodeType, node.id);
    console.debug("add up", newNode);
    if (newNode) {
      setSelectedNode(newNode.id);
    }

    setToggleDown(false);
    setToggleTop(false);
  };

  useEffect(() => {
    if (!isVisible) {
      setToggleDown(false);
      setToggleTop(false);
    }
  }, [isVisible]);

  return (
    <>
      {showUpButton && (
        <NodeToolbar
          position={Position.Top}
          {...toolbarProps}
          offset={20}
          isVisible={isVisible}
        >
          {isToggleTop ? (
            <NodesMenu onAddNode={handleAddNodeUP} />
          ) : (
            <button
              className="hover:bg-lighten-blue rounded-full w-6 h-6 flex items-center justify-center border-lighten-blue border-2 bg-white hover:text-white text-lighten-blue"
              onClick={() => {
                setToggleTop(true);
                setToggleDown(false);
              }}
            >
              <PlusIcon />
            </button>
          )}
        </NodeToolbar>
      )}
      {showDownButton && (
        <NodeToolbar
          position={Position.Bottom}
          {...toolbarProps}
          offset={20}
          isVisible={isVisible}
        >
          {isToggleDown ? (
            <NodesMenu onAddNode={handleAddNodeDown} />
          ) : (
            <button
              className="hover:bg-lighten-blue rounded-full w-6 h-6 flex items-center justify-center border-lighten-blue border-2 bg-white hover:text-white text-lighten-blue"
              onClick={() => {
                setToggleDown(true);
                setToggleTop(false);
              }}
            >
              <PlusIcon />
            </button>
          )}
        </NodeToolbar>
      )}
    </>
  );
}
