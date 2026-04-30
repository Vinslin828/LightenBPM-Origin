/**
 * Validation Types
 *
 * Custom validation error types used throughout the flow validation system.
 * These are independent of any validation library (like Zod).
 */

import { ErrorCode } from './error-codes';

// Re-export ErrorCode for convenience
export { ErrorCode } from './error-codes';
export type { ErrorCode as ErrorCodeType } from './error-codes';

/**
 * Validation issue
 *
 * Represents a single validation error.
 */
export interface ValidationIssue {
  /**
   * Error code for programmatic error handling
   */
  code: number;

  /**
   * Human-readable error message
   */
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  /**
   * Whether the validation passed
   */
  isValid: boolean;

  /**
   * List of validation errors (empty if valid)
   */
  errors: ValidationIssue[];
}

/**
 * Error class for validation errors (pure, no framework dependencies)
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly errors: ValidationIssue[],
  ) {
    super(message);
    this.name = 'ValidationError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a successful validation result
 */
export function validResult(): ValidationResult {
  return { isValid: true, errors: [] };
}

/**
 * Create a failed validation result with a single error
 */
export function invalidResult(
  message: string,
  code: ErrorCode = ErrorCode.CUSTOM,
): ValidationResult {
  return {
    isValid: false,
    errors: [{ code, message }],
  };
}
