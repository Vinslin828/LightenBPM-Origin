/**
 * Unified Error Codes
 *
 * All error codes for the flow engine, organized by range:
 * - 1000-1999: Validation errors (definition-time)
 * - 2000-2999: Execution errors (runtime)
 */

export const ErrorCode = {
  // ==========================================================================
  // Validation Errors (1000-1999) - Definition-time validation
  // ==========================================================================

  // Schema validation (1000-1099) - from Zod
  INVALID_TYPE: 1001,
  INVALID_LITERAL: 1002,
  INVALID_UNION: 1003,
  INVALID_ENUM: 1004,
  UNRECOGNIZED_KEYS: 1005,
  INVALID_ARGUMENTS: 1006,
  INVALID_RETURN_TYPE: 1007,
  INVALID_DATE: 1008,
  INVALID_STRING: 1009,
  TOO_SMALL: 1010,
  TOO_BIG: 1011,

  // Graph structure (1100-1199)
  UNREACHABLE_NODE: 1101,
  CIRCULAR_REFERENCE: 1102,

  // Reference errors (1200-1299)
  NODE_NOT_FOUND: 1201,
  INVALID_REJECT_TARGET: 1202,
  FORM_FIELD_NOT_FOUND: 1203,
  FORM_FIELD_TYPE_MISMATCH: 1204,
  REFERENCE_NOT_FOUND: 1205,

  // Form data errors (1300-1399)
  FORM_DATA_FIELD_MISSING: 1301,
  FORM_DATA_TYPE_CONVERSION_FAILED: 1302,
  FORM_DATA_FIELD_NOT_IN_SCHEMA: 1303,

  // Expression errors (1400-1499)
  INVALID_EXPRESSION: 1401,

  // Custom/fallback (1900-1999)
  CUSTOM: 1999,

  // ==========================================================================
  // Execution Errors (2000-2999) - Runtime execution
  // ==========================================================================

  // Node execution (2000-2099)
  EXEC_NODE_NOT_FOUND: 2001,
  NO_CONDITION_MATCHED: 2002,
  EXEC_FIELD_NOT_FOUND: 2003,
  EXEC_INVALID_EXPRESSION: 2004,
  WORKFLOW_INSTANCE_NOT_FOUND: 2005,
  INVALID_OPERATOR: 2006,
  INVALID_LOGIC_OPERATOR: 2007,

  // Approver resolution (2100-2199)
  APPROVER_NOT_FOUND: 2101,
  INVALID_APPROVER_CONFIG: 2102,

  // General execution (2900-2999)
  UNKNOWN_EXECUTION_ERROR: 2999,
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Check if error code is a validation error (1000-1999)
 */
export function isValidationError(code: number): boolean {
  return code >= 1000 && code < 2000;
}

/**
 * Check if error code is an execution error (2000-2999)
 */
export function isExecutionError(code: number): boolean {
  return code >= 2000 && code < 3000;
}
