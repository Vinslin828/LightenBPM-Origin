import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { container } from "@/container";
import { IDomainService } from "@/interfaces/services";
import { TYPES } from "@/types/symbols";
import { useOrgUnits } from "./useOrganization";

const getDomainService = () =>
  container.get<IDomainService>(TYPES.DomainService);

const QUERY_KEYS = {
  users: ["users"] as const,
  userById: (id: string) => ["users", id] as const,
  userMemberships: (userId: string) =>
    ["users", userId, "memberships"] as const,
};

/**
 * Fetch all users with optional search
 */
export const useUsersList = (params?: {
  search?: string;
  page?: number;
  limit?: number;
}) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...QUERY_KEYS.users, params] as const,
    queryFn: () => getDomainService().getUsers(params),
  });

  const users = data?.data?.items ?? [];
  const pagination = data?.data
    ? {
        total: data.data.total,
        page: data.data.page,
        limit: data.data.limit,
        totalPages: data.data.totalPages,
      }
    : undefined;

  return { users, isLoading, error, refetch, pagination };
};

/**
 * Fetch a single user by ID
 */
export const useUserById = (id?: string) => {
  const {
    data: { data: user } = {},
    isLoading,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.userById(id!),
    queryFn: () => getDomainService().getUserById(id!),
    enabled: !!id,
    refetchOnWindowFocus: false,
  });

  return { user, isLoading, error };
};

/**
 * Fetch all memberships for a user
 * Enriches with org unit names by cross-referencing org units list
 */
export const useUserMemberships = (userId?: string) => {
  const {
    data: { data: rawMemberships = [] } = {},
    isLoading: isLoadingMemberships,
    error: membershipsError,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.userMemberships(userId!),
    queryFn: () => getDomainService().getUserMemberships(userId!),
    enabled: !!userId,
    refetchOnWindowFocus: false,
  });

  // Reuse shared org units hook to resolve names from codes
  const { units: orgUnits, isLoading: isLoadingOrgs } = useOrgUnits();

  // Enrich memberships with org unit names and deduplicate by orgUnitCode
  const memberships = useMemo(() => {
    if (!rawMemberships.length) return rawMemberships;
    const orgMap = new Map(orgUnits.map((o) => [o.code, o]));

    // Deduplicate: keep only the latest membership per orgUnitCode
    const seen = new Map<string, (typeof rawMemberships)[0]>();
    for (const m of rawMemberships) {
      const existing = seen.get(m.orgUnitCode);
      if (!existing || Number(m.id) > Number(existing.id)) {
        seen.set(m.orgUnitCode, m);
      }
    }

    return [...seen.values()].map((m) => {
      const org = orgMap.get(m.orgUnitCode);
      return {
        ...m,
        orgUnitId: org?.id ?? m.orgUnitId,
        orgUnitName: org?.name ?? m.orgUnitCode,
      };
    });
  }, [rawMemberships, orgUnits]);

  return {
    memberships,
    isLoading: isLoadingMemberships || isLoadingOrgs,
    error: membershipsError,
    refetch,
  };
};

/**
 * Create a new user
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      code: string;
      name: string;
      jobGrade: number;
      defaultOrgCode?: string;
    }) => getDomainService().createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.users,
        refetchType: "all",
      });
    },
  });
};

/**
 * Update an existing user
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string;
      data: { name?: string; jobGrade?: number; defaultOrgCode?: string };
    }) => getDomainService().updateUser(userId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userById(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.users,
      });
    },
  });
};

/**
 * Delete a user
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) => getDomainService().deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.users,
        refetchType: "all",
      });
    },
  });
};

/**
 * Create a membership (assign user to org)
 */
export const useCreateMembership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      orgUnitCode: string;
      userId: string;
      startDate: string;
      endDate?: string;
      isIndefinite?: boolean;
      note?: string;
    }) => getDomainService().createOrgMembership(data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userMemberships(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userById(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.users,
      });
    },
  });
};

/**
 * Update a membership (change dates)
 */
export const useUpdateMembership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      membershipId,
      userId,
      data,
    }: {
      membershipId: string;
      userId: string;
      data: {
        startDate?: string;
        endDate?: string;
        isIndefinite?: boolean;
        note?: string;
      };
    }) => getDomainService().updateOrgMembership(membershipId, data),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userMemberships(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userById(variables.userId),
      });
    },
  });
};

/**
 * Delete a membership (remove user from org)
 */
export const useDeleteMembership = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      membershipId,
      userId,
    }: {
      membershipId: string;
      userId: string;
    }) => getDomainService().deleteOrgMembership(membershipId),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userMemberships(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userById(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.users,
      });
    },
  });
};

/**
 * Update user's default organization
 */
export const useUpdateUserDefaultOrg = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      orgUnitCode,
    }: {
      userId: string;
      orgUnitCode: string;
    }) =>
      getDomainService().updateUser(userId, {
        defaultOrgCode: orgUnitCode,
      }),
    onSuccess: (_response, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userById(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.userMemberships(variables.userId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.users,
      });
    },
  });
};
