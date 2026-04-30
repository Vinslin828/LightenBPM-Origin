import {
  useQuery,
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import { container } from "../container";
import { IWorkflowService } from "../interfaces/services";
import { TYPES } from "../types/symbols";
import {
  ApiResponse,
  ExportPayload,
  FlowDefinition,
  FormDefinition,
  ImportCheckResponse,
  WorkflowListOptions,
} from "@/types/domain";

const useWorkflowsService = () =>
  container.get<IWorkflowService>(TYPES.WorkflowService);

const workflowsQueryKey = ["workflows"] as const;
const workflowListQueryKey = (options?: WorkflowListOptions) => [
  ...workflowsQueryKey,
  options ?? {},
];
const workflowQueryKey = (workflowId?: string) => ["workflow", workflowId];

export const useWorkflows = (options?: WorkflowListOptions) => {
  const workflowService = useWorkflowsService();
  const {
    data: response,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: workflowListQueryKey(options),
    queryFn: () => workflowService.getWorkflows(options),
  });

  return {
    data: response?.data,
    workflows: response?.data?.items ?? [],
    isLoading,
    isFetching,
    error,
    refetch,
  };
};

export const useWorkflow = (workflowId?: string) => {
  const workflowService = useWorkflowsService();
  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: workflowQueryKey(workflowId),
    queryFn: async () => {
      if (!workflowId) return null;
      return workflowService.getWorkflow(workflowId);
    },
    staleTime: Infinity,
    enabled: !!workflowId,
  });

  return {
    workflow: response?.data,
    isLoading,
    isError,
    error,
    refetch,
  };
};

export const useCreateWorkflow = () => {
  const queryClient = useQueryClient();
  const workflowService = useWorkflowsService();

  return useMutation({
    mutationFn: (
      workflow: Omit<FlowDefinition, "id" | "createdAt" | "updatedAt">,
    ) => workflowService.createWorkflow(workflow),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowsQueryKey });
    },
  });
};

export const useUpdateWorkflow = (
  options?: UseMutationOptions<
    ApiResponse<FlowDefinition>,
    Error,
    {
      id: string;
      workflow: Partial<FlowDefinition>;
    },
    unknown
  >,
) => {
  const queryClient = useQueryClient();
  const workflowService = useWorkflowsService();

  return useMutation({
    mutationFn: ({
      id,
      workflow,
    }: {
      id: string;
      workflow: Partial<FlowDefinition>;
    }) => workflowService.updateWorkflow(id, workflow),
    onSuccess: async (response, variable, context) => {
      options?.onSuccess?.(response, variable, context);

      if (response.success && response.data) {
        // Invalidate the list query
        queryClient.invalidateQueries({ queryKey: workflowsQueryKey });
      }
    },
  });
};

export const useUpdateWorkflowSerialPrefix = (
  options?: UseMutationOptions<
    ApiResponse<FlowDefinition>,
    Error,
    { id: string; serialPrefix: string },
    unknown
  >,
) => {
  const queryClient = useQueryClient();
  const workflowService = useWorkflowsService();

  return useMutation({
    mutationFn: ({ id, serialPrefix }: { id: string; serialPrefix: string }) =>
      workflowService.updateWorkflowSerialPrefix(id, serialPrefix),
    onSuccess: (response, variables, context) => {
      options?.onSuccess?.(response, variables, context);
      if (response.success && response.data) {
        queryClient.invalidateQueries({ queryKey: workflowsQueryKey });
        queryClient.invalidateQueries({
          queryKey: workflowQueryKey(variables.id),
        });
      }
    },
  });
};

export const useDeleteWorkflow = (
  options?: UseMutationOptions<ApiResponse<void>, Error, string, unknown>,
) => {
  const queryClient = useQueryClient();
  const workflowService = useWorkflowsService();
  return useMutation({
    mutationFn: (id: string) => workflowService.deleteWorkflow(id),
    onSuccess(data, variables, context) {
      options?.onSuccess?.(data, variables, context);
      queryClient.refetchQueries({ queryKey: workflowsQueryKey });
      queryClient.invalidateQueries({ queryKey: workflowQueryKey(variables) });
    },
  });
};

export const useExportWorkflow = () => {
  const workflowService = useWorkflowsService();
  return useMutation({
    mutationFn: (id: string) => workflowService.exportWorkflow(id),
  });
};

export const useImportWorkflowCheck = () => {
  const workflowService = useWorkflowsService();
  return useMutation({
    mutationFn: (payload: ExportPayload) =>
      workflowService.importWorkflowCheck(payload),
  });
};

export const useImportWorkflowExecute = () => {
  const queryClient = useQueryClient();
  const workflowService = useWorkflowsService();
  return useMutation({
    mutationFn: (checkResult: ImportCheckResponse) =>
      workflowService.importWorkflowExecute(checkResult),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: workflowsQueryKey });
      if (response.success && response.data?.public_id) {
        queryClient.invalidateQueries({
          queryKey: workflowQueryKey(response.data.public_id),
        });
      }
    },
  });
};

type bindingFormOptions = UseMutationOptions<
  ApiResponse<FormDefinition>,
  Error,
  {
    formId: string;
    flowId: string;
  },
  unknown
>;
export const useBindFormToWorkflow = (options?: bindingFormOptions) => {
  const queryClient = useQueryClient();
  const workflowService = useWorkflowsService();

  return useMutation({
    mutationFn: ({ formId, flowId }: { formId: string; flowId: string }) =>
      workflowService.bindFormToWorkflow(formId, flowId),
    onSuccess: (response, variables, context) => {
      if (response.success && response.data) {
        options?.onSuccess?.(response, variables, context);
        queryClient.invalidateQueries({ queryKey: workflowsQueryKey });
        queryClient.invalidateQueries({
          queryKey: workflowQueryKey(variables.flowId),
        });
      }
    },
  });
};
