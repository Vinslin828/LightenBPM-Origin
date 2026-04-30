/**
 * Form Data Validator Service
 *
 * Validates that form_data submitted by users contains all fields referenced
 * in the flow definition, and that values can be coerced to the correct types.
 *
 * Features:
 * - Reference fields（getFormField） that exist in form_data
 * - Attempts type coercion when needed
 * - Returns coerced form_data on success
 */

import { Injectable } from '@nestjs/common';
import {
  ValidationResult,
  ValidationIssue,
  ErrorCode,
  FormSchema,
  FlowDefinition,
  FormFieldValueType,
  FORM_FIELD_VALUE_TYPES,
  FORM_FIELD_TYPES,
} from '../../types';
import { getReferencedFieldNames } from '../../shared/flow/flow-utils';
import {
  buildFieldIndex,
  getFormFieldType,
} from '../../shared/form/form-utils';
import {
  coerceToNumber,
  coerceToText,
  coerceToBoolean,
  coerceToTimestamp,
  coerceToStringArray,
  coerceOptionObjectsToStringArray,
  coerceToCurrency,
} from '../../shared/utils';

/**
 * Result of form data validation including coerced data
 */
export interface FormDataValidationResult extends ValidationResult {
  coercedData?: Record<string, any>;
}

type CoercerEntry = {
  coerce: (v: unknown) => unknown;
  buildErrorMessage: (fieldName: string, value: unknown) => string;
};

const cannotConvertTo =
  (typeName: string) =>
  (fieldName: string, value: unknown): string =>
    `Field '${fieldName}' cannot be converted to ${typeName} (value: ${JSON.stringify(value)})`;

/**
 * Dispatch table: value type -> how to coerce the raw value and how to phrase
 * the error if coercion fails. RADIO/DROPDOWN/TEXT all share the same string
 * coercer but stay as distinct keys so future per-type validation (e.g.
 * "value must be in options") can hook in without rewriting the dispatch.
 */
const COERCERS: Record<FormFieldValueType, CoercerEntry> = {
  [FORM_FIELD_VALUE_TYPES.NUMBER]: {
    coerce: coerceToNumber,
    buildErrorMessage: cannotConvertTo('number'),
  },
  [FORM_FIELD_VALUE_TYPES.TEXT]: {
    coerce: coerceToText,
    buildErrorMessage: cannotConvertTo('string'),
  },
  [FORM_FIELD_VALUE_TYPES.RADIO]: {
    coerce: coerceToText,
    buildErrorMessage: cannotConvertTo('string'),
  },
  [FORM_FIELD_VALUE_TYPES.DROPDOWN]: {
    coerce: coerceToText,
    buildErrorMessage: cannotConvertTo('string'),
  },
  [FORM_FIELD_VALUE_TYPES.CHECKBOX]: {
    coerce: coerceOptionObjectsToStringArray,
    buildErrorMessage: cannotConvertTo('string array'),
  },
  [FORM_FIELD_VALUE_TYPES.DROPDOWN_MULTIPLE]: {
    coerce: coerceToStringArray,
    buildErrorMessage: cannotConvertTo('string array'),
  },
  [FORM_FIELD_VALUE_TYPES.BOOLEAN]: {
    coerce: coerceToBoolean,
    buildErrorMessage: cannotConvertTo('boolean'),
  },
  [FORM_FIELD_VALUE_TYPES.CURRENCY]: {
    coerce: coerceToCurrency,
    buildErrorMessage: (fieldName, value) =>
      `Field '${fieldName}' must be a currency object { value: number, currencyCode: string } (value: ${JSON.stringify(value)})`,
  },
  [FORM_FIELD_VALUE_TYPES.DATE]: {
    coerce: coerceToTimestamp,
    buildErrorMessage: (fieldName, value) =>
      `Field '${fieldName}' must be a valid Unix timestamp (non-negative integer) (value: ${JSON.stringify(value)})`,
  },
};

@Injectable()
export class FormDataValidatorService {
  /**
   * Validate and coerce form data based on form schema and flow definition.
   *
   * @param requiredFieldNames Set of field names that are required (derived from
   *   start node `component_rules` by the caller). A field is reported as missing
   *   only if it is referenced by the flow AND listed in this set.
   */
  validateAndCoerceFormData(
    flowDefinition: FlowDefinition,
    formSchema: FormSchema,
    formData: Record<string, any>,
    requiredFieldNames: Set<string>,
  ): FormDataValidationResult {
    const errors: ValidationIssue[] = [];
    const coercedData: Record<string, any> = { ...formData };

    // Build a name -> field index once so lookups are O(1) for the rest
    // of this call. Rebuilt per request; not cached across requests.
    const fieldByName = buildFieldIndex(formSchema);

    const referencedFieldNames = new Set(
      getReferencedFieldNames(flowDefinition),
    );

    // Single pass over the union of referenced fields and form_data keys.
    const allFieldNames = new Set<string>([
      ...referencedFieldNames,
      ...Object.keys(formData),
    ]);

    for (const fieldName of allFieldNames) {
      const isReferenced = referencedFieldNames.has(fieldName);
      const isProvided = fieldName in formData;

      if (!isProvided) {
        // Only referenced-but-missing fields reach here. Report when required.
        if (requiredFieldNames.has(fieldName)) {
          errors.push({
            code: ErrorCode.FORM_DATA_FIELD_MISSING,
            message: `Field '${fieldName}' is required by the workflow but not provided in form data`,
          });
        }
        continue;
      }

      const field = fieldByName.get(fieldName);
      if (!field) {
        // Referenced fields are guaranteed to exist in schema by an earlier
        // workflow-level validation, so this only fires for extra form_data
        // keys that have no matching schema entry.
        if (!isReferenced) {
          errors.push({
            code: ErrorCode.FORM_DATA_FIELD_NOT_IN_SCHEMA,
            message: `Field '${fieldName}' is not defined in form schema`,
          });
        }
        continue;
      }

      // Expression component values are computed; null/undefined is a valid
      // result when the underlying expression has no input. Pass it through
      // without running the TEXT coercer (which would reject null).
      if (
        field.type === FORM_FIELD_TYPES.EXPRESSION &&
        (formData[fieldName] === null || formData[fieldName] === undefined)
      ) {
        coercedData[fieldName] = null;
        continue;
      }

      const expectedType = getFormFieldType(field);
      this.validateAndCoerceField(
        fieldName,
        formData[fieldName],
        expectedType,
        coercedData,
        errors,
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      coercedData: errors.length === 0 ? coercedData : undefined,
    };
  }

  /**
   * Validate and coerce a single field value via the COERCERS dispatch table.
   */
  private validateAndCoerceField(
    fieldName: string,
    value: unknown,
    expectedType: FormFieldValueType,
    coercedData: Record<string, any>,
    errors: ValidationIssue[],
  ): void {
    const { coerce, buildErrorMessage } = COERCERS[expectedType];
    const coerced = coerce(value);

    if (coerced === null) {
      errors.push({
        code: ErrorCode.FORM_DATA_TYPE_CONVERSION_FAILED,
        message: buildErrorMessage(fieldName, value),
      });
      return;
    }

    coercedData[fieldName] = coerced;
  }
}
