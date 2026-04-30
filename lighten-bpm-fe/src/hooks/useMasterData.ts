import {
  useInfiniteQuery,
  useMutation,
  useQueries,
  useQuery,
} from "@tanstack/react-query";
import { container } from "@/container";
import { IMasterDataService } from "@/interfaces/services";
import { TYPES } from "@/types/symbols";
import { Tag, User, FormSchema } from "@/types/domain";
import { DatasetRecord } from "@/types/master-data-dataset";
import { expressionMasterDataCacheAtom } from "@/store";
import { useAtom } from "jotai";
import { useEffect, useMemo } from "react";
const getMasterDataService = () =>
  container.get<IMasterDataService>(TYPES.MasterDataService);

export type MasterDataQuery = {
  filter?: Record<string, unknown>;
  sort?: {
    field: string;
    order: "asc" | "desc";
  };
  select?: string[];
  page?: number;
  limit?: number;
};

const MASTER_DATA_REGEX = /getMasterData\s*\(\s*["'`]([^"'`]+)["'`]/g;

function collectMasterDataTableKeys(
  value: unknown,
  collector: Set<string>,
  visited: WeakSet<object>,
) {
  if (typeof value === "string") {
    let match: RegExpExecArray | null;
    while ((match = MASTER_DATA_REGEX.exec(value)) !== null) {
      const tableKey = match[1]?.trim();
      if (tableKey) {
        collector.add(tableKey);
      }
    }
    MASTER_DATA_REGEX.lastIndex = 0;
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  if (visited.has(value)) {
    return;
  }
  visited.add(value);

  if (Array.isArray(value)) {
    value.forEach((item) =>
      collectMasterDataTableKeys(item, collector, visited),
    );
    return;
  }

  Object.values(value).forEach((item) =>
    collectMasterDataTableKeys(item, collector, visited),
  );
}

export function extractMasterDataTableKeysFromSchema(
  schema?: FormSchema,
): string[] {
  if (!schema) {
    return [];
  }

  const collector = new Set<string>();
  const visited = new WeakSet<object>();
  collectMasterDataTableKeys(schema, collector, visited);
  return Array.from(collector);
}

const QUERY_KEYS = {
  tags: ["tags"] as const,
  users: (search?: string) => ["users", search ?? ""] as const,
  userById: (id?: string) => ["users", "id", id] as const,
  orgUnits: (name?: string) => ["org-units", name ?? ""] as const,
  orgUnitById: (id?: string) => ["org-units", "id", id] as const,
  orgUnitByCode: (code?: string) => ["org-units", "code", code] as const,
  orgRoles: (name?: string) => ["org-roles", name ?? ""] as const,
  bpmDatasets: (params?: { page?: number; limit?: number }) =>
    ["bpm-datasets", params] as const,
  bpmDataset: (code?: string) => ["bpm-datasets", code] as const,
  bpmDatasetRecords: (
    code?: string,
    params?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
      select?: string | string[];
    },
  ) => ["bpm-datasets", code, "records", params] as const,
};

export const useTags = () => {
  const {
    data: { data: tags = [] } = {},
    isLoading,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.tags,
    queryFn: () => getMasterDataService().getTags(),
  });

  const getTagsColor = (tags: Tag[]) => {
    if (tags.length === 0) {
      return "gray";
    }
    return tags[0].color ?? "gray";
  };

  return { tags, isLoading, getTagsColor, error };
};

export const useUsers = (search?: string) => {
  const normalizedSearch = search?.trim() || undefined;
  const {
    data: { data: { items: users = [] } = {} } = {},
    isLoading,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.users(normalizedSearch),
    queryFn: () =>
      getMasterDataService().getUsers({ search: normalizedSearch }),
  });
  return { users, isLoading, error };
};

const USERS_PAGE_LIMIT = 25;

export const useUsersInfinite = (search?: string) => {
  const normalizedSearch = search?.trim() || undefined;
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [...QUERY_KEYS.users(normalizedSearch), "infinite"],
    queryFn: ({ pageParam }) =>
      getMasterDataService().getUsers({
        search: normalizedSearch,
        page: pageParam,
        limit: USERS_PAGE_LIMIT,
      }),
    getNextPageParam: (lastPage) => {
      const page = lastPage.data?.page ?? 1;
      const totalPages = lastPage.data?.totalPages ?? 1;
      return page < totalPages ? page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const users = useMemo(
    () => data?.pages.flatMap((page) => page.data?.items ?? []) ?? [],
    [data],
  );

  return {
    users,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};

export const useOrgUnits = (name?: string) => {
  const normalizedName = name?.trim() || undefined;
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.orgUnits(normalizedName),
    queryFn: () => getMasterDataService().getOrgUnits(normalizedName),
  });
  return { units: data?.data, isLoading, error };
};
export const useOrgById = (id?: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.orgUnitById(id),
    queryFn: () => getMasterDataService().getOrgUnitById(id as string),
    enabled: !!id,
  });
  return { unit: data?.data, isLoading, error };
};
export const useOrgByCode = (code?: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.orgUnitByCode(code),
    queryFn: () => getMasterDataService().getOrgUnitByCode(code as string),
    enabled: !!code,
  });
  return { unit: data?.data, isLoading, error };
};

export const useOrgUnitHeads = () => {
  // const {};
};
export const useOrgRoles = (name?: string) => {
  const normalizedName = name?.trim() || undefined;
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.orgRoles(normalizedName),
    queryFn: () => getMasterDataService().getOrgRoles(normalizedName),
  });
  return { roles: data?.data, isLoading, error };
};
export const useUser = (id?: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.userById(id),
    queryFn: () => getMasterDataService().getUserById(id!),
    enabled: !!id,
  });
  return { user: data?.data, isLoading, error };
};

export const useUsersByIds = (ids?: string[]) => {
  const queries = useQueries({
    queries: (ids || []).map((id) => ({
      queryKey: QUERY_KEYS.userById(id),
      queryFn: () => getMasterDataService().getUserById(id),
      enabled: !!id,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const error = queries.find((q) => q.error)?.error;
  const users = queries
    .map((q) => q.data?.data)
    .filter((u): u is User => u !== undefined);

  return {
    users,
    isLoading,
    error,
  };
};

export const useBpmDatasets = (params?: { page?: number; limit?: number }) => {
  // This is a workaround to fetch all datasets without implementing a new API endpoint, since the current endpoint requires pagination parameters. By setting a very high limit, we can effectively retrieve all datasets in one request. In the future, it would be better to have a dedicated API endpoint for fetching all datasets without pagination.
  const fixedParams = {
    limit: 9999,
  };
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.bpmDatasets(fixedParams),
    queryFn: () => getMasterDataService().getBpmDatasets(fixedParams),
  });

  return {
    datasets: data?.data?.items ?? [],
    total: data?.data?.total ?? 0,
    page: data?.data?.page ?? params?.page ?? 1,
    limit: data?.data?.limit ?? params?.limit ?? 10,
    totalPages: data?.data?.totalPages ?? 1,
    isLoading,
    error,
  };
};

export const useBpmDataset = (code?: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.bpmDataset(code),
    queryFn: () => getMasterDataService().getBpmDataset(code as string),
    enabled: !!code,
  });

  return { dataset: data?.data, isLoading, error };
};

export const useBpmDatasetRecords = (
  code?: string,
  params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    select?: string | string[];
  } & Record<string, any>,
) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: QUERY_KEYS.bpmDatasetRecords(code, params),
    queryFn: () =>
      getMasterDataService().getBpmDatasetRecords(code as string, params),
    enabled: !!code,
  });

  return {
    records: data?.data?.items ?? [],
    total: data?.data?.total ?? 0,
    page: data?.data?.page ?? params?.page ?? 1,
    limit: data?.data?.limit ?? params?.limit ?? 10,
    totalPages: data?.data?.totalPages ?? 1,
    isLoading,
    error,
    refetch,
  };
};

export const useTestExternalApi = () => {
  return useMutation({
    mutationFn: (apiConfig: {
      url: string;
      method: "GET" | "POST" | "PUT";
      headers?: Record<string, string>;
      body?: string;
    }) => getMasterDataService().testExternalApi(apiConfig),
  });
};

export const usePreloadMasterDataForExpressions = (schema?: FormSchema) => {
  const [cache, setCache] = useAtom(expressionMasterDataCacheAtom);
  const tableKeys = useMemo(
    () => extractMasterDataTableKeysFromSchema(schema),
    [schema],
  );

  const queries = useQueries({
    queries: tableKeys.map((tableKey) => ({
      queryKey: ["expression-master-data", tableKey],
      queryFn: async () => {
        const codeResponse =
          await getMasterDataService().getBpmDatasetCodeByName(tableKey);
        const datasetCode = codeResponse.data?.code?.trim();
        if (!datasetCode) {
          throw new Error(
            `Dataset code not found for master data "${tableKey}"`,
          );
        }
        const response = await getMasterDataService().getBpmDatasetRecords(
          datasetCode,
          {
            page: 1,
            limit: 5000,
          },
        );
        return response.data?.items ?? [];
      },
      enabled: Boolean(tableKey),
      staleTime: 5 * 60 * 1000,
    })),
  });

  useEffect(() => {
    if (!tableKeys.length) {
      return;
    }

    setCache((prev) => {
      let changed = false;
      const next = { ...prev };

      tableKeys.forEach((tableKey, index) => {
        const query = queries[index];
        if (!query) {
          return;
        }

        const current = next[tableKey];
        if (query.isPending || query.isFetching) {
          if (current?.status !== "loading") {
            next[tableKey] = {
              status: "loading",
              records: current?.records ?? [],
            };
            changed = true;
          }
          return;
        }

        if (query.isError) {
          const message =
            query.error instanceof Error
              ? query.error.message
              : "Failed to load master data";
          if (current?.status !== "error" || current.error !== message) {
            next[tableKey] = {
              status: "error",
              records: current?.records ?? [],
              error: message,
            };
            changed = true;
          }
          return;
        }

        const records = (query.data ?? []) as DatasetRecord[];
        if (
          current?.status !== "loaded" ||
          current.records !== records ||
          current.error
        ) {
          next[tableKey] = {
            status: "loaded",
            records,
          };
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [queries, setCache, tableKeys]);

  return {
    tableKeys,
    cache,
  };
};
