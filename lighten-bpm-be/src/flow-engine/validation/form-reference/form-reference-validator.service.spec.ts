/**
 * Unit Tests - FormReferenceValidatorService
 */

import { FormReferenceValidatorService } from './form-reference-validator.service';
import {
  NodeType,
  ErrorCode,
  FormSchema,
  ApprovalMethod,
  ApproverType,
  SourceType,
} from '../../types';

describe('FormReferenceValidatorService', () => {
  let service: FormReferenceValidatorService;

  beforeEach(() => {
    service = new FormReferenceValidatorService();
  });

  // =========================================================================
  // Field Existence Validation
  // =========================================================================

  describe('field existence validation', () => {
    it('should return valid when all referenced fields exist', () => {
      // Arrange
      const flow = createFlowWithCondition({
        field: 'getFormField("age").value',
        operator: '>',
        value: 18,
      });
      const schema = createFormSchema([
        { uuid: 'age-uuid', name: 'age', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid when multiple fields are referenced', () => {
      // Arrange
      const flow = createFlowWithMultipleConditions([
        { field: 'getFormField("age").value', operator: '>', value: 18 },
        { field: 'getFormField("salary").value', operator: '>', value: 1000 },
      ]);
      const schema = createFormSchema([
        { uuid: 'age-uuid', name: 'age', type: 'input', inputType: 'number' },
        {
          uuid: 'salary-uuid',
          name: 'salary',
          type: 'input',
          inputType: 'number',
        },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return FORM_FIELD_NOT_FOUND when referenced field does not exist', () => {
      // Arrange
      const flow = createFlowWithCondition({
        field: 'getFormField("non_existent").value',
        operator: '>',
        value: 18,
      });
      const schema = createFormSchema([
        { uuid: 'age-uuid', name: 'age', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.FORM_FIELD_NOT_FOUND);
      expect(result.errors[0].message).toContain("'non_existent'");
    });
  });

  // =========================================================================
  // Operator-Type Compatibility Validation
  // =========================================================================

  describe('operator-type compatibility validation', () => {
    describe('number fields', () => {
      it('should return valid when numeric operator is used with number field', () => {
        // Arrange
        const flow = createFlowWithCondition({
          field: 'getFormField("age").value',
          operator: '>',
          value: 18,
        });
        const schema = createFormSchema([
          { uuid: 'age-uuid', name: 'age', type: 'input', inputType: 'number' },
        ]);

        // Act
        const result = service.validateFlowFormReferences(flow, schema);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should return valid for all numeric operators with number field', () => {
        const operators = ['>', '>=', '<', '<=', '==', '!='];

        for (const operator of operators) {
          // Arrange
          const flow = createFlowWithCondition({
            field: 'getFormField("age").value',
            operator,
            value: 18,
          });
          const schema = createFormSchema([
            {
              uuid: 'age-uuid',
              name: 'age',
              type: 'input',
              inputType: 'number',
            },
          ]);

          // Act
          const result = service.validateFlowFormReferences(flow, schema);

          // Assert
          expect(result.isValid).toBe(true);
        }
      });
    });

    describe('text fields', () => {
      it('should return valid when string operator is used with text field', () => {
        // Arrange
        const flow = createFlowWithCondition({
          field: 'getFormField("name").value',
          operator: 'equals',
          value: 'John',
        });
        const schema = createFormSchema([
          { uuid: 'name-uuid', name: 'name', type: 'input', inputType: 'text' },
        ]);

        // Act
        const result = service.validateFlowFormReferences(flow, schema);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should return FORM_FIELD_TYPE_MISMATCH when numeric operator is used with text field', () => {
        // Arrange
        const flow = createFlowWithCondition({
          field: 'getFormField("name").value',
          operator: '==',
          value: 'John',
        });
        const schema = createFormSchema([
          { uuid: 'name-uuid', name: 'name', type: 'input', inputType: 'text' },
        ]);

        // Act
        const result = service.validateFlowFormReferences(flow, schema);

        // Assert
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe(ErrorCode.FORM_FIELD_TYPE_MISMATCH);
        expect(result.errors[0].message).toContain("Operator '=='");
        expect(result.errors[0].message).toContain("'name'");
      });
    });

    describe('date fields', () => {
      it('should return valid when comparison operator is used with date field', () => {
        // Arrange
        const flow = createFlowWithCondition({
          field: 'getFormField("birthdate").value',
          operator: '>',
          value: 946684800,
        });
        const schema = createFormSchema([
          { uuid: 'birthdate-uuid', name: 'birthdate', type: 'date' },
        ]);

        // Act
        const result = service.validateFlowFormReferences(flow, schema);

        // Assert
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  // =========================================================================
  // Complex Condition Validation
  // =========================================================================

  describe('complex condition validation', () => {
    it('should return valid for nested AND conditions', () => {
      // Arrange
      const flow = createFlowWithCondition({
        logic: 'and',
        left: { field: 'getFormField("age").value', operator: '>', value: 18 },
        right: {
          field: 'getFormField("salary").value',
          operator: '>',
          value: 1000,
        },
      });
      const schema = createFormSchema([
        { uuid: 'age-uuid', name: 'age', type: 'input', inputType: 'number' },
        {
          uuid: 'salary-uuid',
          name: 'salary',
          type: 'input',
          inputType: 'number',
        },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid for nested OR conditions', () => {
      // Arrange
      const flow = createFlowWithCondition({
        logic: 'or',
        left: { field: 'getFormField("age").value', operator: '<', value: 18 },
        right: { field: 'getFormField("age").value', operator: '>', value: 65 },
      });
      const schema = createFormSchema([
        { uuid: 'age-uuid', name: 'age', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return FORM_FIELD_NOT_FOUND when nested condition has missing field', () => {
      // Arrange
      const flow = createFlowWithCondition({
        logic: 'and',
        left: { field: 'getFormField("age").value', operator: '>', value: 18 },
        right: {
          field: 'getFormField("non_existent").value',
          operator: '>',
          value: 1000,
        },
      });
      const schema = createFormSchema([
        { uuid: 'age-uuid', name: 'age', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.FORM_FIELD_NOT_FOUND);
      expect(result.errors[0].message).toContain("'non_existent'");
    });

    it('should return valid for deeply nested conditions', () => {
      // Arrange
      const flow = createFlowWithCondition({
        logic: 'and',
        left: {
          logic: 'or',
          left: {
            field: 'getFormField("age").value',
            operator: '<',
            value: 18,
          },
          right: {
            field: 'getFormField("age").value',
            operator: '>',
            value: 65,
          },
        },
        right: {
          field: 'getFormField("salary").value',
          operator: '>',
          value: 1000,
        },
      });
      const schema = createFormSchema([
        { uuid: 'age-uuid', name: 'age', type: 'input', inputType: 'number' },
        {
          uuid: 'salary-uuid',
          name: 'salary',
          type: 'input',
          inputType: 'number',
        },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // =========================================================================
  // Multiple Condition Branches
  // =========================================================================

  describe('multiple condition branches', () => {
    it('should return valid when all branches have valid fields', () => {
      // Arrange
      const flow = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: {
                  field: 'getFormField("age").value',
                  operator: '<',
                  value: 18,
                },
                next: 'end',
              },
              {
                branch: {
                  field: 'getFormField("age").value',
                  operator: '>=',
                  value: 65,
                },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };
      const schema = createFormSchema([
        { uuid: 'age-uuid', name: 'age', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return FORM_FIELD_TYPE_MISMATCH when any branch has invalid operator', () => {
      // Arrange
      const flow = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: {
                  field: 'getFormField("age").value',
                  operator: '<',
                  value: 18,
                },
                next: 'end',
              },
              {
                branch: {
                  field: 'getFormField("name").value',
                  operator: '>',
                  value: 'test',
                },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };
      const schema = createFormSchema([
        { uuid: 'age-uuid', name: 'age', type: 'input', inputType: 'number' },
        { uuid: 'name-uuid', name: 'name', type: 'input', inputType: 'text' },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.FORM_FIELD_TYPE_MISMATCH);
    });
  });

  // =========================================================================
  // Multiple Validation Errors
  // =========================================================================

  describe('multiple validation errors', () => {
    it('should report all validation errors', () => {
      // Arrange
      const flow = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: {
                  field: 'getFormField("missing_field").value',
                  operator: '>',
                  value: 18,
                },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          {
            key: 'condition2',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: {
                  field: 'getFormField("name").value',
                  operator: '>',
                  value: 'test',
                },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };
      const schema = createFormSchema([
        { uuid: 'name-uuid', name: 'name', type: 'input', inputType: 'text' },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
      expect(
        result.errors.some((e) => e.code === ErrorCode.FORM_FIELD_NOT_FOUND),
      ).toBe(true);
      expect(
        result.errors.some(
          (e) => e.code === ErrorCode.FORM_FIELD_TYPE_MISMATCH,
        ),
      ).toBe(true);
    });
  });

  // =========================================================================
  // ExpressionCondition Validation
  // =========================================================================

  describe('ExpressionCondition validation', () => {
    it('should return valid when ExpressionCondition has valid field reference', () => {
      // Arrange
      const flow = createFlowWithCondition({
        expression: 'getFormField("age").value > 18',
      });
      const schema = createFormSchema([
        { uuid: 'age-uuid', name: 'age', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return FORM_FIELD_NOT_FOUND when ExpressionCondition has missing field', () => {
      // Arrange
      const flow = createFlowWithCondition({
        expression: 'getFormField("non_existent").value > 18',
      });
      const schema = createFormSchema([
        { uuid: 'age-uuid', name: 'age', type: 'input', inputType: 'number' },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe(ErrorCode.FORM_FIELD_NOT_FOUND);
    });

    it('should return valid when ExpressionCondition uses function definition with valid fields', () => {
      // Arrange
      const flow = createFlowWithCondition({
        expression: `function condition() {
          const a = getFormField("field_a").value;
          const b = getFormField("field_b").value;
          return a + b > 100;
        }`,
      });
      const schema = createFormSchema([
        {
          uuid: 'a-uuid',
          name: 'field_a',
          type: 'input',
          inputType: 'number',
        },
        {
          uuid: 'b-uuid',
          name: 'field_b',
          type: 'input',
          inputType: 'number',
        },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return valid when flow has mixed SimpleCondition and ExpressionCondition', () => {
      // Arrange
      const flow = {
        version: 1,
        nodes: [
          { key: 'start', type: NodeType.START, next: 'condition' },
          {
            key: 'condition',
            type: NodeType.CONDITION,
            conditions: [
              {
                branch: {
                  field: 'getFormField("age").value',
                  operator: '>',
                  value: 65,
                },
                next: 'end',
              },
              {
                branch: { expression: 'getFormField("salary").value > 10000' },
                next: 'end',
              },
              { branch: null, next: 'end' },
            ],
          },
          { key: 'end', type: NodeType.END },
        ],
      };
      const schema = createFormSchema([
        { uuid: 'age-uuid', name: 'age', type: 'input', inputType: 'number' },
        {
          uuid: 'salary-uuid',
          name: 'salary',
          type: 'input',
          inputType: 'number',
        },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should skip operator-type validation for ExpressionCondition', () => {
      // Arrange
      // ExpressionCondition skips operator validation
      // (validated at runtime by the expression engine)
      const flow = createFlowWithCondition({
        expression: 'getFormField("name").value.length > 5',
      });
      const schema = createFormSchema([
        { uuid: 'name-uuid', name: 'name', type: 'input', inputType: 'text' },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // =========================================================================
  // Approval Node Expression Field References
  // =========================================================================

  describe('approval node expression field references', () => {
    it('should return valid when approval expression references an existing field', () => {
      // Arrange
      const flow = createFlowWithApprovalExpression(
        'fetch("https://example.com", { body: JSON.stringify({ amount: getFormField("amount").value }) })',
      );
      const schema = createFormSchema([
        {
          uuid: 'amount-uuid',
          name: 'amount',
          type: 'input',
          inputType: 'number',
        },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return FORM_FIELD_NOT_FOUND when approval expression references a missing field', () => {
      // Arrange
      const flow = createFlowWithApprovalExpression(
        'getFormField("nonexistent").value',
      );
      const schema = createFormSchema([
        {
          uuid: 'amount-uuid',
          name: 'amount',
          type: 'input',
          inputType: 'number',
        },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.FORM_FIELD_NOT_FOUND &&
            e.message.includes("'nonexistent'"),
        ),
      ).toBe(true);
    });

    it('should return FORM_FIELD_NOT_FOUND when SPECIFIC_USERS expression references a missing field', () => {
      // Arrange
      const flow = createFlowWithSpecificUsersExpression(
        '[getFormField("delegate_id").value]',
      );
      const schema = createFormSchema([
        {
          uuid: 'amount-uuid',
          name: 'amount',
          type: 'input',
          inputType: 'number',
        },
      ]);

      // Act
      const result = service.validateFlowFormReferences(flow, schema);

      // Assert
      expect(result.isValid).toBe(false);
      expect(
        result.errors.some(
          (e) =>
            e.code === ErrorCode.FORM_FIELD_NOT_FOUND &&
            e.message.includes("'delegate_id'"),
        ),
      ).toBe(true);
    });
  });
});

// =============================================================================
// Test Helpers
// =============================================================================

function createFormSchema(
  fieldDefinitions: Array<{
    uuid: string;
    name: string;
    type: 'input' | 'text' | 'number' | 'date';
    inputType?: 'text' | 'number';
  }>,
): FormSchema {
  const entities: FormSchema['entities'] = {};
  const root: string[] = [];

  fieldDefinitions.forEach((field) => {
    root.push(field.uuid);
    entities[field.uuid] = {
      type: field.type,
      attributes: {
        name: field.name,
        inputType: field.inputType,
      },
    };
  });

  return { root, entities };
}

function createFlowWithCondition(branch: unknown) {
  return {
    version: 1,
    nodes: [
      { key: 'start', type: NodeType.START, next: 'condition' },
      {
        key: 'condition',
        type: NodeType.CONDITION,
        conditions: [
          { branch, next: 'end' },
          { branch: null, next: 'end' },
        ],
      },
      { key: 'end', type: NodeType.END },
    ],
  };
}

function createFlowWithApprovalExpression(expression: string) {
  return {
    version: 1,
    nodes: [
      { key: 'start', type: NodeType.START, next: 'approval' },
      {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.SINGLE,
        approvers: { type: ApproverType.APPLICANT },
        expression,
        next: 'end',
      },
      { key: 'end', type: NodeType.END },
    ],
  };
}

function createFlowWithSpecificUsersExpression(expression: string) {
  return {
    version: 1,
    nodes: [
      { key: 'start', type: NodeType.START, next: 'approval' },
      {
        key: 'approval',
        type: NodeType.APPROVAL,
        approval_method: ApprovalMethod.SINGLE,
        approvers: {
          type: ApproverType.SPECIFIC_USERS,
          config: {
            source: SourceType.EXPRESSION,
            expression,
          },
        },
        next: 'end',
      },
      { key: 'end', type: NodeType.END },
    ],
  };
}

function createFlowWithMultipleConditions(branches: unknown[]) {
  return {
    version: 1,
    nodes: [
      { key: 'start', type: NodeType.START, next: 'condition1' },
      ...branches.map((branch, index) => ({
        key: `condition${index + 1}`,
        type: NodeType.CONDITION,
        conditions: [
          {
            branch,
            next: index < branches.length - 1 ? `condition${index + 2}` : 'end',
          },
          { branch: null, next: 'end' },
        ],
      })),
      { key: 'end', type: NodeType.END },
    ],
  };
}
