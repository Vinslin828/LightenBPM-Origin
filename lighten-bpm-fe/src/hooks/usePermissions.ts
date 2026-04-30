import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { container } from "@/container";
import { TYPES } from "@/types/symbols";
import { IPermissionService } from "@/interfaces/services";
import {
  ApplicationShare,
  ApplicationShareDeleteQuery,
  ApplicationShareInput,
  Permission,
  PermissionScope,
} from "@/types/permission";
import {
  BackendFormPermissionDeleteQuery,
  BackendWorkflowPermissionDeleteQuery,
} from "@/schemas/permission/response";

const usePermissionService = () =>
  container.get<IPermissionService>(TYPES.PermissionService);

const workflowPermissionsQueryKey = (workflowId?: string) => [
  "workflow-permissions",
  workflowId,
];
const formPermissionsQueryKey = (formId?: string) => [
  "form-permissions",
  formId,
];
const applicationSharesQueryKey = (serialNumber?: string) => [
  "application-shares",
  serialNumber,
];

export const useWorkflowPermissions = (workflowId?: string) => {
  const permissionService = usePermissionService();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: workflowPermissionsQueryKey(workflowId),
    queryFn: () =>
      permissionService.getWorkflowPermissions(workflowId as string),
    enabled: !!workflowId,
  });

  return {
    permission: data?.data ?? {
      scope: PermissionScope.ADMIN,
      permissions: { user: [], role: [], org: [] },
    },
    isLoading,
    isError,
    error,
    refetch,
  };
};
export const useWorkflowListPermissions = (workflowIds: string[] = []) => {
  const permissionService = usePermissionService();
  const queries = useQueries({
    queries: workflowIds.map((workflowId) => ({
      queryKey: workflowPermissionsQueryKey(workflowId),
      queryFn: () => permissionService.getWorkflowPermissions(workflowId),
      enabled: !!workflowId,
    })),
  });

  const permissionsByWorkflowId = useMemo(() => {
    return workflowIds.reduce<Record<string, Permission>>(
      (acc, workflowId, index) => {
        const data = queries[index]?.data?.data ?? {
          scope: PermissionScope.ADMIN,
          permissions: { user: [], role: [], org: [] },
        };
        acc[workflowId] = data;
        return acc;
      },
      {},
    );
  }, [queries, workflowIds]);

  const isLoading = queries.some((query) => query.isLoading);
  const isError = queries.some((query) => query.isError);
  const errors = queries.map((query) => query.error).filter(Boolean);

  return {
    permissionsByWorkflowId,
    isLoading,
    isError,
    errors,
  };
};

export const useAddWorkflowPermissions = () => {
  const queryClient = useQueryClient();
  const permissionService = usePermissionService();

  return useMutation({
    mutationFn: ({
      workflowId,
      permission,
    }: {
      workflowId: string;
      permission: Permission;
    }) => permissionService.addWorkflowPermissions(workflowId, permission),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workflowPermissionsQueryKey(variables.workflowId),
      });
    },
  });
};

export const useUpdateWorkflowPermissions = () => {
  const queryClient = useQueryClient();
  const permissionService = usePermissionService();

  return useMutation({
    mutationFn: ({
      workflowId,
      permission,
    }: {
      workflowId: string;
      permission: Permission;
    }) => permissionService.updateWorkflowPermissions(workflowId, permission),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workflowPermissionsQueryKey(variables.workflowId),
      });
    },
  });
};

export const useDeleteWorkflowPermissions = () => {
  const queryClient = useQueryClient();
  const permissionService = usePermissionService();

  return useMutation({
    mutationFn: ({
      workflowId,
      query,
    }: {
      workflowId: string;
      query?: BackendWorkflowPermissionDeleteQuery;
    }) => permissionService.deleteWorkflowPermissions(workflowId, query),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workflowPermissionsQueryKey(variables.workflowId),
      });
    },
  });
};

export const useDeleteWorkflowPermission = () => {
  const queryClient = useQueryClient();
  const permissionService = usePermissionService();

  return useMutation({
    mutationFn: ({ id }: { workflowId: string; id: number }) =>
      permissionService.deleteWorkflowPermission(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: workflowPermissionsQueryKey(variables.workflowId),
      });
    },
  });
};

export const useFormPermissions = (formId?: string) => {
  const permissionService = usePermissionService();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: formPermissionsQueryKey(formId),
    queryFn: () => permissionService.getFormPermissions(formId as string),
    enabled: !!formId,
  });

  return {
    permissions: data?.data ?? {
      scope: PermissionScope.ADMIN,
      permissions: { user: [], role: [], org: [] },
    },
    isLoading,
    isError,
    error,
    refetch,
  };
};

export const useAddFormPermissions = () => {
  const queryClient = useQueryClient();
  const permissionService = usePermissionService();

  return useMutation({
    mutationFn: ({
      formId,
      permission,
    }: {
      formId: string;
      permission: Permission;
    }) => permissionService.addFormPermissions(formId, permission),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: formPermissionsQueryKey(variables.formId),
      });
    },
  });
};

export const useUpdateFormPermissions = () => {
  const queryClient = useQueryClient();
  const permissionService = usePermissionService();

  return useMutation({
    mutationFn: ({
      formId,
      permission,
    }: {
      formId: string;
      permission: Permission;
    }) => permissionService.updateFormPermissions(formId, permission),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: formPermissionsQueryKey(variables.formId),
      });
    },
  });
};

export const useDeleteFormPermissions = () => {
  const queryClient = useQueryClient();
  const permissionService = usePermissionService();

  return useMutation({
    mutationFn: ({
      formId,
      query,
    }: {
      formId: string;
      query?: BackendFormPermissionDeleteQuery;
    }) => permissionService.deleteFormPermissions(formId, query),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: formPermissionsQueryKey(variables.formId),
      });
    },
  });
};

export const useDeleteFormPermission = () => {
  const queryClient = useQueryClient();
  const permissionService = usePermissionService();

  return useMutation({
    mutationFn: ({ formId, id }: { formId: string; id: number }) =>
      permissionService.deleteFormPermission(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: formPermissionsQueryKey(variables.formId),
      });
    },
  });
};

export const useApplicationShares = (serialNumber?: string) => {
  const permissionService = usePermissionService();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: applicationSharesQueryKey(serialNumber),
    queryFn: () =>
      permissionService.getApplicationShares(serialNumber as string),
    enabled: !!serialNumber,
  });

  return {
    shares: data?.data ?? ([] as ApplicationShare[]),
    isLoading,
    isError,
    error,
    refetch,
  };
};

export const useAddApplicationShares = () => {
  const queryClient = useQueryClient();
  const permissionService = usePermissionService();

  return useMutation({
    mutationFn: ({
      serialNumber,
      shares,
    }: {
      serialNumber: string;
      shares: ApplicationShareInput[];
    }) => permissionService.addApplicationShares(serialNumber, shares),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: applicationSharesQueryKey(variables.serialNumber),
      });
    },
  });
};

export const useUpdateApplicationShares = () => {
  const queryClient = useQueryClient();
  const permissionService = usePermissionService();

  return useMutation({
    mutationFn: ({
      serialNumber,
      shares,
    }: {
      serialNumber: string;
      shares: ApplicationShareInput[];
    }) => permissionService.updateApplicationShares(serialNumber, shares),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: applicationSharesQueryKey(variables.serialNumber),
      });
    },
  });
};

export const useDeleteApplicationShares = () => {
  const queryClient = useQueryClient();
  const permissionService = usePermissionService();

  return useMutation({
    mutationFn: ({
      serialNumber,
      query,
    }: {
      serialNumber: string;
      query: ApplicationShareDeleteQuery;
    }) => permissionService.deleteApplicationShares(serialNumber, query),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: applicationSharesQueryKey(variables.serialNumber),
      });
    },
  });
};

export const useDeleteApplicationShare = () => {
  const queryClient = useQueryClient();
  const permissionService = usePermissionService();

  return useMutation({
    mutationFn: ({ serialNumber, id }: { serialNumber: string; id: number }) =>
      permissionService.deleteApplicationShare(id),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: applicationSharesQueryKey(variables.serialNumber),
      });
    },
  });
};
