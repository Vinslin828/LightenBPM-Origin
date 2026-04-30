import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSetAtom } from "jotai";
import { useNavigate } from "react-router-dom";
import {
  userAtom,
  formDataAtom,
  selectedMenuAtom,
  nodesAtom,
  edgesAtom,
  selectedNodeIdAtom,
  expandedGroupsAtom,
} from "@/store/atoms";

export const LogoutCallbackPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Get Jotai atom setters
  const setUser = useSetAtom(userAtom);
  const setFormData = useSetAtom(formDataAtom);
  const setSelectedMenu = useSetAtom(selectedMenuAtom);
  const setNodes = useSetAtom(nodesAtom);
  const setEdges = useSetAtom(edgesAtom);
  const setSelectedNodeId = useSetAtom(selectedNodeIdAtom);
  const setExpandedGroups = useSetAtom(expandedGroupsAtom);

  useEffect(() => {
    // 1. Clear React Query cache
    queryClient.clear();

    // 2. Clear Jotai atoms
    setUser(null);
    setFormData(null);
    setSelectedMenu("home");
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setExpandedGroups(new Set<string>());

    // 3. Redirect to the login page
    navigate("/login");
  }, [queryClient, navigate, setEdges, setExpandedGroups, setFormData, setNodes, setSelectedMenu, setSelectedNodeId, setUser]);

  return (
    <div className="flex h-screen w-screen items-center justify-center">
      <div>Logging out...</div>
    </div>
  );
};
