/**
 * form_schema / form_data Utilities
 */

import {
  FormSchema,
  FormFieldEntity,
  FormFieldType,
  FormFieldValueType,
  FORM_FIELD_TYPES,
  FORM_FIELD_VALUE_TYPES,
  ComparisonOperator,
  NUMERIC_OPERATORS,
  STRING_OPERATORS,
  ReferenceValue,
} from '../../types';

/**
 * Static mapping from component type to value type.
 * Only covers types whose value type does not depend on attributes.
 * Dynamic types (INPUT, DROPDOWN) are handled explicitly in getFormFieldType.
 */
const STATIC_FIELD_VALUE_TYPE_MAP: Partial<
  Record<FormFieldType, FormFieldValueType>
> = {
  [FORM_FIELD_TYPES.NUMBER]: FORM_FIELD_VALUE_TYPES.NUMBER,
  [FORM_FIELD_TYPES.TEXT]: FORM_FIELD_VALUE_TYPES.TEXT,
  [FORM_FIELD_TYPES.DATE]: FORM_FIELD_VALUE_TYPES.DATE,
  [FORM_FIELD_TYPES.RADIO]: FORM_FIELD_VALUE_TYPES.RADIO,
  [FORM_FIELD_TYPES.CHECKBOX]: FORM_FIELD_VALUE_TYPES.CHECKBOX,
  [FORM_FIELD_TYPES.CURRENCY]: FORM_FIELD_VALUE_TYPES.CURRENCY,
  [FORM_FIELD_TYPES.TOGGLE]: FORM_FIELD_VALUE_TYPES.BOOLEAN,
  [FORM_FIELD_TYPES.API_FETCH]: FORM_FIELD_VALUE_TYPES.TEXT,
};

/**
 * Find a form field by name in the form schema
 *
 * @param formSchema - The form schema to search in
 * @param fieldName - The field name to search for (matches entity.attributes.name)
 * @returns The field entity if found, null otherwise
 */
export function findFieldByName(
  formSchema: FormSchema,
  fieldName: string,
): FormFieldEntity | null {
  for (const entity of Object.values(formSchema?.entities || {})) {
    if (entity.attributes.name === fieldName) {
      return entity;
    }
  }
  return null;
}

/**
 * Build a name -> field entity lookup for a form schema.
 *
 * Use this when you need to look up more than one field from the same schema
 * in a single operation. `findFieldByName` is O(N) per call; building this
 * index once is O(N), then lookups are O(1). Rebuild per request — this is
 * not a cross-request cache.
 */
export function buildFieldIndex(
  formSchema: FormSchema,
): Map<string, FormFieldEntity> {
  const index = new Map<string, FormFieldEntity>();
  for (const entity of Object.values(formSchema?.entities || {})) {
    index.set(entity.attributes.name, entity);
  }
  return index;
}

/**
 * Find all form field names that are referenced but don't exist in the form schema
 *
 * @param fieldNames - Array of field names to check
 * @param formSchema - The form schema to validate against
 * @returns Array of field names that don't exist in the schema (empty if all exist)
 */
export function findMissingFieldsInSchema(
  fieldNames: string[],
  formSchema: FormSchema,
): string[] {
  const fieldIndex = buildFieldIndex(formSchema);
  const missingFields: string[] = [];
  const checkedFields = new Set<string>();

  for (const fieldName of fieldNames) {
    if (checkedFields.has(fieldName)) {
      continue;
    }
    checkedFields.add(fieldName);

    if (!fieldIndex.has(fieldName)) {
      missingFields.push(fieldName);
    }
  }

  return missingFields;
}

/**
 * Get the effective type of a form field for validation and operations
 * Resolves 'input' type to either 'number' or 'text' based on inputType
 * @param field - The form field entity
 * @returns The effective type
 */
export function getFormFieldType(field: FormFieldEntity): FormFieldValueType {
  // Dynamic cases: value type depends on attributes, not just component type
  if (field.type === FORM_FIELD_TYPES.INPUT) {
    return field.attributes.inputType === 'number'
      ? FORM_FIELD_VALUE_TYPES.NUMBER
      : FORM_FIELD_VALUE_TYPES.TEXT;
  }

  if (field.type === FORM_FIELD_TYPES.DROPDOWN) {
    return field.attributes.selectAdvancedSetting?.multipleSelection === true
      ? FORM_FIELD_VALUE_TYPES.DROPDOWN_MULTIPLE
      : FORM_FIELD_VALUE_TYPES.DROPDOWN;
  }

  return STATIC_FIELD_VALUE_TYPE_MAP[field.type] ?? FORM_FIELD_VALUE_TYPES.TEXT;
}

/**
 * Check if a comparison operator is compatible with a form field type
 * @param operator - The comparison operator
 * @param field - The form field entity
 * @returns True if the operator can be used with this field type
 */
export function isOperatorCompatibleWithFormField(
  operator: ComparisonOperator,
  field: FormFieldEntity,
): boolean {
  const fieldType = getFormFieldType(field);

  // Currency holds both a numeric `value` and a string `currencyCode`, and the
  // validator cannot tell which property a condition accesses, so we allow
  // both numeric and string operators. Writing `.value CONTAINS "5"` is
  // nonsensical but runtime won't crash — same pragmatic loophole we already
  // have for other multi-shape fields.
  if (fieldType === FORM_FIELD_VALUE_TYPES.CURRENCY) {
    return (
      NUMERIC_OPERATORS.includes(operator) ||
      STRING_OPERATORS.includes(operator)
    );
  }

  // Numeric operators work with numeric and date fields (date is stored as Unix timestamp)
  if (NUMERIC_OPERATORS.includes(operator)) {
    return (
      fieldType === FORM_FIELD_VALUE_TYPES.NUMBER ||
      fieldType === FORM_FIELD_VALUE_TYPES.DATE
    );
  }

  // String operators only work with text fields
  if (STRING_OPERATORS.includes(operator)) {
    return fieldType === FORM_FIELD_VALUE_TYPES.TEXT;
  }

  // Unknown operator - default to incompatible
  return false;
}

/**
 * Type guard to check if a value is a ReferenceValue
 * Used for form schema attributes (defaultValue, placeholder, label)
 * that can be either static or reference expressions
 *
 * @param value - The value to check
 * @returns True if value is { isReference: true, reference: "..." }
 */
export function isReferenceValue(value: unknown): value is ReferenceValue {
  return (
    value !== null &&
    typeof value === 'object' &&
    'isReference' in value &&
    (value as ReferenceValue).isReference === true &&
    typeof (value as ReferenceValue).reference === 'string'
  );
}
