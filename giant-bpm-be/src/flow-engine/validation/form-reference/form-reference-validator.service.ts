/**
 * Form Reference Validator Service
 *
 * Validates that all form field references in a flow definition:
 * 1. Reference fields（getFormField） that exist in the form schema
 * 2. Use operators that are compatible with the field types
 */

import { Injectable } from '@nestjs/common';
import { ValidationResult, ValidationIssue, ErrorCode } from '../../types';
import {
  FormSchema,
  FormFieldEntity,
  FlowDefinition,
  NodeType,
  ConditionBranch,
} from '../../types';
import {
  getReferencedFieldNames,
  isSimpleCondition,
  isComplexCondition,
} from '../../shared/flow/flow-utils';
import {
  FunctionCallExtractor,
  FORM_FIELD_FUNCTION,
} from '../../expression-engine';
import {
  buildFieldIndex,
  isOperatorCompatibleWithFormField,
  findMissingFieldsInSchema,
} from '../../shared/form/form-utils';

@Injectable()
export class FormReferenceValidatorService {
  private readonly extractor: FunctionCallExtractor;

  constructor() {
    this.extractor = new FunctionCallExtractor();
  }

  /**
   * Main validation function for form references
   */
  validateFlowFormReferences(
    flowDefinition: FlowDefinition,
    formSchema: FormSchema,
  ): ValidationResult {
    const errors: ValidationIssue[] = [];

    // Build field index once; reused for all lookups in this call to avoid
    // O(N²) linear scans as validateBranch walks condition trees.
    const fieldIndex = buildFieldIndex(formSchema);

    // 1. Get all referenced field names
    const fieldNames = getReferencedFieldNames(flowDefinition);

    // 2. Validate that all referenced fields exist
    errors.push(...this.validateFieldExistence(fieldNames, formSchema));

    // 3. Validate operator-type compatibility for condition nodes
    const compatibilityErrors = this.validateOperatorTypeCompatibility(
      flowDefinition,
      fieldIndex,
    );
    errors.push(...compatibilityErrors);

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Recursively validate a condition branch for operator-field type compatibility
   */
  private validateBranch(
    branch: ConditionBranch,
    fieldIndex: Map<string, FormFieldEntity>,
  ): ValidationIssue[] {
    const errors: ValidationIssue[] = [];

    // Handle SimpleCondition
    if (isSimpleCondition(branch)) {
      if (typeof branch.field === 'string') {
        // Extract function calls from the expression
        const calls = this.extractor.extract(branch.field);

        // Find getFormField calls and validate operator compatibility
        for (const call of calls) {
          if (call.functionName === FORM_FIELD_FUNCTION && call.args[0]) {
            const fieldName = call.args[0];
            const field = fieldIndex.get(fieldName);

            if (field) {
              // Field exists, now check operator compatibility
              const operator = branch.operator;
              const isCompatible = isOperatorCompatibleWithFormField(
                operator,
                field,
              );

              if (!isCompatible) {
                errors.push({
                  code: ErrorCode.FORM_FIELD_TYPE_MISMATCH,
                  message: `Operator '${operator}' is not compatible with field '${fieldName}' of type '${field.type}'${field.type === 'input' ? ` (inputType: ${field.attributes.inputType})` : ''}.`,
                });
              }
            }
          }
        }
      }
    } else if (isComplexCondition(branch)) {
      // Handle ComplexCondition - recursively validate left and right
      const leftErrors = this.validateBranch(branch.left, fieldIndex);
      const rightErrors = this.validateBranch(branch.right, fieldIndex);
      errors.push(...leftErrors, ...rightErrors);
    }
    // ExpressionCondition: no operator-type validation needed
    // Field existence is already checked by getReferencedFieldNames()
    // Boolean return validation is done in FlowValidatorService

    return errors;
  }

  /**
   * Validate that all form references exist in the form schema
   */
  private validateFieldExistence(
    fieldNames: string[],
    formSchema: FormSchema,
  ): ValidationIssue[] {
    const errors: ValidationIssue[] = [];

    const missingFields = findMissingFieldsInSchema(fieldNames, formSchema);

    // Create error for each missing field
    for (const fieldName of missingFields) {
      errors.push({
        code: ErrorCode.FORM_FIELD_NOT_FOUND,
        message: `Form field '${fieldName}' does not exist in form schema`,
      });
    }

    return errors;
  }

  /**
   * Validate operator-field type compatibility for condition nodes
   */
  private validateOperatorTypeCompatibility(
    flowDefinition: FlowDefinition,
    fieldIndex: Map<string, FormFieldEntity>,
  ): ValidationIssue[] {
    const errors: ValidationIssue[] = [];

    for (const node of flowDefinition.nodes) {
      if (node.type !== NodeType.CONDITION) {
        continue;
      }

      const conditionNode = node;
      if (!conditionNode.conditions) {
        continue;
      }

      for (const condition of conditionNode.conditions) {
        if (!condition.branch) {
          continue; // Fallback condition (branch: null)
        }

        const branchErrors = this.validateBranch(condition.branch, fieldIndex);
        errors.push(...branchErrors);
      }
    }

    return errors;
  }
}
