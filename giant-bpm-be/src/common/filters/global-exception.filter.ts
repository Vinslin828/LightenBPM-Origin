import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { FlowExecutionError } from '../../flow-engine/types/execution.types';
import { ErrorCode } from '../../flow-engine/types/error-codes';
import { ValidationError } from '../../flow-engine/types/validation.types';

/**
 * Error detail interface for structured errors
 */
interface ErrorDetail {
  code?: number;
  type?: string;
  message: string;
}

/**
 * Unified error response interface
 */
interface ErrorResponse {
  statusCode: number;
  message: string;
  errors?: ErrorDetail[];
  [key: string]: unknown;
}

/**
 * Global Exception Filter
 *
 * Catches all exceptions and formats them into a unified response structure.
 * This ensures consistent error responses across all APIs.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const errorResponse = this.buildErrorResponse(exception);

    // Log error for debugging
    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        `[${errorResponse.statusCode}] ${errorResponse.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${errorResponse.statusCode}] ${errorResponse.message}`,
        errorResponse.errors?.length
          ? JSON.stringify(errorResponse.errors)
          : undefined,
      );
    }

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * Build unified error response from various exception types
   */
  private buildErrorResponse(exception: unknown): ErrorResponse {
    // Handle FlowExecutionError
    if (exception instanceof FlowExecutionError) {
      return this.handleFlowExecutionError(exception);
    }

    // Handle ValidationError (custom validation errors)
    if (exception instanceof ValidationError) {
      return this.handleValidationError(exception);
    }

    // Handle standard HttpException (BadRequest, NotFound, etc.)
    if (exception instanceof HttpException) {
      return this.handleHttpException(exception);
    }

    // Handle unknown errors
    return this.handleUnknownError(exception);
  }

  /**
   * Handle FlowExecutionError
   */
  private handleFlowExecutionError(
    exception: FlowExecutionError,
  ): ErrorResponse {
    const statusCode = this.getHttpStatusFromExecutionError(exception.code);

    return {
      statusCode,
      message: 'Flow execution failed',
      errors: [
        {
          code: exception.code,
          type: this.getErrorCodeName(exception.code),
          message: exception.message,
        },
      ],
    };
  }

  /**
   * Get error code name from numeric code
   */
  private getErrorCodeName(code: number): string {
    const entry = Object.entries(ErrorCode).find(([, value]) => value === code);
    return entry ? entry[0] : 'UNKNOWN_ERROR';
  }

  /**
   * Handle ValidationError with structured validation errors
   */
  private handleValidationError(exception: ValidationError): ErrorResponse {
    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: exception.message,
      errors: exception.errors.map((error) => ({
        code: error.code,
        type: this.getErrorCodeName(error.code),
        message: error.message,
      })),
    };
  }

  /**
   * Handle standard HttpException
   */
  private handleHttpException(exception: HttpException): ErrorResponse {
    const statusCode = exception.getStatus() as HttpStatus;
    const exceptionResponse = exception.getResponse();

    // Handle response object format
    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as Record<string, unknown>;

      // Check if it has structured validation errors (class-validator format)
      if (Array.isArray(responseObj.message)) {
        return {
          statusCode,
          message: 'Validation failed',
          errors: (responseObj.message as string[]).map((msg) => ({
            message: msg,
          })),
        };
      }

      // Standard object response — only forward extra fields for known conflict
      // codes that intentionally expose deletedId/deletedAt to the client.
      // Any other object thrown via HttpException is reduced to message only,
      // preventing accidental leakage of internal details.
      const CONFLICT_CODES_WITH_EXTRA_FIELDS = new Set([
        'ORG_UNIT_CODE_CONFLICT_DELETED',
        'USER_CODE_CONFLICT_DELETED',
      ]);
      const ALLOWED_EXTRA_KEYS = ['code', 'deletedId', 'deletedAt'] as const;

      const extraFields: Record<string, unknown> = {};
      if (
        typeof responseObj.code === 'string' &&
        CONFLICT_CODES_WITH_EXTRA_FIELDS.has(responseObj.code)
      ) {
        for (const key of ALLOWED_EXTRA_KEYS) {
          if (key in responseObj) {
            extraFields[key] = responseObj[key];
          }
        }
      }

      const baseResponse: ErrorResponse = {
        ...extraFields,
        statusCode,
        message:
          typeof responseObj.message === 'string'
            ? responseObj.message
            : exception.message,
      };

      // Include errors array if present in response
      if (Array.isArray(responseObj.errors)) {
        baseResponse.errors = responseObj.errors as ErrorDetail[];
      }

      return baseResponse;
    }

    // Handle string response
    return {
      statusCode,
      message:
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : exception.message,
    };
  }

  /**
   * Handle unknown errors
   */
  private handleUnknownError(exception: unknown): ErrorResponse {
    const message =
      exception instanceof Error ? exception.message : 'An error occurred';

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
    };
  }

  /**
   * Map ErrorCode to HTTP status code
   */
  private getHttpStatusFromExecutionError(code: number): number {
    switch (code) {
      case ErrorCode.EXEC_INVALID_EXPRESSION:
      case ErrorCode.EXEC_FIELD_NOT_FOUND:
      case ErrorCode.INVALID_OPERATOR:
      case ErrorCode.INVALID_LOGIC_OPERATOR:
      case ErrorCode.INVALID_APPROVER_CONFIG:
        return HttpStatus.BAD_REQUEST;

      case ErrorCode.EXEC_NODE_NOT_FOUND:
      case ErrorCode.WORKFLOW_INSTANCE_NOT_FOUND:
      case ErrorCode.APPROVER_NOT_FOUND:
        return HttpStatus.NOT_FOUND;

      case ErrorCode.NO_CONDITION_MATCHED:
        return HttpStatus.UNPROCESSABLE_ENTITY;

      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }
}
