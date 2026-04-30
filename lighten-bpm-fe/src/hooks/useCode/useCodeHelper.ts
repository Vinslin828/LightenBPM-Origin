import i18n from "@/i18n";
import {
  ValidateFieldsRequest,
  ValidateFieldsResponse,
} from "@/schemas/validator/validate-fields";
import {
  expressionMasterDataCacheAtom,
  interpreterStoreAtom,
  selectedApplicantAtom,
  userAtom,
} from "@/store";
import { Application } from "@/types/application";
import { FormSchema } from "@/types/domain";
import { EntityKey } from "@/types/form-builder";
import { atom, useAtom, useAtomValue, useStore } from "jotai";
import { useCallback, useRef } from "react";
import {
  executeCodeWithBindings,
  getFieldIdByName,
  getFieldNameByIdentifier as getFieldNameByIdentifierFromSchema,
  toNameKeyedFormData as toNameKeyedFormDataFromSchema,
} from "./utils";
import { MasterDataQuery, useOrgById, useUser } from "../useMasterData";

const DEFAULT_PAGE = 1;

const isEmptyMasterDataValue = (value: unknown) =>
  value === undefined || value === null;

const isPositiveInteger = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

type ValidateFieldsExecutor = (
  payload: ValidateFieldsRequest,
) => Promise<{ data?: ValidateFieldsResponse }>;

type CodeHelperProps = {
  formSchema: FormSchema;
  formData: Application["formInstance"]["data"];
  application?: Application;
  validateFields?: ValidateFieldsExecutor;
};
export function useCodeHelper({
  formSchema,
  formData = {},
  application: application,
  validateFields,
}: CodeHelperProps) {
  //   console.debug({ formSchema, formData, application });
  const [user] = useAtom(userAtom);
  const { user: applicant } = useUser(application?.submittedBy);

  const { unit } = useOrgById(applicant?.defaultOrgId || user?.defaultOrgId);
  const store = useStore();
  const isCompilingSchemaRef = useRef(false);
  const selectedApplicant = useAtomValue(selectedApplicantAtom);
  const { unit: selectedApplicantUnit } = useOrgById(
    selectedApplicant?.defaultOrgId,
  );

  const getFormField = useCallback(
    (_name: string) => {
      const iStore = isCompilingSchemaRef.current
        ? null
        : store.get(interpreterStoreAtom);
      const entities = iStore?.schema?.entities ?? formSchema.entities;
      const fieldUuid = getFieldIdByName(entities, _name);

      if (!fieldUuid) {
        console.warn(`Field with name ${_name} not found in schema`);
        return { value: undefined };
      }

      console.debug(iStore?.getEntitiesValues()[fieldUuid]);

      const entity = entities[fieldUuid];
      const isCurrencyField =
        (entity?.type as string) === EntityKey.currencyField;

      const rawValue = iStore
        ? iStore.getEntitiesValues()[fieldUuid]
        : formData[fieldUuid];

      // Currency form data may be stored as { value, currencyCode } object
      const isCurrencyObject =
        isCurrencyField &&
        typeof rawValue === "object" &&
        rawValue !== null &&
        "value" in rawValue;

      const baseResult = {
        key: fieldUuid,
        value: isCurrencyObject
          ? (rawValue as { value?: unknown }).value
          : rawValue,
      };

      if (isCurrencyField) {
        const savedCode = isCurrencyObject
          ? (rawValue as { currencyCode?: string }).currencyCode
          : undefined;

        return {
          ...baseResult,
          currencyCode: savedCode,
        };
      }

      return baseResult;
    },
    [formSchema, formData, store],
  );
  const getApplicantProfile = useCallback(() => {
    const localeLang = i18n.language ?? "en";

    if (!!selectedApplicant) {
      return {
        ...selectedApplicant,
        lang: selectedApplicant?.lang ?? localeLang,
        defaultOrgName: selectedApplicantUnit?.name,
      };
    }
    if (application) {
      return {
        ...applicant,
        lang: user?.lang ?? localeLang,
        defaultOrgName: unit?.name,
      };
    }
    return {
      ...user,
      lang: user?.lang ?? localeLang,
      defaultOrgName: unit?.name,
    };
  }, [
    applicant,
    application,
    unit,
    user,
    selectedApplicant,
    selectedApplicantUnit,
  ]);
  const getApplication = useCallback(() => {
    return {
      serialNumber: application?.serialNumber,
      appliedAt: application?.submittedAt,
      applicantId: application?.submittedBy,
    };
  }, [application]);
  const getCurrentNode = useCallback(() => {
    // TODO: waiting for design
    throw new Error("GetCurrentNode not implemented");
  }, []);
  const getMasterData = useCallback(
    (tableName: string, query?: MasterDataQuery): Record<string, unknown>[] => {
      const normalizedTableName = tableName?.trim();
      if (!normalizedTableName) {
        throw new Error("Master data table name is required");
      }

      const cache = store.get(expressionMasterDataCacheAtom);
      const cacheItem = cache[normalizedTableName];

      if (!cacheItem || cacheItem.status !== "loaded") {
        throw new Error(`Master data "${normalizedTableName}" is not loaded`);
      }

      let rows = [...(cacheItem.records as Record<string, unknown>[])];
      const knownFields = new Set<string>();
      rows.forEach((row) => {
        Object.keys(row).forEach((field) => knownFields.add(field));
      });

      const assertKnownField = (field: string, key: string) => {
        if (knownFields.size > 0 && !knownFields.has(field)) {
          throw new Error(
            `Unknown ${key} field "${field}" in master data "${normalizedTableName}"`,
          );
        }
      };

      if (query?.filter) {
        Object.keys(query.filter).forEach((field) => {
          assertKnownField(field, "filter");
        });

        rows = rows.filter((row) =>
          Object.entries(query.filter as Record<string, unknown>).every(
            ([field, expected]) => row[field] === expected,
          ),
        );
      }

      if (query?.sort?.field) {
        assertKnownField(query.sort.field, "sort");
        const direction = query.sort.order === "desc" ? -1 : 1;

        rows = [...rows].sort((a, b) => {
          const left = a[query.sort!.field];
          const right = b[query.sort!.field];

          if (left === right) return 0;
          if (isEmptyMasterDataValue(left)) return 1;
          if (isEmptyMasterDataValue(right)) return -1;

          if (typeof left === "number" && typeof right === "number") {
            return (left - right) * direction;
          }

          return String(left).localeCompare(String(right)) * direction;
        });
      }

      if (query?.select) {
        query.select.forEach((field) => {
          assertKnownField(field, "select");
        });

        rows = rows.map((row) =>
          query.select!.reduce<Record<string, unknown>>((acc, field) => {
            acc[field] = row[field];
            return acc;
          }, {}),
        );
      }

      if (query?.page !== undefined && !isPositiveInteger(query.page)) {
        throw new Error(`Invalid page "${query.page}". Page must be >= 1`);
      }

      if (query?.limit !== undefined && !isPositiveInteger(query.limit)) {
        throw new Error(`Invalid limit "${query.limit}". Limit must be >= 1`);
      }

      if (query?.page !== undefined && query.limit === undefined) {
        throw new Error("Limit is required when page is provided");
      }

      const limit = query?.limit;
      const page = query?.page ?? DEFAULT_PAGE;
      if (limit !== undefined) {
        const startIndex = (page - 1) * limit;
        rows = rows.slice(startIndex, startIndex + limit);
      }

      return rows;
    },
    [store],
  );

  const getFieldNameByIdentifier = useCallback(
    (identifier?: string) => {
      return getFieldNameByIdentifierFromSchema(
        formSchema.entities,
        identifier,
      );
    },
    [formSchema.entities],
  );

  const toNameKeyedFormData = useCallback(
    (rawFormData?: Record<string, unknown>): Record<string, unknown> => {
      return toNameKeyedFormDataFromSchema(formSchema.entities, rawFormData);
    },
    [formSchema.entities],
  );

  const executeCode = useCallback(
    (code: string): ((...args: unknown[]) => unknown) | unknown => {
      try {
        return executeCodeWithBindings(code, [
          { name: "getFormField", value: getFormField },
          { name: "getApplicantProfile", value: getApplicantProfile },
          { name: "getApplication", value: getApplication },
          { name: "getCurrentNode", value: getCurrentNode },
          { name: "getMasterData", value: getMasterData },
        ]);

        //   console.debug({ formData, formSchema });
        //   console.debug({ execute: { code: code, result: result() } });
      } catch (error) {
        console.debug({ error });
        throw new Error(
          `Syntax error: ${
            error instanceof Error ? error.message : JSON.stringify(error)
          }`,
        );
      }
    },
    [
      getApplication,
      getApplicantProfile,
      getCurrentNode,
      getFormField,
      getMasterData,
    ],
  );

  const compileReference = useCallback(
    (referenceCode: string) =>
      (
        executeCode(`function() { return ${referenceCode};}`) as () => unknown
      )(),
    [executeCode],
  );

  const compileExpression = useCallback(
    (expressionCode: string) =>
      (executeCode(`function() { ${expressionCode} }`) as () => unknown)(),
    [executeCode],
  );

  const getCompiledSchema = useCallback((): FormSchema => {
    isCompilingSchemaRef.current = true;
    try {
      const schemaClone = JSON.parse(JSON.stringify(formSchema)) as FormSchema;
      const resolveReferenceValue = (input: unknown) => {
        if (!input || typeof input !== "object" || !("isReference" in input)) {
          return input;
        }
        const ref = input as {
          isReference?: boolean;
          value?: unknown;
          reference?: unknown;
        };
        if (!ref.isReference || !!ref.value) {
          return input;
        }
        const expression =
          typeof ref.reference === "string"
            ? ref.reference.trim()
            : typeof ref.value === "string"
              ? ref.value.trim()
              : "";
        if (!expression) {
          return { isReference: false, value: undefined };
        }
        try {
          const result = compileReference(expression);
          // console.debug({ result });
          const resolvedValue =
            typeof result === "object" && !Array.isArray(result)
              ? JSON.stringify(result)
              : result;
          return {
            isReference: true,
            reference: expression,
            value: resolvedValue,
          };
        } catch (error) {
          console.warn("Failed to compile reference", error);
          return input;
        }
      };

      Object.values(schemaClone.entities).forEach((entity) => {
        const attributes = entity.attributes as Record<string, unknown>;
        if (attributes.label) {
          attributes.label = resolveReferenceValue(attributes.label);
        }
        if (attributes.placeholder) {
          attributes.placeholder = resolveReferenceValue(
            attributes.placeholder,
          );
        }
        if (attributes.defaultValue) {
          attributes.defaultValue = resolveReferenceValue(
            attributes.defaultValue,
          );
        }
        const datasource = attributes.datasourceType as
          | {
              type: "static";
              defaultValue?:
                | string
                | string[]
                | { isReference: boolean; value?: string | string[] };
            }
          | { type: "table" }
          | undefined;
        if (datasource?.type === "static" && datasource.defaultValue) {
          const resolvedDefault = resolveReferenceValue(
            datasource.defaultValue,
          ) as
            | { isReference: boolean; value?: string | string[] }
            | string
            | string[]
            | undefined;
          if (
            resolvedDefault &&
            typeof resolvedDefault === "object" &&
            "isReference" in resolvedDefault
          ) {
            datasource.defaultValue = {
              isReference: false,
              value: resolvedDefault.value,
            };
          } else {
            datasource.defaultValue = {
              isReference: false,
              value: resolvedDefault,
            };
          }
        }
      });

      // console.debug({ schemaClone });
      return schemaClone;
    } finally {
      isCompilingSchemaRef.current = false;
    }
  }, [compileReference, formSchema]);

  const executeValidator = useCallback(
    async ({
      validatorCode,
      value,
      isApi,
      currentField,
      formData,
      registryIds = [],
      formValidators = [],
      defaultErrorMessage,
    }: {
      validatorCode?: string;
      value: unknown;
      isApi?: boolean;
      currentField?: string;
      formData?: Record<string, unknown>;
      registryIds?: string[];
      formValidators?: ValidateFieldsRequest["formValidators"];
      defaultErrorMessage?: string;
    }): Promise<
      | boolean
      | {
          isValid: boolean;
          error?: string | null;
          errors?: Array<{ code: number; message: string }>;
        }
    > => {
      console.debug({ validatorCode, value, isApi });
      if (isApi) {
        if (!validateFields) {
          return {
            isValid: false,
            error: defaultErrorMessage ?? "Validation failed",
          };
        }
        try {
          const payload: ValidateFieldsRequest = {
            codes: validatorCode
              ? [
                  {
                    code: validatorCode,
                    errorMessage: defaultErrorMessage ?? "Validation failed",
                  },
                ]
              : [],
            registryIds,
            formValidators,
            formData: toNameKeyedFormData(formData),
          };

          if (currentField) {
            payload.currentField =
              getFieldNameByIdentifier(currentField) ?? currentField;
          }

          const response = await validateFields({
            ...payload,
          });

          const result = response.data;
          if (!result) {
            return {
              isValid: false,
              error: defaultErrorMessage ?? "Validation failed",
            };
          }
          if (result.isValid) {
            return { isValid: true };
          }
          return {
            isValid: false,
            errors: result.errors,
            error:
              result.errors?.[0]?.message ??
              result.message ??
              defaultErrorMessage ??
              "Validation failed",
          };
        } catch (error) {
          console.warn("Failed to execute API validator", error);
          return {
            isValid: false,
            error: defaultErrorMessage ?? "Validation failed",
          };
        }
      }

      if (!validatorCode) {
        return true;
      }

      try {
        return (
          executeCode(validatorCode) as (arg: unknown) =>
            | boolean
            | {
                isValid: boolean;
                error?: string | null;
                errors?: Array<{ code: number; message: string }>;
              }
        )(value);
      } catch (error) {
        console.warn("Failed to execute validator", error);
        return false;
      }
    },
    [executeCode, validateFields],
  );

  return {
    compileReference,
    compileExpression,
    getCompiledSchema,
    executeValidator,
    executeCode,
  };
}
