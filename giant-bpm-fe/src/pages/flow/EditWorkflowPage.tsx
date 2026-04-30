import { useParams, Link, useNavigate } from "react-router-dom";
import { Flow } from "@/components/react-flow";
import { sidebarCollapsedAtom } from "@/store";
import { useAtom } from "jotai";
import { useEffect, useMemo } from "react";
import {
  useWorkflow,
  useUpdateWorkflow,
  useUpdateWorkflowSerialPrefix,
  useBindFormToWorkflow,
} from "@/hooks/useWorkflow";
import { Button } from "@/components/ui/button";
import { BackIcon, EditIcon, ExportIcon } from "@/components/icons";
import { useModal } from "@/hooks/useModal";
import EditFlowModal from "@/components/modals/flow-metadata-modal";
import ExportWorkflowModal from "@/components/modals/export-workflow-modal";
import { useFlowBuilder } from "@/hooks/useFlowBuilder";
import { Tag, FlowDefinition, FormDefinition } from "@/types/domain";
import { FormStatus } from "@/types/form-builder";
import { WorkflowNodeKey, FormNodeType } from "@/types/flow";
import { useToast } from "@ui/toast";
import { useTranslation } from "react-i18next";
import FormBindingModal from "@/components/modals/form-binding-modal";
import {
  buildDefaultVisibilityRules,
  initialEdges,
  initialNodes,
} from "@/const/flow";

const createDefaultWorkflow = (): FlowDefinition => ({
  id: "create",
  revisionId: "",
  name: "New Flow",
  description: "",
  tags: [],
  version: 1,
  nodes: initialNodes,
  edges: initialEdges,
  publishStatus: FormStatus.Draft,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export const WorkflowDetailPage = () => {
  const { flowId } = useParams<{
    flowId: string;
  }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const isCreateMode = flowId === "create";

  const {
    workflow: fetchedWorkflow,
    isLoading,
    isError,
    refetch: refetchWorkflow,
  } = useWorkflow(flowId);
  const {
    nodes,
    edges,
    initializeFlow,
    updateNode,
    setSelectedNode,
    validateNodes,
  } = useFlowBuilder();
  const { mutate: updateWorkflow, isPending: isUpdating } = useUpdateWorkflow({
    onSuccess: () => {
      close();
      refetchWorkflow();
      toast({ variant: 'success', title: "Workflow updated." });
    },
  });
  const { mutate: updateSerialPrefix } = useUpdateWorkflowSerialPrefix();
  const { open, isOpen, close } = useModal();
  const {
    open: openExport,
    isOpen: isExportOpen,
    close: closeExport,
  } = useModal();
  const {
    open: openBindingModal,
    isOpen: isBindingModalOpen,
    close: closeBindingModal,
  } = useModal();
  const { mutate: bindForm } = useBindFormToWorkflow({
    onSuccess(response) {
      updateNode("form-node", {
        form: response.data,
        componentRules: buildDefaultVisibilityRules(response.data?.schema),
      });
    },
  });

  const workflow = useMemo(
    () => (isCreateMode ? createDefaultWorkflow() : fetchedWorkflow),
    [isCreateMode, fetchedWorkflow],
  );

  const [, setSidebarCollapsed] = useAtom(sidebarCollapsedAtom);

  const handleUpdateMetadata = (data: {
    name: string;
    tags: Tag[];
    description: string;
  }) => {
    if (!flowId || isCreateMode || !workflow) return;
    const partialWorkflow: FlowDefinition = {
      ...workflow,
      name: data.name,
      description: data.description,
      tags: data.tags,
    };
    console.debug({ partialWorkflow });
    updateWorkflow({ id: flowId, workflow: partialWorkflow });
  };

  const handleSave = async () => {
    if (!flowId || !workflow || !workflow) return;

    const validation = await validateNodes();

    if (!validation.isSuccess) {
      toast({
        variant: "destructive",
        description: validation.error,
      });
    } else {
      const formNode = nodes.find(
        (node) => node.type === WorkflowNodeKey.Form,
      ) as FormNodeType | undefined;
      const updatedWorkflowData: FlowDefinition = {
        ...workflow,
        nodes: nodes,
        edges: edges,
      };

      updateWorkflow({ id: flowId, workflow: updatedWorkflowData });

      const newSerialPrefix = formNode?.data.serialPrefix;
      if (newSerialPrefix && newSerialPrefix !== workflow.serialPrefix) {
        updateSerialPrefix({ id: flowId, serialPrefix: newSerialPrefix });
      }
    }
  };

  const handleBinding = (form: FormDefinition) => {
    if (!workflow?.id) return;
    bindForm({ formId: form.id, flowId: workflow.id });
  };
  useEffect(() => {
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  useEffect(() => {
    if (!workflow) return;

    if (workflow.nodes.length) {
      const formNode = workflow.nodes.find(
        (node) => node.type === WorkflowNodeKey.Form,
      );
      if (!formNode?.data.form) {
        openBindingModal();
      }
    } else if (workflow?.nodes.length === 0) {
      openBindingModal();
    }
  }, [workflow?.id]);

  useEffect(() => {
    if (workflow) {
      if (workflow.nodes.length === 0) {
        console.debug("initialize was called");
        initializeFlow(initialNodes, initialEdges);
        setSelectedNode(initialNodes[0].id);
      } else {
        initializeFlow(workflow.nodes, workflow.edges);
        setSelectedNode(workflow.nodes[0].id);
      }
    }
  }, [workflow, initializeFlow]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (isError || !workflow) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900">
              Workflow Not Found
            </h1>
            <p className="mt-2 text-gray-600">
              The requested workflow could not be found.
            </p>
            <Link
              to="/workflow"
              className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Back to Workflows
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <EditFlowModal
        isOpen={isOpen}
        close={close}
        initialData={{
          name: workflow.name,
          description: workflow.description,
          tags: workflow.tags,
        }}
        onSubmit={handleUpdateMetadata}
      />
      <ExportWorkflowModal
        isOpen={isExportOpen}
        close={closeExport}
        workflowId={workflow.id}
        workflowName={workflow.name}
      />
      <FormBindingModal
        isOpen={isBindingModalOpen}
        onClose={closeBindingModal}
        onConfirm={(form) => handleBinding(form)}
      />
      {/* Header */}
      <div className="border-b border-gray-200 flex-shrink-0 h-15 px-5 bg-white">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center space-x-3">
            <Button
              variant={"tertiary"}
              className="p-2 ring-stroke"
              onClick={() => navigate("/workflow")}
            >
              <BackIcon />
            </Button>
            <div className="flex items-center space-x-2">
              <h1 className="text-lg font-semibold text-gray-900">
                {workflow.name}
              </h1>
              {!isCreateMode && (
                <button
                  className="p-1 hover:bg-gray-2 rounded transition-colors"
                  onClick={open}
                >
                  <EditIcon className="w-6 h-6 text-gray-500" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {!isCreateMode && (
              <Button
                variant="secondary"
                icon={<ExportIcon className="w-4 h-4" />}
                className="text-gray-700 hover:bg-gray-50"
                onClick={openExport}
              >
                {t("buttons.export")}
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isUpdating}
              loading={isUpdating}
            >
              {t("buttons.save")}
            </Button>
          </div>
        </div>
      </div>

      {/* Flow Editor */}
      <div className="flex-1">
        <Flow />
      </div>
    </div>
  );
};
