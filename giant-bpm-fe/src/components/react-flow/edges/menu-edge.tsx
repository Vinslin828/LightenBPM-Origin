import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/button";
import NodesMenu from "../nodes/nodes-menu";
import { WorkflowNode } from "@/types/flow";
import { useFlowBuilderActions } from "@/hooks/useFlowBuilder";

export const MenuEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { insertNodeOnEdge } = useFlowBuilderActions();

  const handleAddClick = () => {
    setShowMenu(!showMenu);
  };

  const handleNodeTypeSelect = (nodeType: WorkflowNode["type"]) => {
    setShowMenu(false);
    if (id) {
      insertNodeOnEdge(nodeType, id);
    } else {
      console.error("ButtonEdge: No edge ID available");
    }
  };

  // Close menu when pressing Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && showMenu) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [showMenu]);

  return (
    <>
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={style}
        interactionWidth={20}
      />
      <EdgeLabelRenderer>
        <div
          className={cn(
            "nodrag nopan absolute group",
            "-translate-x-1/2 -translate-y-1/2",
          )}
          style={{
            left: labelX,
            top: labelY,
          }}
        >
          {/* Invisible hover area - larger than the button */}
          <div className="absolute inset-0 w-16 h-16 -translate-x-1/2 -translate-y-1/2 pointer-events-auto" />

          {/* Add Button that shows on hover */}
          <Button
            onClick={handleAddClick}
            variant={"tertiary"}
            size="sm"
            className={cn(
              "w-8 h-8 pointer-events-auto relative z-10",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
              showMenu && "opacity-100",
            )}
          >
            +
          </Button>

          {showMenu &&
            createPortal(
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-transparent bg-opacity-25"
                onClick={() => setShowMenu(false)}
                ref={menuRef}
              >
                <NodesMenu onAddNode={handleNodeTypeSelect} />
              </div>,
              document.body,
            )}

          {/* {showMenu && (
            <ViewportPortal>
              <NodesMenu onAddNode={handleNodeTypeSelect} />
            </ViewportPortal>
          )} */}
        </div>
      </EdgeLabelRenderer>
    </>
  );
};
