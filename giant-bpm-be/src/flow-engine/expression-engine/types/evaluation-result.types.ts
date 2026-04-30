/**
 * Evaluation Result Types
 *
 * Result types for expression evaluation
 */

/**
 * Result of expression evaluation
 */
export interface EvaluationResult<T = unknown> {
  /**
   * Whether the evaluation was successful
   */
  success: boolean;

  /**
   * The evaluated value (only present if success is true)
   */
  value?: T;

  /**
   * Error message (only present if success is false)
   */
  error?: string;
}

/**
 * Result type for validation expressions (always boolean)
 */
export type ValidationEvaluationResult = EvaluationResult<boolean>;

/**
 * Result type for reference expressions (any value)
 */
export type ReferenceEvaluationResult = EvaluationResult<unknown>;
