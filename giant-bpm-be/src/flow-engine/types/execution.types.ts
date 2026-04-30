/**
 * Execution Types
 *
 * Error classes for flow execution errors.
 * Error codes are defined in error-codes.ts (2000-2999 range).
 */

import { ErrorCode } from './error-codes';

/**
 * Error class for flow execution errors
 */
export class FlowExecutionError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'FlowExecutionError';
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
