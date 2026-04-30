import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { getFlowDefinitionSchema } from './schemas/index';
import {
  Node,
  NodeType,
  ValidationIssue,
  ValidationResult,
  ErrorCode,
  ConditionNode,
  ConditionBranch,
  ApprovalNode,
} from '../../types/index';
import {
  validateRejectConfigContext,
  validateNodeNexts,
} from './validators/context.validator';
import {
  validateReachability,
  detectCircularReferences,
} from './validators/graph.validator';
import {
  isExpressionCondition,
  isSimpleCondition,
  isComplexCondition,
} from '../../shared/flow/flow-utils';
import {
  validateBooleanExpression,
  validateNumberArrayExpression,
  validateExpressionSyntax,
  containsCurrentNodeCall,
} from '../../expression-engine';
import {
  ApprovalMethod,
  ApproverConfig,
  ApproverType,
  SourceType,
} from '../../types';

/**
 * Flow Definition Validator Service (Zod-based)
 *
 * This service provides validation for flow definitions.
 *
 * Validation is split into two stages:
 * 1. Structure validation (handled by Zod schemas)
 * 2. Context-aware validation (handled by custom validators)
 *
 * Structure validation ensures:
 * - Correct data types
 * - Required fields present
 * - Field value constraints
 * - Node-specific rules
 *
 * Context-aware validation ensures:
 * - Node next references are valid
 * - No circular references
 * - All nodes are reachable
 * - Business rules that depend on flow structure
 */
@Injectable()
export class FlowValidatorService {
  private readonly logger = new Logger(FlowValidatorService.name);
  /**
   * Validates that the input is an object
   *
   * @param input - Input to validate
   * @returns Validation error if invalid, null if valid
   */
  private validateObjectFormat(input: unknown): ValidationIssue | null {
    if (!input || typeof input !== 'object') {
      return {
        code: ErrorCode.INVALID_TYPE,
        message: 'Flow definition must be an object',
      };
    }
    return null;
  }

  /**
   * Validates and extracts the version field
   *
   * @param input - Input object to extract version from
   * @returns Version number if valid, ValidationIssue if invalid
   */
  private validateVersionField(
    input: object,
  ): { version: number } | { error: ValidationIssue } {
    if (!('version' in input)) {
      return {
        error: {
          code: ErrorCode.INVALID_TYPE,
          message: 'Flow definition must have a version field',
        },
      };
    }

    const version = (input as { version: unknown }).version;
    if (typeof version !== 'number') {
      return {
        error: {
          code: ErrorCode.INVALID_TYPE,
          message: 'Flow definition version must be a number',
        },
      };
    }

    return { version };
  }

  /**
   * Validates a flow definition
   *
   * @param flowDefinition - The flow definition to validate
   * @returns Validation result with isValid flag and errors
   */
  async validateFlowDefinition(
    flowDefinition: unknown,
  ): Promise<ValidationResult> {
    // Validate object format
    const objectError = this.validateObjectFormat(flowDefinition);
    if (objectError) {
      return {
        isValid: false,
        errors: [objectError],
      };
    }

    // Validate and extract version
    const versionResult = this.validateVersionField(flowDefinition as object);
    if ('error' in versionResult) {
      return {
        isValid: false,
        errors: [versionResult.error],
      };
    }

    // Get the appropriate schema for this version
    let schema: z.ZodTypeAny;
    try {
      schema = getFlowDefinitionSchema(versionResult.version);
    } catch (error) {
      return {
        isValid: false,
        errors: [
          {
            code: ErrorCode.CUSTOM,
            message:
              error instanceof Error ? error.message : 'Invalid flow version',
          },
        ],
      };
    }

    // Stage 1: Structure validation using Zod schema
    const structureResult = schema.safeParse(flowDefinition);

    if (!structureResult.success) {
      // Convert Zod errors to our custom ValidationIssue format
      const validationIssues: ValidationIssue[] =
        structureResult.error.issues.map((zodError) => ({
          code: this.mapZodErrorCode(zodError.code),
          message: zodError.message,
        }));

      return {
        isValid: false,
        errors: validationIssues,
      };
    }

    // Stage 2: Context-aware validation
    const issues: ValidationIssue[] = [];
    const data = structureResult.data as { version: number; nodes: Node[] };
    const validatedFlow = { version: data.version, nodes: data.nodes };
    const nodes = data.nodes;
    const nodeKeys = new Set<string>(nodes.map((node) => node.key));

    // 2.1 Node 'next' reference validation
    for (const node of nodes) {
      issues.push(...validateNodeNexts(node, nodeKeys));
    }

    // 2.2 Context-aware business rules
    for (const node of nodes) {
      // Validate reject_config context for APPROVAL nodes
      if (node.type === NodeType.APPROVAL) {
        const approvalNode = node;
        issues.push(
          ...validateRejectConfigContext(approvalNode, validatedFlow),
        );
      }
    }

    // 2.3 Condition expression validation (must return boolean)
    for (const node of nodes) {
      if (node.type === NodeType.CONDITION) {
        const conditionNode = node;
        const expressionErrors =
          await this.validateConditionExpressions(conditionNode);
        issues.push(...expressionErrors);
      }
    }

    // 2.4 Approval node expression validation
    for (const node of nodes) {
      if (node.type === NodeType.APPROVAL) {
        const approvalNode = node;
        if (approvalNode.expression) {
          const expressionErrors =
            this.validateApprovalExpression(approvalNode);
          issues.push(...expressionErrors);
        }

        const specificUsersErrors =
          this.validateSpecificUsersExpressions(approvalNode);
        issues.push(...specificUsersErrors);
      }
    }

    // 2.5 Graph structure validation
    const reachabilityErrors = validateReachability(nodes);
    issues.push(...reachabilityErrors);

    const circularErrors = detectCircularReferences(nodes);
    issues.push(...circularErrors);

    return {
      isValid: issues.length === 0,
      errors: issues,
    };
  }

  /**
   * Validates that condition expressions return boolean
   * Uses AST validation first, then execution validation as fallback
   */
  private async validateConditionExpressions(
    node: ConditionNode,
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    if (!node.conditions) {
      return issues;
    }

    for (const condition of node.conditions) {
      if (!condition.branch) {
        continue; // Fallback condition (branch: null)
      }

      const branchIssues = await this.validateConditionBranch(
        condition.branch,
        node.key,
      );
      issues.push(...branchIssues);
    }

    return issues;
  }

  /**
   * Validates a condition branch recursively
   * Checks syntax, getCurrentNode() restriction, and boolean return type
   */
  private async validateConditionBranch(
    branch: ConditionBranch,
    nodeKey: string,
  ): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    if (isSimpleCondition(branch)) {
      // Validate field expression syntax
      const syntaxResult = validateExpressionSyntax(branch.field);
      if (!syntaxResult.isValid) {
        issues.push({
          code: ErrorCode.INVALID_EXPRESSION,
          message: `Invalid field expression in condition node "${nodeKey}": ${syntaxResult.errors[0]?.message}`,
        });
        return issues;
      }

      // Check for getCurrentNode() usage
      if (containsCurrentNodeCall(branch.field)) {
        issues.push({
          code: ErrorCode.INVALID_EXPRESSION,
          message: `Condition node "${nodeKey}" field: getCurrentNode() can only be used in approval node expressions`,
        });
      }
    } else if (isExpressionCondition(branch)) {
      const expression = branch.expression;

      // Check for getCurrentNode() usage
      if (containsCurrentNodeCall(expression)) {
        issues.push({
          code: ErrorCode.INVALID_EXPRESSION,
          message: `Condition node "${nodeKey}" expression: getCurrentNode() can only be used in approval node expressions`,
        });
        return issues;
      }

      // Validate boolean return type
      const boolResult = await validateBooleanExpression(expression);
      if (!boolResult.isValid) {
        this.logger.warn(
          `Invalid condition expression in node ${nodeKey}: ${boolResult.errors[0]?.message}`,
        );
        issues.push({
          code: ErrorCode.INVALID_EXPRESSION,
          message: `Invalid condition expression: ${boolResult.errors[0]?.message}`,
        });
      }
    } else if (isComplexCondition(branch)) {
      // Recursively validate left and right branches
      const leftIssues = await this.validateConditionBranch(
        branch.left,
        nodeKey,
      );
      const rightIssues = await this.validateConditionBranch(
        branch.right,
        nodeKey,
      );
      issues.push(...leftIssues, ...rightIssues);
    }

    return issues;
  }

  /**
   * Validates SPECIFIC_USERS approver expressions (when source=EXPRESSION)
   * Expression must return a non-empty array of positive integer user IDs
   */
  private validateSpecificUsersExpressions(
    node: ApprovalNode,
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    const approverConfigs: Array<{ config: ApproverConfig; index?: number }> =
      node.approval_method === ApprovalMethod.SINGLE
        ? [{ config: node.approvers }]
        : node.approvers.map((config, index) => ({ config, index }));

    for (const { config, index } of approverConfigs) {
      if (config.type !== ApproverType.SPECIFIC_USERS) continue;

      const cfg = config.config;
      if (!('source' in cfg) || cfg.source !== SourceType.EXPRESSION) continue;

      const result = validateNumberArrayExpression(cfg.expression);
      if (!result.isValid) {
        const approverPath =
          index !== undefined ? ` approvers[${index}]` : ' approvers';
        const errorMsg = result.errors[0]?.message ?? 'unknown error';
        this.logger.warn(
          `Invalid specific_users expression in approval node ${node.key}${approverPath}: ${errorMsg}`,
        );
        issues.push({
          code: ErrorCode.INVALID_EXPRESSION,
          message: `Invalid specific_users expression in approval node "${node.key}"${approverPath}: ${errorMsg}`,
        });
      }
    }

    return issues;
  }

  /**
   * Validates approval node expression (syntax only)
   * No return type or execution check since it's fire-and-forget
   * and may use functions like fetch() that can't run in sample context
   */
  private validateApprovalExpression(node: ApprovalNode): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    if (!node.expression) {
      return issues;
    }

    const result = validateExpressionSyntax(node.expression);

    if (!result.isValid) {
      this.logger.warn(
        `Invalid expression in approval node ${node.key}: ${result.errors[0]?.message}`,
      );
      issues.push({
        code: ErrorCode.INVALID_EXPRESSION,
        message: `Invalid expression in approval node "${node.key}": ${result.errors[0]?.message}`,
      });
    }

    return issues;
  }

  /**
   * Map Zod error code string to numeric ErrorCode
   */
  private mapZodErrorCode(zodCode: string): number {
    const mapping: Record<string, number> = {
      invalid_type: ErrorCode.INVALID_TYPE,
      invalid_literal: ErrorCode.INVALID_LITERAL,
      invalid_union: ErrorCode.INVALID_UNION,
      invalid_enum_value: ErrorCode.INVALID_ENUM,
      unrecognized_keys: ErrorCode.UNRECOGNIZED_KEYS,
      invalid_arguments: ErrorCode.INVALID_ARGUMENTS,
      invalid_return_type: ErrorCode.INVALID_RETURN_TYPE,
      invalid_date: ErrorCode.INVALID_DATE,
      invalid_string: ErrorCode.INVALID_STRING,
      too_small: ErrorCode.TOO_SMALL,
      too_big: ErrorCode.TOO_BIG,
    };

    return mapping[zodCode] ?? ErrorCode.CUSTOM;
  }
}
