import { useCallback, useRef, useState } from "react";
import useValidatorStore from "./useValidatorStore";
import { ValidatorType } from "@/types/validator";

type ValidatorConfig = {
  required?: boolean;
  code?: string;
  isApi?: boolean;
};

type ValidateAndCommitOptions<TValue> = {
  value: TValue;
  setValue?: (value: TValue) => void;
  commitMode?: "before" | "after";
  validator?: ValidatorConfig;
  defaultErrorMessage?: string;
  isRequiredInvalid?: (value: TValue) => boolean;
  requiredMessage?: string;
  readonly?: boolean;
  onValidationSuccess?: () => void;
};

export function useFieldValidationState(entityId: string) {
  const [localError, setLocalError] = useState<string | undefined>(undefined);
  const [isValidating, setIsValidating] = useState(false);
  const runIdRef = useRef(0);
  const {
    executeRegistryValidator: getCodeValidatorError,
    executeLocalValidator,
    getValidator,
  } = useValidatorStore();

  const validateAndCommit = useCallback(
    async <TValue>({
      value,
      setValue,
      commitMode = "before",
      validator,
      defaultErrorMessage = "Validation failed",
      isRequiredInvalid,
      requiredMessage = "This field is required",
      readonly,
      onValidationSuccess,
    }: ValidateAndCommitOptions<TValue>): Promise<string | undefined> => {
      if (readonly) {
        setValue?.(value);
        return undefined;
      }

      if (commitMode === "before") {
        setValue?.(value);
      }

      const runId = ++runIdRef.current;
      let nextError: string | undefined;

      if (isRequiredInvalid?.(value)) {
        nextError = requiredMessage;
      } else {
        const registryValidator = getValidator(entityId);
        const registryUsesApi = Boolean(
          registryValidator &&
            (registryValidator.type !== ValidatorType.Code ||
              registryValidator.data?.isApi),
        );
        const localUsesApi = Boolean(validator?.isApi && validator?.code);
        const shouldShowValidating = Boolean(
          validator?.required && (registryUsesApi || localUsesApi),
        );

        if (shouldShowValidating) {
          setIsValidating(true);
        }

        try {
          const registryError = await getCodeValidatorError({
            required: validator?.required,
            entityId,
            value: value ?? "",
          });
          const localValidatorError = await executeLocalValidator({
            entityId,
            required: validator?.required,
            validatorCode: validator?.code,
            defaultErrorMessage,
            value,
            isApi: validator?.isApi,
          });

          if (runId !== runIdRef.current) {
            return undefined;
          }

          nextError = registryError ?? localValidatorError ?? undefined;
        } finally {
          if (runId === runIdRef.current) {
            setIsValidating(false);
          }
        }
      }

      if (runId === runIdRef.current) {
        setLocalError(nextError);
        if (!nextError) {
          onValidationSuccess?.();
        }
      }

      if (commitMode === "after") {
        setValue?.(value);
      }

      return nextError;
    },
    [entityId, executeLocalValidator, getCodeValidatorError],
  );

  return {
    localError,
    isValidating,
    validateAndCommit,
    setLocalError,
  };
}
