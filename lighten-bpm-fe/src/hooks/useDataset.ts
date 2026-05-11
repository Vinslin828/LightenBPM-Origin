import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { container } from "@/container";
import { IDomainService } from "@/interfaces/services";
import { TYPES } from "@/types/symbols";
import {
  CreateDatasetDto,
  DatasetField,
  DatasetRecord,
  ExternalApiFieldMappingsDto,
  ExternalApiRequestConfig,
} from "@/types/master-data-dataset";

const getDomainService = () =>
  container.get<IDomainService>(TYPES.DomainService);

const QUERY_KEYS = {
  datasets: ["datasets"] as const,
  dataset: (code: string) => ["datasets", code] as const,
  datasetRecords: (code: string) => ["datasets", code, "records"] as const,
};

const ORG_UNIT_TRANSLATIONS_DATASET = "ORG_UNIT_TRANSLATIONS";

const invalidateDatasetSideEffects = (
  queryClient: ReturnType<typeof useQueryClient>,
  code: string,
) => {
  if (code === ORG_UNIT_TRANSLATIONS_DATASET) {
    queryClient.invalidateQueries({ queryKey: ["org-units"] });
    queryClient.invalidateQueries({ queryKey: ["org-roles"] });
  }
};

export const useDatasets = (params?: { page?: number; limit?: number }) => {
  const {
    data: { data: paginated } = {},
    isLoading,
    error,
  } = useQuery({
    queryKey: [...QUERY_KEYS.datasets, params],
    queryFn: () => getDomainService().getDatasets(params),
    throwOnError: false,
  });

  return {
    datasets: paginated?.items ?? [],
    total: paginated?.total ?? 0,
    page: paginated?.page ?? params?.page ?? 1,
    limit: paginated?.limit ?? params?.limit ?? 10,
    totalPages: paginated?.totalPages ?? 0,
    isLoading,
    error,
  };
};

export const useDataset = (code?: string) => {
  const {
    data: { data: dataset } = {},
    isLoading,
    error,
  } = useQuery({
    queryKey: QUERY_KEYS.dataset(code!),
    queryFn: () => getDomainService().getDataset(code!),
    enabled: !!code,
    throwOnError: false,
  });

  return { dataset, isLoading, error };
};

export const useDatasetRecords = (
  code?: string,
  params?: { page?: number; limit?: number } & Record<string, any>,
) => {
  const {
    data: { data: recordsData } = {},
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [...QUERY_KEYS.datasetRecords(code!), params],
    queryFn: () => getDomainService().getDatasetRecords(code!, params),
    enabled: !!code,
    throwOnError: false,
  });

  return {
    records: recordsData?.items ?? [],
    total: recordsData?.total ?? 0,
    isLoading,
    error,
    refetch,
  };
};

export const useCreateDataset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: CreateDatasetDto) =>
      getDomainService().createDataset(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.datasets });
    },
  });
};

export const useDeleteDataset = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (code: string) => getDomainService().deleteDataset(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.datasets });
    },
  });
};

export const useRenameDataset = (code: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (name: string) => getDomainService().renameDataset(code, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dataset(code) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.datasets });
    },
  });
};

export const useUpdateExternalApiConfig = (code: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: {
      api_config?: ExternalApiRequestConfig | null;
      field_mappings?: ExternalApiFieldMappingsDto | null;
    }) => getDomainService().updateExternalApiConfig(code, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dataset(code) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.datasets });
    },
  });
};

export const useUpdateDatasetSchema = (code: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updatedFields: DatasetField[]) => {
      const fields = updatedFields.map((f) => ({
        name: f.name,
        type: f.type.toUpperCase() as "TEXT" | "NUMBER" | "BOOLEAN" | "DATE",
        required: !f.nullable,
        unique: f.unique ?? false,
        ...(f.default_value != null && !(f.default_value instanceof Date)
          ? { default_value: f.default_value }
          : {}),
      }));

      return getDomainService().updateDatasetSchema(code, {
        fields,
        confirm_data_loss: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dataset(code) });
    },
  });
};

export const useCreateDatasetRecords = (code: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (records: DatasetRecord[]) =>
      getDomainService().createDatasetRecords(code, records),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetRecords(code),
      });
      invalidateDatasetSideEffects(queryClient, code);
    },
  });
};

export const useUpdateDatasetRecords = (code: string, fieldNames: string[]) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      updates: { original: DatasetRecord; changes: DatasetRecord }[],
    ) => getDomainService().updateDatasetRecords(code, updates, fieldNames),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetRecords(code),
      });
      invalidateDatasetSideEffects(queryClient, code);
    },
  });
};

export const useDeleteDatasetRecords = (code: string, fieldNames: string[]) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (records: DatasetRecord[]) =>
      getDomainService().deleteDatasetRecords(code, records, fieldNames),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetRecords(code),
      });
      invalidateDatasetSideEffects(queryClient, code);
    },
  });
};

export const useImportDatasetCsv = (code: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => getDomainService().importDatasetCsv(code, file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.datasetRecords(code),
      });
      invalidateDatasetSideEffects(queryClient, code);
    },
  });
};

export const useExportDatasetCsv = () => {
  return useMutation({
    mutationFn: (code: string) => getDomainService().exportDatasetCsv(code),
  });
};
