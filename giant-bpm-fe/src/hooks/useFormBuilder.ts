import { interpreterStoreAtom } from "@/store";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { useBpmDatasetRecords } from "./useMasterData";
import { useCodeHelper } from "./useCode/useCodeHelper";
import type { SelectOption } from "@ui/select";
import type { Operator } from "@/types/flow";
import type { FormSchema } from "@/types/domain";
import type { DatasourceValue } from "@/components/form/attributes/datasource/component";
import type {
  DynamicFilterExpression,
  DynamicFilterUi,
  DynamicValue,
} from "@/components/form/attributes/datasource/dynamic-setting";
import type { StaticValue } from "@/components/form/attributes/datasource/static-setting";

const resolveFieldIdByName = (fieldName: string, iStore: any) => {
  const entities = iStore?.schema?.entities ?? {};

  return (
    Object.entries(entities).find(
      ([, entity]) =>
        (entity as { attributes?: { name?: string } }).attributes?.name ===
        fieldName,
    )?.[0] ??
    (Object.prototype.hasOwnProperty.call(entities, fieldName)
      ? fieldName
      : undefined)
  );
};

export function useSubscribeField(fieldName?: string): unknown {
  const iStore = useAtomValue(interpreterStoreAtom);
  const normalizedFieldName = useMemo(() => fieldName?.trim(), [fieldName]);

  const [value, setValue] = useState<unknown>(() => {
    if (!normalizedFieldName || !iStore) return undefined;
    const fieldId = resolveFieldIdByName(normalizedFieldName, iStore);
    const values = iStore.getEntitiesValues?.() ?? {};
    if (fieldId && Object.prototype.hasOwnProperty.call(values, fieldId))
      return values[fieldId];
    if (Object.prototype.hasOwnProperty.call(values, normalizedFieldName))
      return values[normalizedFieldName];
    return undefined;
  });

  useEffect(() => {
    if (!normalizedFieldName || !iStore) {
      setValue(undefined);
      return;
    }

    const fieldId = resolveFieldIdByName(normalizedFieldName, iStore);
    const getCurrentValue = () => {
      const values = iStore.getEntitiesValues?.() ?? {};

      if (fieldId && Object.prototype.hasOwnProperty.call(values, fieldId)) {
        return values[fieldId];
      }

      if (Object.prototype.hasOwnProperty.call(values, normalizedFieldName)) {
        return values[normalizedFieldName];
      }

      return undefined;
    };

    setValue(getCurrentValue());

    const unsubscribe = iStore.subscribe((_data: unknown, events: any[]) => {
      const shouldUpdate =
        !fieldId ||
        events.some(
          (event) =>
            event?.name === "EntityValueUpdated" &&
            event?.payload?.entityId === fieldId,
        );

      if (shouldUpdate) {
        setValue(getCurrentValue());
      }
    });

    return unsubscribe;
  }, [iStore, normalizedFieldName]);

  return value;
}

const isUiFilter = (
  filter: DynamicValue["filter"],
): filter is DynamicFilterUi =>
  Boolean(filter && "columnKey" in filter && "formField" in filter);

const isExpressionFilter = (
  filter: DynamicValue["filter"],
): filter is DynamicFilterExpression =>
  Boolean(filter && "expression" in filter);

const parseStringArray = (value: string): string[] | undefined => {
  const trimmed = value.trim();
  if (!(trimmed.startsWith("[") && trimmed.endsWith("]"))) return undefined;

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return undefined;
  }

  return undefined;
};

const normalizeDefaultValue = (
  defaultValue: StaticValue["defaultValue"] | undefined,
): string | string[] | undefined => {
  const raw =
    defaultValue &&
    typeof defaultValue === "object" &&
    "isReference" in defaultValue
      ? defaultValue.value
      : defaultValue;

  if (typeof raw === "string") return parseStringArray(raw) ?? raw;
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string");
  }
  return undefined;
};

const resolveSingleValue = (
  entityValue: unknown,
  normalizedDefault: string | string[] | undefined,
): string => {
  if (typeof entityValue === "string") return entityValue;

  if (Array.isArray(entityValue)) {
    const first = entityValue[0];
    if (typeof first === "string") return first;
    if (Array.isArray(normalizedDefault)) return normalizedDefault[0] ?? "";
    return typeof normalizedDefault === "string" ? normalizedDefault : "";
  }

  if (Array.isArray(normalizedDefault)) return normalizedDefault[0] ?? "";
  return typeof normalizedDefault === "string" ? normalizedDefault : "";
};

const resolveMultipleValue = (
  entityValue: unknown,
  normalizedDefault: string | string[] | undefined,
): string[] => {
  if (Array.isArray(entityValue)) {
    return entityValue.filter(
      (item): item is string => typeof item === "string",
    );
  }

  if (typeof entityValue === "string") {
    return (
      parseStringArray(entityValue) ??
      (entityValue.trim() ? [entityValue.trim()] : [])
    );
  }

  if (Array.isArray(normalizedDefault)) return normalizedDefault;
  return typeof normalizedDefault === "string" && normalizedDefault
    ? [normalizedDefault]
    : [];
};

const compareWithOperator = (
  operator: Operator | undefined,
  left: unknown,
  right: unknown,
): boolean => {
  if (!operator) return true;

  const leftNum = Number(left);
  const rightNum = Number(right);
  const numeric = Number.isFinite(leftNum) && Number.isFinite(rightNum);

  switch (operator) {
    case ">":
      return numeric ? leftNum > rightNum : String(left) > String(right);
    case "<":
      return numeric ? leftNum < rightNum : String(left) < String(right);
    case ">=":
      return numeric ? leftNum >= rightNum : String(left) >= String(right);
    case "<=":
      return numeric ? leftNum <= rightNum : String(left) <= String(right);
    case "==":
    case "equals":
      return String(left ?? "") === String(right ?? "");
    case "!=":
    case "not_equals":
      return String(left ?? "") !== String(right ?? "");
    case "contains":
      return String(left ?? "").includes(String(right ?? ""));
    case "not_contains":
      return !String(left ?? "").includes(String(right ?? ""));
    default:
      return false;
  }
};

const mapRecordsToOptions = (
  records: Record<string, unknown>[],
  labelKey: string,
  valueKey: string,
): SelectOption<string>[] => {
  const seen = new Set<string>();
  const options: SelectOption<string>[] = [];

  records.forEach((row) => {
    const value = String(row[valueKey] ?? "").trim();
    if (!value || seen.has(value)) return;
    seen.add(value);
    options.push({ label: String(row[labelKey] ?? ""), value, key: value });
  });

  return options;
};

const isEmptyFilterValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
};

export const normalizeMultiSelectInput = (
  value: string | string[] | undefined,
): string[] => {
  if (Array.isArray(value)) return value.filter((item) => item !== "");
  return value ? [value] : [];
};

export function useSelectFieldResolvedValues(params: {
  datasource: DatasourceValue | undefined;
  entityValue: unknown;
}) {
  const { datasource, entityValue } = params;
  const normalizedDefault = useMemo(
    () => normalizeDefaultValue(datasource?.defaultValue),
    [datasource],
  );

  const singleValue = useMemo(
    () => resolveSingleValue(entityValue, normalizedDefault),
    [entityValue, normalizedDefault],
  );
  const multipleValue = useMemo(
    () => resolveMultipleValue(entityValue, normalizedDefault),
    [entityValue, normalizedDefault],
  );

  return { singleValue, multipleValue };
}

export function useSelectFieldOptions(params: {
  datasource: DatasourceValue | undefined;
  fieldName: string;
  getFormFieldValueByName: (name: string) => unknown;
}) {
  const { datasource, fieldName, getFormFieldValueByName } = params;
  const iStore = useAtomValue(interpreterStoreAtom);
  const dynamicDatasource =
    datasource?.type === "dynamic" ? datasource : undefined;
  const schemaForCodeHelper = (iStore?.schema as FormSchema | undefined) ?? {
    root: [],
    entities: {},
  };
  const { compileExpression } = useCodeHelper({
    formSchema: schemaForCodeHelper,
    formData: iStore?.getData?.() ?? {},
  });

  const tableKey = dynamicDatasource?.table?.tableKey?.trim();
  const labelKey = dynamicDatasource?.table?.labelKey?.trim();
  const valueKey = dynamicDatasource?.table?.valueKey?.trim();
  const isDynamicReady = Boolean(tableKey && labelKey && valueKey);

  const watchedFilterFieldName =
    dynamicDatasource?.filter && isUiFilter(dynamicDatasource.filter)
      ? dynamicDatasource.filter.formField?.trim()
      : undefined;
  const watchedFilterFieldValue = useSubscribeField(watchedFilterFieldName);
  const hasUiFilter =
    Boolean(dynamicDatasource?.filter) &&
    isUiFilter(dynamicDatasource?.filter) &&
    Boolean(dynamicDatasource?.filter?.formField?.trim());

  const evaluateFilterExpression = useCallback(
    (expression: string): boolean => {
      const trimmed = expression.trim();
      if (!trimmed) return true;

      try {
        if (/^function\s+condition\s*\(/.test(trimmed)) {
          return Boolean(compileExpression(`${trimmed}\nreturn condition();`));
        }
        return Boolean(compileExpression(`return Boolean(${trimmed});`));
      } catch (error) {
        console.debug("[useSelectFieldOptions] expression filter error", {
          fieldName,
          expression: trimmed,
          error,
        });
        return false;
      }
    },
    [compileExpression, fieldName],
  );

  const dynamicQueryParams = useMemo(() => {
    if (!isDynamicReady || !labelKey || !valueKey) return undefined;

    const filterColumn =
      dynamicDatasource?.filter && isUiFilter(dynamicDatasource.filter)
        ? dynamicDatasource.filter.columnKey
        : undefined;

    const select = Array.from(
      new Set(
        [labelKey, valueKey, filterColumn].filter((v): v is string =>
          Boolean(v),
        ),
      ),
    );

    return {
      limit: 1000,
      sortBy: dynamicDatasource?.sorter?.columnKey,
      sortOrder: dynamicDatasource?.sorter?.order,
      select,
    };
  }, [
    dynamicDatasource?.filter,
    dynamicDatasource?.sorter?.columnKey,
    dynamicDatasource?.sorter?.order,
    isDynamicReady,
    labelKey,
    valueKey,
  ]);

  const {
    records: dynamicRecords,
    isLoading: isDynamicLoading,
    error: dynamicError,
  } = useBpmDatasetRecords(
    isDynamicReady && tableKey ? tableKey : undefined,
    dynamicQueryParams,
  );

  const dynamicOptions = useMemo<SelectOption<string>[]>(() => {
    if (!isDynamicReady || !labelKey || !valueKey) return [];
    const expression = isExpressionFilter(dynamicDatasource?.filter)
      ? (dynamicDatasource!.filter.expression?.trim() ?? "")
      : undefined;
    const expressionMatched =
      expression === undefined
        ? undefined
        : evaluateFilterExpression(expression);
    if (expression !== undefined) {
      console.debug("[useSelectFieldOptions] expression filter evaluate", {
        fieldName,
        expression,
        matched: expressionMatched,
      });
    }

    const filteredRows = (dynamicRecords as Record<string, unknown>[]).filter(
      (row) => {
        const filter = dynamicDatasource?.filter;
        if (!filter) {
          return true;
        }

        if (
          isUiFilter(filter) &&
          !isEmptyFilterValue(watchedFilterFieldValue)
        ) {
          if (!filter.columnKey || !filter.formField) return true;
          const formValue = watchedFilterFieldValue;
          if (isEmptyFilterValue(formValue)) return true;
          const rowValue = row[filter.columnKey];
          const matched = compareWithOperator(
            filter.logic,
            rowValue,
            formValue,
          );

          return matched;
        }

        if (isExpressionFilter(filter)) {
          return expressionMatched ?? false;
        }

        return true;
      },
    );

    const mappedOptions = mapRecordsToOptions(filteredRows, labelKey, valueKey);

    return mappedOptions;
  }, [
    dynamicDatasource?.filter,
    dynamicRecords,
    evaluateFilterExpression,
    fieldName,
    isDynamicReady,
    labelKey,
    valueKey,
    watchedFilterFieldName,
    watchedFilterFieldValue,
  ]);

  const options: SelectOption<string>[] =
    datasource?.type === "static"
      ? (datasource.options ?? [])
      : datasource?.type === "dynamic"
        ? dynamicOptions
        : [];

  return {
    options,
    isDynamicLoading,
    dynamicError,
    dynamicOptions,
    watchedFilterFieldName,
    watchedFilterFieldValue,
    hasUiFilter,
  };
}
