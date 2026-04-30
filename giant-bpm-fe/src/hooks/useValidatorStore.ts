import { container } from "@/container";
import { IDomainService } from "@/interfaces/services";
import {
  builderStoreAtom,
  formSettingAtom,
  interpreterStoreAtom,
  registryStoreAtom,
} from "@/store";
import { FormSchema } from "@/types/domain";
import { TYPES } from "@/types/symbols";
import { Validator, ValidatorType } from "@/types/validator";
import { useAtom, useStore } from "jotai";
import { useCodeHelper } from "./useCode/useCodeHelper";
import { useValidateFields } from "./useValidator";

export default function useValidatorStore() {
  const [registryStore, setRegistryStore] = useAtom(registryStoreAtom);
  const [{ validation: formValidators }] = useAtom(formSettingAtom);
  const [bStore] = useAtom(builderStoreAtom);
  const store = useStore();
  const iStore = store.get(interpreterStoreAtom);
  const domainService = container.get<IDomainService>(TYPES.DomainService);
  const { mutateAsync: validateApplicationFields } = useValidateFields();

  const schemaForCodeHelper = (iStore?.schema as FormSchema | undefined) ??
    bStore?.getSchema() ?? { root: [], entities: {} };

  const { executeValidator } = useCodeHelper({
    formSchema: schemaForCodeHelper,
    formData: iStore?.getData() ?? {},
    validateFields: validateApplicationFields,
  });

  async function initiateRegistryStore(schema: FormSchema) {
    console.debug({ schema });
    const entities = schema?.entities ?? {};
    const entityValidatorIds = Object.entries(entities).reduce<
      Array<{ entityId: string; validatorId: string }>
    >((acc, [entityId, entity]) => {
      const attributes =
        (entity?.attributes as Record<string, unknown> | undefined) ?? {};
      const validatorAttr =
        "validator" in attributes ? attributes.validator : undefined;
      const validatorId =
        typeof validatorAttr === "object" && validatorAttr !== null
          ? (validatorAttr as { validatorId?: string }).validatorId
          : undefined;
      if (typeof validatorId === "string" && validatorId.trim() !== "") {
        acc.push({ entityId, validatorId });
      }
      return acc;
    }, []);

    console.debug(entityValidatorIds);

    if (entityValidatorIds.length === 0) {
      return;
    }

    try {
      const pendingValidatorIds = new Set(
        entityValidatorIds.map(({ validatorId }) => validatorId),
      );
      const validatorsById = new Map<string, Validator>();
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages && pendingValidatorIds.size > 0) {
        const response = await domainService.getValidators({
          limit: 100,
          page,
        });

        if (!response.success || !response.data) {
          break;
        }

        totalPages = response.data.totalPages ?? totalPages;
        response.data.items.forEach((validator) => {
          if (pendingValidatorIds.has(validator.id)) {
            validatorsById.set(validator.id, validator);
            pendingValidatorIds.delete(validator.id);
          }
        });

        page += 1;
      }

      const nextStore = entityValidatorIds.reduce<Record<string, Validator>>(
        (acc, { entityId, validatorId }) => {
          const validator = validatorsById.get(validatorId);
          if (validator) {
            acc[entityId] = validator;
          }
          return acc;
        },
        {},
      );

      setRegistryStore(nextStore);
    } catch (error) {
      console.error("Failed to initiate validator store", error);
      setRegistryStore({});
    }
  }

  function removeValidator(entityId: string) {
    setRegistryStore((prev) => {
      const next = { ...prev };
      delete next[entityId];
      return next;
    });
  }

  function addValidator(entityId: string, validator: Validator) {
    setRegistryStore((prev) => ({
      ...prev,
      [entityId]: validator,
    }));
  }

  function updateValidator(entityId: string, validator: Validator) {
    setRegistryStore((prev) => ({
      ...prev,
      [entityId]: validator,
    }));
  }

  function getValidator(entityId: string): Validator | undefined {
    return registryStore[entityId];
  }

  function hasValidator(entityId: string) {
    return !!registryStore[entityId];
  }

  function getFieldNameByEntityId(entityId: string): string {
    const latestSchema =
      (store.get(interpreterStoreAtom)?.schema as FormSchema | undefined) ??
      bStore?.getSchema();
    console.debug({ latestSchema });
    const rawName = (
      latestSchema?.entities?.[entityId]?.attributes as
        | Record<string, unknown>
        | undefined
    )?.name;
    return typeof rawName === "string" && rawName.trim() !== ""
      ? rawName.trim()
      : entityId;
  }

  async function executeRegistryValidator({
    entityId,
    value,
    required = false,
  }: {
    entityId: string;
    value: unknown;
    required: boolean | undefined;
  }): Promise<string | undefined> {
    if (!hasValidator(entityId) || !required) {
      console.debug(entityId, value, "no registry");
      return undefined;
    }
    const validator = getValidator(entityId);
    console.debug({ validator });
    if (validator?.type !== ValidatorType.Code) {
      const validationResult = await executeValidator({
        value,
        isApi: true,
        currentField: getFieldNameByEntityId(entityId),
        formData: store.get(interpreterStoreAtom)?.getEntitiesValues?.() ?? {},
        registryIds: validator ? [validator.id] : [],
        defaultErrorMessage: validator?.errorMessage ?? "Validation failed",
      });
      if (
        typeof validationResult === "object" &&
        validationResult.isValid === false
      ) {
        return validationResult.error ?? validator?.errorMessage;
      }
    } else {
      const validationResult = await executeValidator({
        validatorCode: validator.data.code,
        value,
        isApi: validator.data.isApi,
        currentField: getFieldNameByEntityId(entityId),
        formData: store.get(interpreterStoreAtom)?.getEntitiesValues?.() ?? {},
        defaultErrorMessage: validator.errorMessage,
      });

      console.debug({ validationResult });
      if (validationResult === false) {
        return validator.errorMessage;
      } else if (
        typeof validationResult === "object" &&
        !validationResult.isValid
      ) {
        return validationResult.error ?? validator.errorMessage;
      }
    }
    return undefined;
  }
  async function executeAllRegistry(
    formData: Record<string, unknown>,
    formSchema: FormSchema,
  ) {
    const errors: Record<string, string> = {};

    console.debug("execute all registry", registryStore);

    console.debug({ formData, formSchema });

    for (const [entityId, value] of Object.entries(formData)) {
      try {
        const attributes = formSchema?.entities[entityId].attributes as
          | Record<string, unknown>
          | undefined;
        const validatorAttr =
          attributes && "validator" in attributes
            ? (attributes["validator"] as {
                required?: boolean;
                isApi?: boolean;
              })
            : undefined;

        // console.debug({ formSchema }, formSchema.entities[entityId]);

        if (validatorAttr?.isApi) {
          continue;
        }

        const error = await executeRegistryValidator({
          entityId,
          value,
          required: validatorAttr?.required,
        });

        if (error) {
          errors[entityId] = error;
        }
      } catch (e) {
        errors[entityId] = `Validator execution error: ${String(e)}`;
      }
    }
    console.debug({ errors });
    return errors;
  }
  async function executeLocalValidator({
    entityId,
    validatorCode,
    defaultErrorMessage,
    value,
    required = false,
    isApi,
  }: {
    entityId: string;
    validatorCode?: string;
    defaultErrorMessage?: string;
    value: unknown;
    required: boolean | undefined;
    isApi?: boolean;
  }): Promise<string | undefined> {
    if (!validatorCode || !required) return undefined;

    const validationResult = await executeValidator({
      validatorCode,
      value,
      isApi,
      currentField: getFieldNameByEntityId(entityId),
      formData: store.get(interpreterStoreAtom)?.getEntitiesValues?.() ?? {},
      defaultErrorMessage: defaultErrorMessage ?? "Validation failed",
    });

    console.debug({ validationResult });
    if (
      typeof validationResult === "object" &&
      validationResult.isValid === false
    ) {
      return validationResult.error ?? defaultErrorMessage;
    } else if (validationResult === false) {
      return defaultErrorMessage;
    }
    return undefined;
  }
  async function executeAllLocalValidator(
    formData: Record<string, unknown>,
  ): Promise<Record<string, string>> {
    const schema = store.get(interpreterStoreAtom)?.schema as
      | FormSchema
      | undefined;
    // const schema = bStore?.getSchema();
    if (!schema?.entities) return {};
    const errors: Record<string, string> = {};
    for (const [entityId, entity] of Object.entries(schema.entities)) {
      const validatorAttr =
        (
          entity.attributes as
            | {
                validator?: {
                  required: boolean;
                  code?: string;
                  isApi?: boolean;
                };
              }
            | undefined
        )?.validator ?? undefined;
      const validatorCode = validatorAttr?.code;
      if (!validatorCode) continue;
      // if (validatorAttr.isApi) continue;
      try {
        const error = await executeLocalValidator({
          entityId,
          validatorCode,
          defaultErrorMessage: "Validation failed",
          value: formData[entityId],
          required: validatorAttr.required,
          isApi: validatorAttr.isApi,
        });
        if (error) {
          errors[entityId] = error;
        }
      } catch (e) {
        errors[entityId] = `Validator execution error: ${String(e)}`;
      }
    }
    return errors;
  }
  async function executeFormValidator(): Promise<Record<string, string>> {
    console.debug({ formValidators });
    if (!formValidators.required) {
      return {};
    }

    const { validators } = formValidators;
    const errors: Record<string, string> = {};
    const formData =
      store.get(interpreterStoreAtom)?.getEntitiesValues?.() ?? {};

    for (const [index, validator] of validators.entries()) {
      if (!validator.code) continue;

      const result = await executeValidator({
        validatorCode: validator.code,
        value: undefined,
        isApi: Boolean(validator.isApi),
        currentField: validator.key,
        formData,
        defaultErrorMessage: validator.errorMessage ?? "Validation failed.",
      });

      if (typeof result === "boolean") {
        if (!result) {
          errors[validator.key ?? String(index)] =
            validator.errorMessage ?? "Validation failed.";
        }
      } else if (!result.isValid) {
        errors[validator.key ?? String(index)] =
          result.error ?? validator.errorMessage ?? "Validation failed.";
      }
    }

    return errors;
  }

  return {
    initiateValidatorStore: initiateRegistryStore,
    validatorStore: registryStore,
    addValidator,
    updateValidator,
    removeValidator,
    getValidator,
    hasValidator,
    executeRegistryValidator,
    executeAllRegistry,
    executeValidator,
    executeLocalValidator,
    executeAllLocalValidator,
    executeFormValidator,
  };
}
