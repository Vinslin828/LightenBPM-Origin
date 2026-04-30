import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useStore } from "jotai";
import { createEntityComponent } from "@coltorapps/builder-react";

import { Label } from "@/components/ui/label";
import { Select } from "@ui/select";
import { SearchableSelect } from "@ui/select/searchable-select";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import {
  normalizeMultiSelectInput,
  useSelectFieldOptions,
  useSelectFieldResolvedValues,
} from "@/hooks/useFormBuilder";
import { useFieldValidationState } from "@/hooks/useFieldValidationState";
import { interpreterStoreAtom } from "@/store";

import { selectFieldEntity } from "./definition";
import { DatasourceValue } from "../../attributes/datasource/component";

export const SelectFieldEntity = createEntityComponent(
  selectFieldEntity,
  function SelectFieldEntity(props) {
    const id = useId();
    const store = useStore();
    const { localError, isValidating, validateAndCommit } =
      useFieldValidationState(props.entity.id);

    const datasource = props.entity.attributes
      .datasourceType as DatasourceValue;
    const multipleSelection =
      props.entity.attributes.selectAdvancedSetting?.multipleSelection ?? false;
    const searchInOptions =
      props.entity.attributes.selectAdvancedSetting?.searchInOptions ?? false;

    const resolveFieldIdByName = useCallback(
      (name: string, iStore?: any): string | undefined => {
        if (!iStore) return undefined;
        const entities = iStore?.schema?.entities ?? {};

        return (
          Object.entries(entities).find(
            ([, entity]) =>
              (entity as { attributes?: { name?: string } }).attributes
                ?.name === name,
          )?.[0] ??
          (Object.prototype.hasOwnProperty.call(entities, name)
            ? name
            : undefined)
        );
      },
      [],
    );

    const getFormFieldValueByName = useCallback(
      (name: string): unknown => {
        const iStore = store.get(interpreterStoreAtom);
        if (!iStore) return undefined;

        const values = iStore.getEntitiesValues?.() ?? {};

        if (Object.prototype.hasOwnProperty.call(values, name)) {
          return values[name];
        }

        const fieldId = resolveFieldIdByName(name, iStore);
        if (!fieldId) return undefined;
        return values[fieldId];
      },
      [resolveFieldIdByName, store],
    );

    const {
      options,
      isDynamicLoading,
      dynamicError,
      watchedFilterFieldValue,
      hasUiFilter,
      watchedFilterFieldName,
    } = useSelectFieldOptions({
      datasource,
      fieldName: props.entity.attributes.name,
      getFormFieldValueByName,
    });

    const prevWatchedFilterValueRef = useRef<unknown>(watchedFilterFieldValue);
    const prevWatchedFilterFieldNameRef = useRef<string | undefined>(
      watchedFilterFieldName,
    );

    useEffect(() => {
      if (prevWatchedFilterFieldNameRef.current !== watchedFilterFieldName) {
        prevWatchedFilterFieldNameRef.current = watchedFilterFieldName;
        prevWatchedFilterValueRef.current = watchedFilterFieldValue;
        return;
      }

      const prev = prevWatchedFilterValueRef.current;
      prevWatchedFilterValueRef.current = watchedFilterFieldValue;

      if (!hasUiFilter) return;
      if (prev === undefined) return;
      if (Object.is(prev, watchedFilterFieldValue)) return;
      if (props.entity.attributes.readonly) return;

      if (multipleSelection) {
        if (
          Array.isArray(props.entity.value) &&
          props.entity.value.length === 0
        )
          return;
        props.setValue([]);
        return;
      }

      if (props.entity.value === undefined || props.entity.value === "") return;
      props.setValue(undefined);
    }, [
      hasUiFilter,
      multipleSelection,
      props.entity.attributes.readonly,
      props.entity.value,
      props.setValue,
      watchedFilterFieldName,
      watchedFilterFieldValue,
    ]);

    const { singleValue, multipleValue } = useSelectFieldResolvedValues({
      datasource,
      entityValue: props.entity.value,
    });

    const placeholder =
      props.entity.attributes.placeholder || "Select an option";
    const basePlaceholder =
      typeof placeholder === "string" ? placeholder : placeholder.value;
    const effectivePlaceholder =
      datasource?.type === "dynamic" && isDynamicLoading
        ? "Loading options..."
        : basePlaceholder;

    const schemaError = formatError(props.entity.value, props.entity.error)
      ?._errors?.[0];
    const hasError = Boolean(localError || schemaError);
    const errorMessage = localError || schemaError;

    const dynamicErrorMessage =
      datasource?.type === "dynamic" && dynamicError
        ? "Failed to load options"
        : undefined;

    const handleValidation = async (nextValue?: string | string[]) => {
      if (props.entity.attributes.readonly) return;
      await validateAndCommit({
        value: nextValue,
        setValue: props.setValue,
        validator: props.entity.attributes.validator,
        isRequiredInvalid: (value) =>
          Boolean(
            props.entity.attributes.required &&
              (!value || (Array.isArray(value) && value.length === 0)),
          ),
        requiredMessage: "This field is required",
        onValidationSuccess: props.resetError,
      });
    };

    const handleMultiValueChange = async (
      vals: string | string[] | undefined,
    ) => {
      const nextArray = normalizeMultiSelectInput(vals);
      const nextValue = nextArray.length ? nextArray : [];
      void handleValidation(nextValue);
    };

    const handleSingleValueChange = async (val?: string) => {
      const nextValue = val ? String(val) : undefined;
      void handleValidation(nextValue);
    };

    const isReadonly = Boolean(props.entity.attributes.readonly);
    const isDisabled =
      Boolean(props.entity.attributes.disabled) ||
      (datasource?.type === "dynamic" && isDynamicLoading);

    return (
      <div
        data-multiple-selection={multipleSelection}
        data-search-in-options={searchInOptions}
      >
        <Label htmlFor={id} aria-required={props.entity.attributes.required}>
          {props.entity.attributes.label.value || props.entity.attributes.name}
        </Label>

        {multipleSelection ? (
          searchInOptions ? (
            <SearchableSelect
              mode="multiple"
              options={options}
              value={multipleValue}
              disabled={isDisabled}
              readonly={isReadonly}
              placeholder={effectivePlaceholder}
              hasError={hasError}
              onChange={(vals) => {
                void handleMultiValueChange(vals);
              }}
            />
          ) : (
            <Select
              mode="multiple"
              options={options}
              value={multipleValue}
              disabled={isDisabled}
              readonly={isReadonly}
              placeholder={effectivePlaceholder}
              hasError={hasError}
              onChange={(vals) => {
                void handleMultiValueChange(vals);
              }}
            />
          )
        ) : searchInOptions ? (
          <SearchableSelect
            mode="single"
            options={options}
            value={singleValue}
            disabled={isDisabled}
            readonly={isReadonly}
            placeholder={effectivePlaceholder}
            hasError={hasError}
            onChange={(val) => {
              void handleSingleValueChange(val);
            }}
          />
        ) : (
          <Select
            mode="single"
            options={options}
            value={singleValue}
            disabled={isDisabled}
            readonly={isReadonly}
            placeholder={effectivePlaceholder}
            hasError={hasError}
            onChange={(val) => {
              void handleSingleValueChange(val);
            }}
          />
        )}

        {isValidating ? (
          <p className="text-sm mt-1 text-secondary-text">
            Running validation...
          </p>
        ) : errorMessage ? (
          <ValidationError>{errorMessage}</ValidationError>
        ) : null}
        {!errorMessage && dynamicErrorMessage && (
          <ValidationError>{dynamicErrorMessage}</ValidationError>
        )}
      </div>
    );
  },
);
