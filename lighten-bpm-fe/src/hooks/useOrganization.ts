import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { container } from "@/container";
import { IDomainService } from "@/interfaces/services";
import { TYPES } from "@/types/symbols";
import { Unit, User } from "@/types/domain";
import { OrgHead, OrgUnitWithHeads } from "@/types/organization";
import { getActiveHead } from "@/schemas/organization/head-transform";
import { useTranslation } from "react-i18next";
import { localizeOrgUnit, localizeOrgUnits } from "@/utils/localized-org-unit";
import { useMemo } from "react";

const getDomainService = () =>
  container.get<IDomainService>(TYPES.DomainService);

/**
 * Query keys for organization-related queries
 * Organized hierarchically for efficient cache invalidation
 */
const QUERY_KEYS = {
  orgUnits: ["org-units"] as const,
  orgUnitById: (id: string) => ["org-units", id] as const,
  orgUnitHeads: (id: string) => ["org-units", id, "heads"] as const,
  orgUnitMembers: (id: string) => ["org-units", id, "members"] as const,
  users: ["users"] as const,
};

/**
 * Hook to fetch all organization units
 * Reuses existing useMasterData pattern
 */
export const useOrgUnits = () => {
  const { i18n } = useTranslation();
  const {
    data: { data: units = [] } = {},
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.orgUnits,
    queryFn: async () => {
      // console.log("[useOrgUnits] Fetching org units...");
      const result = await getDomainService().getOrgUnits();
      // console.log("[useOrgUnits] Fetched units:", result.data?.length || 0);
      return result;
    },
  });

  const localizedUnits = useMemo(
    () => localizeOrgUnits(units, i18n.language),
    [units, i18n.language],
  );

  if (error) {
    console.error("[useOrgUnits] Error fetching org units:", error);
  }

  return { units: localizedUnits, isLoading, error, refetch };
};

/**
 * Hook to fetch a single organization unit with its heads
 * Combines org unit data with heads data and computes active head
 */
export const useOrgUnitWithHeads = (id?: string) => {
  const { i18n } = useTranslation();
  // Fetch org unit details
  const {
    data: { data: unit } = {},
    isLoading: isLoadingUnit,
    error: unitError,
  } = useQuery({
    queryKey: QUERY_KEYS.orgUnitById(id!),
    queryFn: async () => {
      // console.log("[useOrgUnitWithHeads] Fetching org unit:", id);
      const result = await getDomainService().getOrgUnitById(id!);
      // console.log("[useOrgUnitWithHeads] QUERY RESULT - About to cache:", {
      //   orgId: result.data?.id,
      //   orgName: result.data?.name,
      //   membersCount: result.data?.members?.length || 0,
      //   members:
      //     result.data?.members?.map((m) => ({
      //       id: m.id,
      //       idType: typeof m.id,
      //       name: m.name,
      //     })) || [],
      //   queryKey: QUERY_KEYS.orgUnitById(id!),
      // });
      return result;
    },
    enabled: !!id,
    refetchOnWindowFocus: false,
    staleTime: 0,
    gcTime: 0,
  });

  const {
    data: membersResponse,
    isLoading: isLoadingMembers,
    error: membersError,
  } = useQuery({
    queryKey: QUERY_KEYS.orgUnitMembers(id!),
    queryFn: async () => {
      // console.log("[useOrgUnitWithHeads] Fetching members for:", id);
      try {
        const result = await getDomainService().getOrgUnitMembers(id!);
        // console.log(
        //   "[useOrgUnitWithHeads] Fetched members:",
        //   result.data?.length || 0,
        // );
        return result;
      } catch (error) {
        console.warn("[useOrgUnitWithHeads] Members API not available:", error);
        return { success: false, data: undefined };
      }
    },
    enabled: !!id,
    retry: false,
    throwOnError: false,
    refetchOnWindowFocus: false,
    staleTime: 0,
    gcTime: 0,
  });

  // Fetch heads for this org unit
  // Note: This API might not exist yet, so we handle errors gracefully
  const {
    data: { data: heads = [] } = {},
    isLoading: isLoadingHeads,
    error: headsError,
  } = useQuery({
    queryKey: QUERY_KEYS.orgUnitHeads(id!),
    queryFn: async () => {
      // console.log("[useOrgUnitWithHeads] Fetching heads for:", id);
      try {
        const result = await getDomainService().getOrgUnitHeadsByOrgId(id!);
        // console.log(
        //   "[useOrgUnitWithHeads] Fetched heads:",
        //   result.data?.length || 0,
        // );
        return result;
      } catch (error) {
        console.warn("[useOrgUnitWithHeads] Heads API not available:", error);
        // Return empty array if API doesn't exist
        return { success: true, data: [] };
      }
    },
    enabled: !!id,
    retry: false, // Don't retry if API doesn't exist
    throwOnError: false, // Don't throw errors to prevent app crash
    refetchOnWindowFocus: false,
    staleTime: 0,
    gcTime: 0,
  });

  if (unitError) {
    console.error("[useOrgUnitWithHeads] Error fetching unit:", unitError);
  }
  if (headsError) {
    console.warn(
      "[useOrgUnitWithHeads] Error fetching heads (non-critical):",
      headsError,
    );
  }
  if (membersError) {
    console.warn(
      "[useOrgUnitWithHeads] Error fetching members (non-critical):",
      membersError,
    );
  }

  // Log what came from cache BEFORE combining with heads
  if (unit) {
    // console.log(
    //   "[useOrgUnitWithHeads] DATA FROM CACHE (before combining with heads):",
    //   {
    //     orgUnitId: unit.id,
    //     orgUnitName: unit.name,
    //     membersCount: unit.members?.length || 0,
    //     members:
    //       unit.members?.map((m) => ({
    //         id: m.id,
    //         idType: typeof m.id,
    //         name: m.name,
    //       })) || [],
    //     queryKey: QUERY_KEYS.orgUnitById(id!),
    //   },
    // );
  }

  const rawMembers =
    membersResponse?.success && membersResponse?.data !== undefined
      ? membersResponse.data
      : unit?.members;

  const members = (() => {
    const list = rawMembers ?? [];
    const seen = new Set<string>();
    return list.filter((member) => {
      const memberId = String(member.id);
      if (seen.has(memberId)) return false;
      seen.add(memberId);
      return true;
    });
  })();

  // Combine unit with heads and compute active head
  const localizedUnit = unit ? localizeOrgUnit(unit, i18n.language) : undefined;

  const orgUnitWithHeads: OrgUnitWithHeads | undefined = localizedUnit
    ? {
        ...localizedUnit,
        members,
        heads,
        activeHead: getActiveHead(heads),
      }
    : undefined;

  // Debug logging
  if (orgUnitWithHeads) {
    // console.log(
    //   "[useOrgUnitWithHeads] FINAL COMBINED DATA (after adding heads):",
    //   {
    //     orgUnitId: orgUnitWithHeads.id,
    //     orgUnitName: orgUnitWithHeads.name,
    //     membersCount: orgUnitWithHeads.members?.length || 0,
    //     memberIds: orgUnitWithHeads.members?.map((m) => m.id) || [],
    //     memberNames: orgUnitWithHeads.members?.map((m) => m.name) || [],
    //   },
    // );
  }

  return {
    orgUnit: orgUnitWithHeads,
    unit: localizedUnit,
    heads,
    activeHead: orgUnitWithHeads?.activeHead,
    isLoading: isLoadingUnit || isLoadingHeads || isLoadingMembers,
    error: unitError || headsError || membersError,
  };
};

/**
 * Mutation hook to create a new organization unit
 */
export const useCreateOrgUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      code: string;
      name: string;
      nameTranslations?: Record<string, string>;
      parentCode?: string;
    }) =>
      getDomainService().createOrgUnit(data),
    onSuccess: () => {
      // Invalidate all organization-related queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnits,
        refetchType: "all",
      });
    },
  });
};

/**
 * Mutation hook to update organization unit details (name, code)
 */
export const useUpdateOrgUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orgUnitId,
      data,
    }: {
      orgUnitId: string;
      data: {
        name?: string;
        code?: string;
        nameTranslations?: Record<string, string>;
        parentCode?: string | null;
      };
    }) => getDomainService().updateOrgUnit(orgUnitId, data),
    onSuccess: (response, variables) => {
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitById(variables.orgUnitId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnits,
      });
    },
  });
};

/**
 * Mutation hook to delete an organization unit
 */
export const useDeleteOrgUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orgUnitId: string) =>
      getDomainService().deleteOrgUnit(orgUnitId),
    onSuccess: () => {
      // Invalidate all organization-related queries with aggressive refetch
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnits,
        refetchType: "all",
      });
    },
  });
};

/**
 * Mutation hook to set a user's default organization unit
 */
export const useSetUserDefaultOrg = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      orgUnitId,
    }: {
      userId: string;
      orgUnitId: string;
    }) => getDomainService().updateUserDefaultOrg(userId, orgUnitId),
    onSuccess: (response, variables) => {
      // Invalidate users query to refetch updated user data
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.users,
      });
      // Also invalidate org units to refresh member lists
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnits,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
      });
    },
  });
};

/**
 * Hook to fetch all users
 * Reuses existing pattern from useMasterData
 */
export const useUsers = () => {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: () => getDomainService().getUsers(),
  });

  // getUsers() returns PaginatedApiResponse, so data.data is { items, total, ... }
  const users: import("@/types/domain").User[] = data?.data?.items ?? [];

  return { users, isLoading, error };
};

/**
 * Mutation hook to add a user to an organization unit
 */
export const useAddUserToOrgUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orgUnitId,
      userId,
    }: {
      orgUnitId: string;
      userId: string;
    }) => getDomainService().addUserToOrgUnit(orgUnitId, userId),

    onSuccess: async (response, variables) => {
      // console.log(
      //   "[useAddUserToOrgUnit] onSuccess - invalidating and refetching",
      // );

      // Invalidate the specific org unit query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitById(variables.orgUnitId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
      });

      // Force immediate refetch by removing the cache and refetching
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.orgUnitById(variables.orgUnitId),
      });
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
      });

      // Refetch the org unit query if it's currently being observed
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.orgUnitById(variables.orgUnitId),
        exact: true,
      });
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
        exact: true,
      });

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnits,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitHeads(variables.orgUnitId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.users,
      });

      // console.log("[useAddUserToOrgUnit] onSuccess complete");
    },
  });
};

/**
 * Mutation hook to remove a user from an organization unit
 */
export const useRemoveUserFromOrgUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orgUnitId,
      userId,
    }: {
      orgUnitId: string;
      userId: string;
    }) => getDomainService().removeUserFromOrgUnit(orgUnitId, userId),

    onSuccess: async (response, variables) => {
      // console.log(
      //   "[useRemoveUserFromOrgUnit] onSuccess - invalidating and refetching",
      // );

      // Invalidate the specific org unit query
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitById(variables.orgUnitId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
      });

      // Force immediate refetch by removing the cache and refetching
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.orgUnitById(variables.orgUnitId),
      });
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
      });

      // Refetch the org unit query if it's currently being observed
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.orgUnitById(variables.orgUnitId),
        exact: true,
      });
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
        exact: true,
      });

      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnits,
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitHeads(variables.orgUnitId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.users,
      });

      // console.log("[useRemoveUserFromOrgUnit] onSuccess complete");
    },
  });
};

export const useAddUsersToOrgUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orgUnitId,
      userIds,
    }: {
      orgUnitId: string;
      userIds: string[];
    }) =>
      Promise.all(
        userIds.map((userId) =>
          getDomainService().addUserToOrgUnit(orgUnitId, userId),
        ),
      ),
    onSuccess: async (_response, variables) => {
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.orgUnitById(variables.orgUnitId),
      });
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
      });
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.orgUnitById(variables.orgUnitId),
        exact: true,
      });
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
        exact: true,
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orgUnits });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitHeads(variables.orgUnitId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
};

export const useRemoveUsersFromOrgUnit = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orgUnitId,
      userIds,
    }: {
      orgUnitId: string;
      userIds: string[];
    }) =>
      Promise.all(
        userIds.map((userId) =>
          getDomainService().removeUserFromOrgUnit(orgUnitId, userId),
        ),
      ),
    onSuccess: async (_response, variables) => {
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.orgUnitById(variables.orgUnitId),
      });
      queryClient.removeQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
      });
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.orgUnitById(variables.orgUnitId),
        exact: true,
      });
      await queryClient.refetchQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
        exact: true,
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.orgUnits });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitHeads(variables.orgUnitId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
};

/**
 * Mutation hook to create a head assignment for an organization unit
 */
export const useCreateOrgHead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orgUnitId,
      userId,
      startDate,
      endDate,
    }: {
      orgUnitId: string;
      userId: string;
      startDate: string;
      endDate?: string;
    }) =>
      getDomainService().createOrgHead(orgUnitId, userId, startDate, endDate),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitHeads(variables.orgUnitId),
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitById(variables.orgUnitId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnits,
      });
    },
  });
};

/**
 * Mutation hook to update a head assignment's effective dates
 */
export const useUpdateOrgHead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orgUnitId,
      headId,
      startDate,
      endDate,
    }: {
      orgUnitId: string;
      headId: string;
      startDate: string;
      endDate?: string;
    }) => getDomainService().updateOrgHead(headId, startDate, endDate),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitHeads(variables.orgUnitId),
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitById(variables.orgUnitId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnits,
      });
    },
  });
};

/**
 * Mutation hook to delete a head assignment
 */
export const useDeleteOrgHead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      orgUnitId,
      headId,
    }: {
      orgUnitId: string;
      headId: string;
    }) => getDomainService().deleteOrgHead(headId),
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitHeads(variables.orgUnitId),
        refetchType: "all",
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitMembers(variables.orgUnitId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnitById(variables.orgUnitId),
      });
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.orgUnits,
      });
    },
  });
};
