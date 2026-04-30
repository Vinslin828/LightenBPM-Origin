import { Injectable, Logger } from '@nestjs/common';
import {
  ConditionNode,
  ConditionBranch,
  SimpleCondition,
  ComplexCondition,
  ExpressionCondition,
  ComparisonOperator,
  LogicOperator,
} from '../../types';
import { isReferenceExpression } from '../../shared/flow/flow-utils';
import { FlowExecutionError, ErrorCode } from '../../types';
import {
  ExpressionEvaluatorService,
  ExecutionContext,
} from '../../expression-engine';

export interface ConditionNodeExecutionResult {
  nextNodeKeys: string[]; // Changed to array to support multiple branches
}

/**
 * Condition Node Executor
 *
 * Executes CONDITION node type.
 * Evaluates conditions against form data and returns ALL matching branches for parallel execution.
 */
@Injectable()
export class ConditionNodeExecutor {
  private readonly logger = new Logger(ConditionNodeExecutor.name);

  constructor(
    private readonly expressionEvaluator: ExpressionEvaluatorService,
  ) {}

  /**
   * Executes a condition node
   * @param nodeConfig - The condition node configuration
   * @param formData - The form data to evaluate conditions against
   * @param applicantId - Optional applicant ID for getApplicantProfile() expressions
   * @param workflowInstanceId - Optional workflow instance ID for getApplication() expressions
   * @returns All next node keys that match the conditions (supports multiple branches)
   */
  async execute(
    nodeConfig: ConditionNode,
    formData: Record<string, any>,
    applicantId?: number,
    workflowInstanceId?: number,
  ): Promise<ConditionNodeExecutionResult> {
    this.logger.debug(
      `execute, nodeConfig: ${JSON.stringify(nodeConfig)}, formData: ${JSON.stringify(formData)}`,
    );

    const context: ExecutionContext = {
      formData,
      applicantId,
      workflowInstanceId,
    };
    const matchedBranches: string[] = [];

    // Evaluate all conditional branches (branch !== null)
    for (const conditionItem of nodeConfig.conditions) {
      if (conditionItem.branch !== null) {
        // Evaluate the condition branch
        if (await this.evaluateBranch(conditionItem.branch, context)) {
          matchedBranches.push(conditionItem.next);
        }
      }
    }

    // If no condition matched, look for else/default branch (branch === null)
    if (matchedBranches.length === 0) {
      const elseBranch = nodeConfig.conditions.find(
        (item) => item.branch === null,
      );
      if (elseBranch) {
        matchedBranches.push(elseBranch.next);
      } else {
        // No condition matched and no default branch found
        throw new FlowExecutionError(
          'No condition matched and no default branch found',
          ErrorCode.NO_CONDITION_MATCHED,
          { nodeKey: nodeConfig.key },
        );
      }
    }

    return { nextNodeKeys: matchedBranches };
  }

  /**
   * Evaluates a condition branch (supports SimpleCondition, ComplexCondition, and ExpressionCondition)
   *
   * @param branch - The condition branch to evaluate
   * @param context - The execution context
   * @returns True if the condition is met
   */
  private async evaluateBranch(
    branch: ConditionBranch,
    context: ExecutionContext,
  ): Promise<boolean> {
    // Check if it's an ExpressionCondition (has 'expression' property)
    if ('expression' in branch) {
      return this.evaluateExpressionCondition(branch, context);
    }

    // Check if it's a ComplexCondition (has 'logic' property)
    if ('logic' in branch) {
      return this.evaluateComplexCondition(branch, context);
    }

    // It's a SimpleCondition
    return this.evaluateSimpleCondition(branch, context);
  }

  /**
   * Evaluates an expression-based condition
   *
   * Supports full JavaScript expressions including:
   * - Inline expressions: "getFormField('amount').value > 5000"
   * - Statements with return: "const a = getFormField('a').value; return a > 100;"
   * - Function definitions: "function condition() { return x > 5; }"
   *
   * @param condition - The expression condition
   * @param context - The execution context
   * @returns True if the expression evaluates to a truthy value
   */
  private async evaluateExpressionCondition(
    condition: ExpressionCondition,
    context: ExecutionContext,
  ): Promise<boolean> {
    const result = await this.expressionEvaluator.evaluate(
      condition.expression,
      context,
    );

    if (!result.success) {
      throw new FlowExecutionError(
        `Failed to evaluate expression condition: ${result.error}`,
        ErrorCode.EXEC_INVALID_EXPRESSION,
        { expression: condition.expression },
      );
    }

    // Convert result to boolean
    return Boolean(result.value);
  }

  /**
   * Evaluates a complex condition with AND/OR logic
   * @param condition - The complex condition
   * @param context - The execution context
   * @returns True if the condition is met
   */
  private async evaluateComplexCondition(
    condition: ComplexCondition,
    context: ExecutionContext,
  ): Promise<boolean> {
    const leftResult = await this.evaluateBranch(condition.left, context);
    const rightResult = await this.evaluateBranch(condition.right, context);

    switch (condition.logic) {
      case LogicOperator.AND:
        return leftResult && rightResult;
      case LogicOperator.OR:
        return leftResult || rightResult;
      default:
        throw new FlowExecutionError(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `Unknown logic operator: ${condition.logic}`,
          ErrorCode.INVALID_LOGIC_OPERATOR,
          { logicOperator: condition.logic },
        );
    }
  }

  /**
   * Evaluates a simple condition
   * @param condition - The simple condition
   * @param context - The execution context
   * @returns True if the condition is met
   */
  private async evaluateSimpleCondition(
    condition: SimpleCondition,
    context: ExecutionContext,
  ): Promise<boolean> {
    let fieldValue: any;

    // Check if field contains reference expression (e.g., getFormField(), getApplicantProfile(), getApplication())
    if (isReferenceExpression(condition.field)) {
      const execResult = await this.expressionEvaluator.evaluate(
        condition.field,
        context,
      );
      if (!execResult.success) {
        throw new FlowExecutionError(
          `Failed to execute expression: ${execResult.error}`,
          ErrorCode.EXEC_INVALID_EXPRESSION,
          { field: condition.field, formData: context.formData },
        );
      }

      fieldValue = execResult.value;
    } else {
      // Direct field value (not a form reference)
      fieldValue = condition.field;
    }

    // Perform comparison based on operator
    return this.compareValues(fieldValue, condition.operator, condition.value);
  }

  /**
   * Compares two values based on the operator
   * @param fieldValue - The field value from form data
   * @param operator - The comparison operator
   * @param conditionValue - The value to compare against
   * @returns True if the comparison is satisfied
   */
  private compareValues(
    fieldValue: any,
    operator: ComparisonOperator,
    conditionValue: string | number | boolean,
  ): boolean {
    switch (operator) {
      case ComparisonOperator.EQUAL:
        return fieldValue === conditionValue;

      case ComparisonOperator.NOT_EQUAL:
        return fieldValue !== conditionValue;

      case ComparisonOperator.STRING_EQUAL:
        return String(fieldValue) === String(conditionValue);

      case ComparisonOperator.STRING_NOT_EQUAL:
        return String(fieldValue) !== String(conditionValue);

      case ComparisonOperator.GREATER_THAN:
        return fieldValue > conditionValue;

      case ComparisonOperator.LESS_THAN:
        return fieldValue < conditionValue;

      case ComparisonOperator.GREATER_EQUAL:
        return fieldValue >= conditionValue;

      case ComparisonOperator.LESS_EQUAL:
        return fieldValue <= conditionValue;

      case ComparisonOperator.CONTAINS:
        return String(fieldValue).includes(String(conditionValue));

      case ComparisonOperator.NOT_CONTAINS:
        return !String(fieldValue).includes(String(conditionValue));

      default:
        throw new FlowExecutionError(
          // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
          `Unknown operator: ${operator}`,
          ErrorCode.INVALID_OPERATOR,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          { operator, fieldValue, conditionValue },
        );
    }
  }
}
