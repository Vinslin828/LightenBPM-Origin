import { z } from 'zod';
import {
  NodeType,
  ApprovalMethod,
  ApprovalLogic,
  ApproverType,
  ReportingLineMethod,
  SourceType,
  ComparisonOperator,
  LogicOperator,
  RejectBehavior,
} from '../../../types';

/**
 * Common Zod Schemas
 *
 * This file contains Zod schemas for all enum types used in flow validation.
 * These schemas are used as building blocks for more complex schemas.
 */

// Node type schemas
export const NodeTypeSchema = z.enum(NodeType);

// Approval schemas
export const ApprovalMethodSchema = z.enum(ApprovalMethod);
export const ApprovalLogicSchema = z.enum(ApprovalLogic);
export const ApproverTypeSchema = z.enum(ApproverType);

// Reporting line schemas
export const ReportingLineMethodSchema = z.enum(ReportingLineMethod);
export const SourceTypeSchema = z.enum(SourceType);

// Condition schemas
export const ComparisonOperatorSchema = z.enum(ComparisonOperator);
export const LogicOperatorSchema = z.enum(LogicOperator);

// Reject behavior schema
export const RejectBehaviorSchema = z.enum(RejectBehavior);
