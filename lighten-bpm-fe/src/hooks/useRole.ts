import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { container } from "@/container";
import { IDomainService } from "@/interfaces/services";
import { TYPES } from "@/types/symbols";

const getDomainService = () =>
  container.get<IDomainService>(TYPES.DomainService);

const QUERY_KEYS = {
  roles: ["roles"] as const,
  roleById: (id: string) => ["roles", id] as const,
  roleMembers: (id: string) => ["roles", id, "members"] as const,
  users: ["users"] as const,
};

export const useRoles = () => {
  const {
    data: { data: roles = [] } = {},
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.roles,
    queryFn: () => getDomainService().getOrgRoles(),
  });

  return { roles, isLoading, error, refetch };
};

export const useRoleWithMembers = (id?: string) => {
  const {
    data: { data: role } = {},
    isLoading: isLoadingRole,
    error: roleError,
  } = useQuery({
    queryKey: QUERY_KEYS.roleById(id!),
    queryFn: () => getDomainService().getOrgUnitById(id!),
    enabled: !!id,
    refetchOnWindowFocus: false,
  });

  const {
    data: membersResponse,
    isLoading: isLoadingMembers,
    error: membersError,
  } = useQuery({
    queryKey: QUERY_KEYS.roleMembers(id!),
    queryFn: async () => {
      try {
        return await getDomainService().getOrgUnitMembers(id!);
      } catch {
        return { success: false, data: undefined };
      }
    },
    enabled: !!id,
    retry: false,
    throwOnError: false,
    refetchOnWindowFocus: false,
  });

  const members =
    membersResponse?.success && membersResponse?.data !== undefined
      ? membersResponse.data
      : (role?.members ?? []);

  // Deduplicate
  const dedupedMembers = (() => {
    const seen = new Set<string>();
    return members.filter((m) => {
      const mid = String(m.id);
      if (seen.has(mid)) return false;
      seen.add(mid);
      return true;
    });
  })();

  const roleWithMembers = role
    ? { ...role, members: dedupedMembers }
    : undefined;

  return {
    role: roleWithMembers,
    members: dedupedMembers,
    isLoading: isLoadingRole || isLoadingMembers,
    error: roleError || membersError,
  };
};

export const useCreateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { code: string; name: string }) =>
      getDomainService().createRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.roles,
        refetchType: "all",
      });
    },
  });
};

export const useUpdateRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roleId,
      data,
    }: {
      roleId: string;
      data: { name?: string; code?: string };
    }) => getDomainService().updateOrgUnit(roleId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.roleById(variables.roleId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.roles,
      });
    },
  });
};

export const useDeleteRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: string) => getDomainService().deleteOrgUnit(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.roles,
        refetchType: "all",
      });
    },
  });
};

export const useAddUserToRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      getDomainService().addUserToOrgUnit(roleId, userId),
    onSuccess: async (_response, variables) => {
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.roleById(variables.roleId),
      });
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.roleMembers(variables.roleId),
      });
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.roleById(variables.roleId),
        exact: true,
      });
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.roleMembers(variables.roleId),
        exact: true,
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roles });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
};

export const useRemoveUserFromRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, userId }: { roleId: string; userId: string }) =>
      getDomainService().removeUserFromOrgUnit(roleId, userId),
    onSuccess: async (_response, variables) => {
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.roleById(variables.roleId),
      });
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.roleMembers(variables.roleId),
      });
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.roleById(variables.roleId),
        exact: true,
      });
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.roleMembers(variables.roleId),
        exact: true,
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roles });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
};

export const useAddUsersToRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, userIds }: { roleId: string; userIds: string[] }) =>
      Promise.all(
        userIds.map((userId) =>
          getDomainService().addUserToOrgUnit(roleId, userId),
        ),
      ),
    onSuccess: async (_response, variables) => {
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.roleById(variables.roleId),
      });
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.roleMembers(variables.roleId),
      });
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.roleById(variables.roleId),
        exact: true,
      });
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.roleMembers(variables.roleId),
        exact: true,
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roles });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
};

export const useRemoveUsersFromRole = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, userIds }: { roleId: string; userIds: string[] }) =>
      Promise.all(
        userIds.map((userId) =>
          getDomainService().removeUserFromOrgUnit(roleId, userId),
        ),
      ),
    onSuccess: async (_response, variables) => {
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.roleById(variables.roleId),
      });
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.roleMembers(variables.roleId),
      });
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.roleById(variables.roleId),
        exact: true,
      });
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.roleMembers(variables.roleId),
        exact: true,
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.roles });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
};
