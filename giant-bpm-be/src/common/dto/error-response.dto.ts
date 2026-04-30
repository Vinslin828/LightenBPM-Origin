import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Error detail for structured validation errors
 */
export class ErrorDetailDto {
  @ApiPropertyOptional({
    description: 'Numeric error code for programmatic handling',
  })
  code?: number;

  @ApiPropertyOptional({
    description: 'String error type for categorization',
  })
  type?: string;

  @ApiProperty({
    description: 'Human-readable error message',
  })
  message: string;
}

/**
 * 400 Bad Request - with optional validation errors
 */
export class BadRequestResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: 'Error Message' })
  message: string;

  @ApiPropertyOptional({
    description:
      'Detailed error list (present for validation and execution errors)',
    type: [ErrorDetailDto],
  })
  errors?: ErrorDetailDto[];
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedResponseDto {
  @ApiProperty({ example: 401 })
  statusCode: number;

  @ApiProperty({ example: 'Authentication required' })
  message: string;
}

/**
 * 403 Forbidden
 */
export class ForbiddenResponseDto {
  @ApiProperty({ example: 403 })
  statusCode: number;

  @ApiProperty({ example: 'Access denied' })
  message: string;
}

/**
 * 404 Not Found
 */
export class NotFoundResponseDto {
  @ApiProperty({ example: 404 })
  statusCode: number;

  @ApiProperty({ example: 'Resource not found' })
  message: string;
}

/**
 * 409 Conflict
 */
export class ConflictResponseDto {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty({ example: 'Resource already exists' })
  message: string;
}

/**
 * 422 Unprocessable Entity
 */
export class UnprocessableEntityResponseDto {
  @ApiProperty({ example: 422 })
  statusCode: number;

  @ApiProperty({ example: 'Request could not be processed' })
  message: string;
}

/**
 * 500 Internal Server Error
 */
export class InternalServerErrorResponseDto {
  @ApiProperty({ example: 500 })
  statusCode: number;

  @ApiProperty({ example: 'An unexpected error occurred' })
  message: string;
}

/**
 * @deprecated Use specific response DTOs instead (BadRequestResponseDto, NotFoundResponseDto, etc.)
 */
export class ErrorResponseDto extends BadRequestResponseDto {}
