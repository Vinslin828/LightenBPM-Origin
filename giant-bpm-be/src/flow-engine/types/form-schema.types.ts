/**
 * Form Schema Types
 *
 * Represents the structure of a form schema used for validation.
 * Form fields can be referenced in flow definitions using function syntax:
 * getFormField("fieldName").value
 */

// Form field type constants (schema level)
export const FORM_FIELD_TYPES = {
  INPUT: 'input',
  TEXT: 'text',
  NUMBER: 'number',
  DATE: 'date',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  DROPDOWN: 'dropdown',
  CURRENCY: 'currency',
  TOGGLE: 'toggle',
  API_FETCH: 'api-fetch',
  EXPRESSION: 'expression',
  CONTAINER: 'container',
} as const;

export type FormFieldType =
  | typeof FORM_FIELD_TYPES.INPUT
  | typeof FORM_FIELD_TYPES.TEXT
  | typeof FORM_FIELD_TYPES.NUMBER
  | typeof FORM_FIELD_TYPES.DATE
  | typeof FORM_FIELD_TYPES.RADIO
  | typeof FORM_FIELD_TYPES.CHECKBOX
  | typeof FORM_FIELD_TYPES.DROPDOWN
  | typeof FORM_FIELD_TYPES.CURRENCY
  | typeof FORM_FIELD_TYPES.TOGGLE
  | typeof FORM_FIELD_TYPES.API_FETCH
  | typeof FORM_FIELD_TYPES.EXPRESSION
  | typeof FORM_FIELD_TYPES.CONTAINER;

// Input type constants
export const INPUT_TYPES = {
  TEXT: 'text',
  NUMBER: 'number',
} as const;

export type InputType = typeof INPUT_TYPES.TEXT | typeof INPUT_TYPES.NUMBER;

// Form field value type constants (effective type after resolving 'input' type)
export const FORM_FIELD_VALUE_TYPES = {
  NUMBER: 'number',
  TEXT: 'text',
  DATE: 'date',
  RADIO: 'radio',
  CHECKBOX: 'checkbox',
  DROPDOWN: 'dropdown',
  DROPDOWN_MULTIPLE: 'dropdown-multiple',
  BOOLEAN: 'boolean',
  CURRENCY: 'currency',
} as const;

export type FormFieldValueType =
  | typeof FORM_FIELD_VALUE_TYPES.NUMBER
  | typeof FORM_FIELD_VALUE_TYPES.TEXT
  | typeof FORM_FIELD_VALUE_TYPES.DATE
  | typeof FORM_FIELD_VALUE_TYPES.RADIO
  | typeof FORM_FIELD_VALUE_TYPES.CHECKBOX
  | typeof FORM_FIELD_VALUE_TYPES.DROPDOWN
  | typeof FORM_FIELD_VALUE_TYPES.DROPDOWN_MULTIPLE
  | typeof FORM_FIELD_VALUE_TYPES.BOOLEAN
  | typeof FORM_FIELD_VALUE_TYPES.CURRENCY;

/**
 * Runtime shape of a currency field value in form_data.
 * Stored verbatim; not coerced to a plain number.
 */
export interface CurrencyValue {
  value: number;
  currencyCode: string;
}

export interface SelectAdvancedSetting {
  multipleSelection?: boolean;
  searchInOptions?: boolean;
}

/**
 * Reference Value - represents a dynamic reference that needs to be resolved
 * When isReference is true, reference contains an expression to be executed
 * After resolution, value contains the resolved result
 * Example: { isReference: true, reference: "getApplicantProfile().jobGrade", value: "L3" }
 */
export interface ReferenceValue {
  isReference: true;
  reference: string; // Expression like "getApplicantProfile().jobGrade"
  value?: unknown; // Resolved value (added by resolver, undefined if not resolved)
}

/**
 * A value that can be either a static value or a dynamic reference
 */
export type ResolvableValue<T = unknown> = T | ReferenceValue;

// =============================================================================
// Field Validator Types
// =============================================================================

/**
 * Component-level inline validator
 */
export interface ComponentValidator {
  code?: string;
  errorMessage?: string;
  enableApi?: boolean;
}

/**
 * Registry-based validator reference
 */
export interface RegistryValidator {
  validatorId?: string;
  enableApi?: boolean;
}

/**
 * Field validator configuration
 */
export interface FieldValidator {
  required?: boolean;
  componentValidator?: ComponentValidator;
  registryValidators?: RegistryValidator[];
}

// =============================================================================
// Form-level Validation Types
// =============================================================================

/**
 * Form-level validator
 */
export interface FormValidator {
  key?: string;
  code?: string;
  description?: string;
  errorMessage?: string;
  listenFieldIds?: string[];
  enableApi?: boolean;
}

/**
 * Form-level validation configuration
 */
export interface FormValidation {
  required?: boolean;
  validators?: FormValidator[];
}

// =============================================================================
// Form Field Types
// =============================================================================

export interface FormFieldAttributes {
  name: string; // Field name used in references like getFormField("fieldName").value
  inputType?: InputType; // Required when type is 'input'
  required?: boolean; // Whether this field is required in form_data
  selectAdvancedSetting?: SelectAdvancedSetting; // For dropdown fields
  validator?: FieldValidator; // Field validation configuration
  // Attributes that support reference resolution
  label?: ResolvableValue<string>;
  placeholder?: ResolvableValue<string>;
  defaultValue?: ResolvableValue<unknown>;
  // Expression code for expression-type components
  expression?: string;
  // Set by backend when applying component rules (editable/readonly/disable)
  readonly?: boolean;
  disabled?: boolean;
  // Container-specific attributes
  containerColumns?: number;
  slotMapping?: Record<string, number>; // Maps child entity id to slot index
}

export interface FormFieldEntity {
  attributes: FormFieldAttributes;
  type: FormFieldType;
  children?: string[]; // Child entity ids for container components
  parentId?: string; // Parent container entity id
}

export interface FormSchema {
  root: string[]; // Array of field UUIDs
  entities: {
    [uuid: string]: FormFieldEntity;
  };
}
