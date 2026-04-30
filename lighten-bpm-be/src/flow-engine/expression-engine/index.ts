/**
 * Expression Engine Module Exports
 *
 * This module provides expression evaluation services for:
 * - Form reference resolution (getFormField, getApplicantProfile, getApplication)
 * - Complex expressions (ternary, string concatenation, logical operators)
 * - Form schema reference resolution
 */

// Types
export * from './types';

// Executors
export { GetFormFieldExecutor } from './executors/get-form-field.executor';
export { GetApplicantProfileExecutor } from './executors/get-applicant-profile.executor';
export { GetApplicationExecutor } from './executors/get-application.executor';
export { GetMasterDataExecutor } from './executors/get-master-data.executor';
export { GetCurrentNodeExecutor } from './executors/get-current-node.executor';
export { FetchExecutor } from './executors/fetch.executor';

// Services
export { FunctionExecutorService } from './services/function-executor.service';
export { ExpressionEvaluatorService } from './services/expression-evaluator.service';
export { FormSchemaResolverService } from './services/form-schema-resolver.service';
export { ValidationExecutorService } from './services/validation-executor.service';
export type { ValidationExecutionContext } from './services/validation-executor.service';

// Utilities
export { keysToCamelCase } from './utils/case-converter';

// Static analysis
export { FunctionCallExtractor } from './extractor/function-call-extractor';

// Validators
export { validateBooleanExpression } from './validator/boolean-expression-validator';

export { validateNumberArrayExpression } from './validator/number-array-expression-validator';

export { validateValidationExpression } from './validator/validation-expression-validator';

export {
  validateExpressionSyntax,
  containsCurrentNodeCall,
} from './validator/expression-validator';
