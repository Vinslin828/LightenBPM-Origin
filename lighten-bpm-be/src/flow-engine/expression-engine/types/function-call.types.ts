/**
 * Function Call Types
 *
 * Types for extracted function calls from expressions
 */

/**
 * Function name constants
 */
export const FORM_FIELD_FUNCTION = 'getFormField' as const;
export const APPLICANT_PROFILE_FUNCTION = 'getApplicantProfile' as const;
export const APPLICATION_FUNCTION = 'getApplication' as const;
export const MASTER_DATA_FUNCTION = 'getMasterData' as const;
export const CURRENT_NODE_FUNCTION = 'getCurrentNode' as const;

/**
 * Allowed function names that can be used in expressions
 */
export const ALLOWED_EXPRESSION_FUNCTIONS = [
  FORM_FIELD_FUNCTION,
  APPLICANT_PROFILE_FUNCTION,
  APPLICATION_FUNCTION,
  MASTER_DATA_FUNCTION,
  CURRENT_NODE_FUNCTION,
] as const;

export type AllowedFunctionName = (typeof ALLOWED_EXPRESSION_FUNCTIONS)[number];

/**
 * Extracted function call from an expression
 */
export interface ExtractedFunctionCall {
  /**
   * Function name (e.g., 'getFormField', 'getApplicantProfile', 'getApplication')
   */
  functionName: AllowedFunctionName;

  /**
   * Function arguments (e.g., ['amount'] for getFormField('amount'))
   */
  args: string[];

  /**
   * Accessed property after the function call (e.g., 'value' for getFormField('x').value)
   */
  accessedProperty?: string;

  /**
   * Original text in the expression (e.g., 'getFormField("amount").value')
   * Used for replacement
   */
  originalText: string;

  /**
   * Start position in the expression
   */
  start: number;

  /**
   * End position in the expression
   */
  end: number;
}
