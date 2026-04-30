import { useMemo } from "react";
import { container } from "../container";
import { IDomainService, IValidatorService } from "../interfaces/services";
import { TYPES } from "../types/symbols";
import { Validator, ValidatorListOptions } from "@/types/validator";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ValidateFieldsRequest } from "@/schemas/validator/validate-fields";

const useDomainService = () =>
  container.get<IDomainService>(TYPES.DomainService);
const useValidatorService = () =>
  container.get<IValidatorService>(TYPES.ValidatorService);

const validatorsListQueryKey = (options?: ValidatorListOptions) => [
  "validators",
  options,
];

export function useValidators(options?: ValidatorListOptions) {
  const domainService = useDomainService();
  const normalizedOptions = useMemo(() => options, [options]);
  const {
    data: response,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: validatorsListQueryKey(normalizedOptions),
    queryFn: () => domainService.getValidators(normalizedOptions),
  });

  return {
    validators: response?.data?.items,
    total: response?.data?.total,
    isLoading,
    isError,
    error,
  };
}

export function useValidator(id: string) {
  const domainService = useDomainService();

  return useQuery({
    queryKey: ["validator", id],
    queryFn: async () =>
      (await domainService.getValidator(id)).data as Validator,
    enabled: !!id,
    throwOnError: false,
  });
}

export function useValidateFields() {
  const validatorService = useValidatorService();

  return useMutation({
    mutationFn: (payload: ValidateFieldsRequest) =>
      validatorService.validateApplicationFields(payload),
  });
}

export function useValidateForm() {
  const validatorService = useValidatorService();

  return useMutation({
    mutationFn: (payload: ValidateFieldsRequest) =>
      validatorService.validateApplicationFields({
        ...payload,
        currentField: payload.currentField ?? "",
      }),
  });
}
