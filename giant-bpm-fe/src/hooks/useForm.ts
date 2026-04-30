import {
  useQuery,
  useMutation,
  useQueryClient,
  UseMutationOptions,
} from "@tanstack/react-query";
import { container } from "../container";
import { IFormService } from "../interfaces/services";
import { TYPES } from "../types/symbols";
import {
  ApiResponse,
  ExportPayload,
  ImportCheckResponse,
  FormDefinition,
  FormListOptions,
} from "../types/domain";
import { FormStatus } from "@/types/form-builder";

// --- Service and Query Keys ---
const useFormService = () => container.get<IFormService>(TYPES.FormService);

const formsQueryKey = ["forms"] as const;
const formListQueryKey = (options?: FormListOptions) => [
  ...formsQueryKey,
  options ?? {},
];
const formQueryKey = (formId?: string) => ["form", formId];

// --- Query Hooks ---

/**
 * Fetches a paginated list of all forms.
 */
export const useForms = (options?: FormListOptions) => {
  const formService = useFormService();
  const {
    data: response,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: formListQueryKey(options),
    queryFn: () => formService.getForms(options),
  });

  return {
    data: response?.data,
    forms: response?.data?.items ?? [],
    isLoading,
    isFetching,
    error,
    refetch,
  };
};

/**
 * Fetches a single form by its ID.
 */
export const useForm = (formId?: string) => {
  const formService = useFormService();
  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: formQueryKey(formId),
    queryFn: async () => {
      if (!formId) return null;

      console.debug(formService.getForm(formId));
      return formService.getForm(formId);
    },
    staleTime: Infinity,
    enabled: !!formId,
  });

  return {
    form: response?.data,
    isLoading,
    isError,
    error,
    refetch,
  };
};

// --- Mutation Hooks ---

/**
 * Provides a mutation function to create a new form.
 */
export const useCreateForm = (options?: {
  onSuccess?: (data: ApiResponse<FormDefinition>) => void;
  onError?: (error: Error) => void;
}) => {
  const queryClient = useQueryClient();
  const formService = useFormService();

  return useMutation({
    mutationFn: (
      form: Pick<
        FormDefinition,
        "name" | "description" | "tags" | "validation"
      >,
    ) => {
      const newForm: Omit<
        FormDefinition,
        "revisionId" | "id" | "createdAt" | "updatedAt"
      > = {
        name: form.name,
        description: form.description,
        tags: form.tags,
        schema: { entities: {}, root: [] }, // Default empty schema
        version: 1,
        publishStatus: FormStatus.Draft,
        validation: form.validation,
      };
      return formService.create(newForm);
    },
    onSuccess: (data) => {
      options?.onSuccess?.(data);
      queryClient.invalidateQueries({ queryKey: formsQueryKey });
    },
  });
};

/**
 * Provides a mutation function to update an existing form.
 */
export const useUpdateForm = () => {
  const queryClient = useQueryClient();
  const formService = useFormService();

  return useMutation({
    mutationFn: (form: FormDefinition) => formService.update(form),
    onSuccess: (response) => {
      if (response.success && response.data) {
        // Invalidate the list query
        queryClient.invalidateQueries({ queryKey: formsQueryKey });
        // Update the cache for the single form query
        queryClient.setQueryData(formQueryKey(response.data.id), response);
      }
    },
  });
};

export const useDeleteForm = (
  options?: UseMutationOptions<ApiResponse<void>, Error, string, unknown>,
) => {
  const queryClient = useQueryClient();
  const formService = useFormService();
  return useMutation({
    mutationFn: (id: string) => formService.deleteForm(id),
    onSuccess(data, variables, context) {
      options?.onSuccess?.(data, variables, context);
      // queryClient.invalidateQueries({ queryKey: formsQueryKey });
      queryClient.refetchQueries({ queryKey: formsQueryKey });
      queryClient.invalidateQueries({ queryKey: formQueryKey(variables) });
    },
  });
};

export const useExportForm = () => {
  const formService = useFormService();
  return useMutation({
    mutationFn: (id: string) => formService.exportForm(id),
  });
};

export const useImportCheck = () => {
  const formService = useFormService();
  return useMutation({
    mutationFn: (payload: ExportPayload) => formService.importCheck(payload),
  });
};

export const useImportExecute = () => {
  const queryClient = useQueryClient();
  const formService = useFormService();
  return useMutation({
    mutationFn: (checkResult: ImportCheckResponse) =>
      formService.importExecute(checkResult),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: formsQueryKey });
      if (response.success && response.data?.public_id) {
        queryClient.invalidateQueries({
          queryKey: formQueryKey(response.data.public_id),
        });
      }
    },
  });
};
