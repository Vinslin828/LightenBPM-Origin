import { useMutation, useQueryClient } from "@tanstack/react-query";
import { container } from "../container";
import { IDomainService } from "../interfaces/services";
import { TYPES } from "../types/symbols";
import {
  CreateValidatorDto,
  UpdateValidatorDto,
} from "@/types/validation-registry";
import { PaginatedApiResponse } from "@/types/domain";
import { Validator } from "@/types/validator";

const useDomainService = () =>
  container.get<IDomainService>(TYPES.DomainService);

export function useCreateValidator() {
  const domainService = useDomainService();

  return useMutation({
    mutationFn: (dto: CreateValidatorDto) =>
      domainService.createValidator(dto),
    // Note: Query invalidation is handled manually in the component
    // to ensure proper sequencing with UI updates
  });
}

export function useUpdateValidator() {
  const domainService = useDomainService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateValidatorDto }) =>
      domainService.updateValidator(id, dto),
    onSuccess: (data, variables) => {
      const updatedValidator = data.data;
      if (!updatedValidator) {
        queryClient.invalidateQueries({ queryKey: ["validators"] });
        queryClient.invalidateQueries({
          queryKey: ["validator", variables.id],
        });
        return;
      }

      queryClient.setQueryData(["validator", variables.id], updatedValidator);
      queryClient.setQueriesData(
        { queryKey: ["validators"] },
        (old: PaginatedApiResponse<Validator> | undefined) => {
          if (!old?.data?.items) return old;

          const nextItems = old.data.items.map((item) =>
            item.id === variables.id
              ? {
                  ...item,
                  name: updatedValidator.name,
                  description: updatedValidator.description,
                  errorMessage: updatedValidator.errorMessage,
                  type: updatedValidator.type,
                  data: updatedValidator.data,
                  updatedAt: updatedValidator.updatedAt,
                }
              : item,
          );

          return {
            ...old,
            data: {
              ...old.data,
              items: nextItems,
            },
          };
        },
      );

      queryClient.invalidateQueries({
        queryKey: ["validator", variables.id],
      });
    },
  });
}

export function useDeleteValidator() {
  const domainService = useDomainService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => domainService.deleteValidator(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["validators"] });
    },
  });
}

export function useSetValidatorComponents() {
  const domainService = useDomainService();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, components }: { id: string; components: string[] }) =>
      domainService.setValidatorComponents(id, components),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["validator", variables.id],
      });
    },
  });
}
