import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Pagination from "@/components/ui/pagination";
import { useWorkflows, useDeleteWorkflow } from "@/hooks/useWorkflow";
import {
  useUpdateWorkflowPermissions,
  useWorkflowListPermissions,
} from "@/hooks/usePermissions";
import { FlowDefinition, WorkflowListOptions } from "@/types/domain";
import Menu from "@ui/menu";
import { IconDots } from "@tabler/icons-react";
import { useToast } from "@ui/toast";
import DeleteModal from "../modals/delete-modal";
import { useModal } from "@/hooks/useModal";
import { Permission, PermissionScope } from "@/types/permission";
import PermissionButton from "@ui/button/permission-button";
import PermissionMenu from "@ui/permission-menu";
import PermissionModal from "@/components/modals/permission-modal";

type WorkflowListProps = {
  options: WorkflowListOptions;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
};

export function WorkflowList({
  options,
  onPageChange,
  className,
}: WorkflowListProps) {
  const memoizedOptions = useMemo(() => options, [options]);
  const {
    data: workflowListData,
    workflows,
    isLoading,
    refetch,
  } = useWorkflows(memoizedOptions);
  console.debug({ workflows });
  const workflowIds = useMemo(
    () => workflows.map((workflow) => workflow.id),
    [workflows],
  );
  const { permissionsByWorkflowId } = useWorkflowListPermissions(workflowIds);
  const { toast } = useToast();
  const { mutate: deleteWorkflow } = useDeleteWorkflow({
    onSuccess() {
      refetch();
      toast({
        variant: "success",
        description: "Delete workflow successfully.",
      });
    },
  });

  console.debug({ permissionsByWorkflowId });

  const showInitialLoading = isLoading && !workflowListData;
  const isEmpty = !workflows.length && !showInitialLoading;

  if (showInitialLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      {workflows.map((workflow) => (
        <WorkflowCard
          workflow={workflow}
          key={workflow.id}
          onDelete={() => deleteWorkflow(workflow.id)}
          permission={
            permissionsByWorkflowId[workflow.id] ?? {
              scope: "ADMIN",
              permissions: { user: [], role: [], org: [] },
            }
          }
        />
      ))}

      {isEmpty && (
        <div className="flex h-full flex-col items-center justify-center rounded-lg border border-[#DFE4EA] bg-white p-16 text-center flex-1">
          <span className="mt-4 text-lg font-semibold text-primary-text">
            No workflows found
          </span>
          <p className="mt-1 text-sm text-secondary-text font-regular">
            Try adjust your search criteria
          </p>
        </div>
      )}
      {workflowListData && (
        <Pagination
          totalPages={workflowListData.totalPages}
          page={workflowListData.page}
          pageSize={workflowListData.limit}
          onPageChange={onPageChange}
          pageSizeOptions={[10, 20, 50]}
          className="mt-4"
        />
      )}
    </div>
  );
}

type WorkflowCardProps = {
  workflow: FlowDefinition;
  onDelete: () => void;
  permission: Permission;
};

function WorkflowCard({ workflow, onDelete, permission }: WorkflowCardProps) {
  const navigate = useNavigate();

  const deleteModal = useModal();
  const permissionModal = useModal();
  const { mutate: updatePermission } = useUpdateWorkflowPermissions();

  return (
    <>
      <PermissionModal
        {...permissionModal}
        permission={permission}
        onSave={(permission) => {
          updatePermission({ workflowId: workflow.id, permission });
        }}
      />
      <DeleteModal
        {...deleteModal}
        message="Are you sure you want to delete this workflow?"
        onDelete={() => onDelete()}
      />
      <div
        key={workflow.id}
        className="bg-white border border-[#DFE4EA] rounded-lg p-5"
        onClick={() => navigate(`/workflow/${workflow.id}`)}
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div>
              <h3 className="text-lg font-semibold text-[#111928] mb-4">
                {workflow.name}
              </h3>
              <p className="text-base text-[#111928]">{workflow.description}</p>
            </div>
          </div>
          <div className="flex flex-row items-center gap-6">
            <PermissionMenu
              permission={permission}
              workflowId={workflow.id}
              onSave={(permission) => {
                if (permission.scope === PermissionScope.INVITED) {
                  permissionModal.open();
                } else {
                  updatePermission({
                    workflowId: workflow.id,
                    permission: permission,
                  });
                }
              }}
            />
            <Menu
              items={[
                {
                  label: (
                    <div className="text-red text-sm font-medium my-1">
                      Discard
                    </div>
                  ),
                  onClick: () => deleteModal.open(),
                },
              ]}
              trigger={
                <div className="p-2">
                  <IconDots className="text-secondary-text cursor-pointer h-5 w-5" />
                </div>
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
