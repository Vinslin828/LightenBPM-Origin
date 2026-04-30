import { z } from 'zod';
import { ReportingLineMethodSchema, SourceTypeSchema } from './common.schema';
import { ComponentRuleSchema } from './component-rule.schema';
import { ApproverType, ReportingLineMethod, SourceType } from '../../../types';

/**
 * Approver Configuration Schemas
 *
 * Uses Zod's discriminated unions to handle different approver types.
 * Each approver type has its own schema with specific validation rules.
 */

// Base schema for all approver configs
const ApproverConfigBaseSchema = z.object({
  reuse_prior_approvals: z.boolean().optional(),
  description: z.string().optional(),
  component_rules: z.array(ComponentRuleSchema).optional(),
});

// 1. APPLICANT - No additional config needed
const ApplicantConfigSchema = ApproverConfigBaseSchema.extend({
  type: z.literal(ApproverType.APPLICANT),
});

// 2. APPLICANT_REPORTING_LINE
const ApplicantReportingLineConfigSchema = ApproverConfigBaseSchema.extend({
  type: z.literal(ApproverType.APPLICANT_REPORTING_LINE),
  config: z
    .object({
      method: ReportingLineMethodSchema,
      job_grade: z.number().int().positive().optional(),
      level: z.number().int().positive().optional(),
      org_reference_field: z.string().optional(),
    })
    .refine(
      (config) => {
        // If method is TO_JOB_GRADE, job_grade must be provided
        if (config.method === ReportingLineMethod.TO_JOB_GRADE) {
          return config.job_grade !== undefined;
        }
        // If method is TO_LEVEL, level must be provided
        if (config.method === ReportingLineMethod.TO_LEVEL) {
          return config.level !== undefined;
        }
        return true;
      },
      {
        message:
          'job_grade is required when method is TO_JOB_GRADE, level is required when method is TO_LEVEL',
      },
    ),
});

// 3. SPECIFIC_USER_REPORTING_LINE
const SpecificUserReportingLineConfigSchema = ApproverConfigBaseSchema.extend({
  type: z.literal(ApproverType.SPECIFIC_USER_REPORTING_LINE),
  config: z
    .object({
      source: SourceTypeSchema,
      user_id: z.number().int().positive().optional(),
      form_field: z.string().optional(),
      method: ReportingLineMethodSchema,
      job_grade: z.number().int().positive().optional(),
      level: z.number().int().positive().optional(),
      org_reference_field: z.string().optional(),
    })
    .refine(
      (config) => {
        // If source is MANUAL, user_id must be provided
        if (config.source === SourceType.MANUAL) {
          return config.user_id !== undefined;
        }
        // If source is FORM_FIELD, form_field must be provided
        if (config.source === SourceType.FORM_FIELD) {
          return config.form_field !== undefined;
        }
        return true;
      },
      {
        message:
          'user_id is required when source is MANUAL, form_field is required when source is FORM_FIELD',
      },
    )
    .refine(
      (config) => {
        // If method is TO_JOB_GRADE, job_grade must be provided
        if (config.method === ReportingLineMethod.TO_JOB_GRADE) {
          return config.job_grade !== undefined;
        }
        // If method is TO_LEVEL, level must be provided
        if (config.method === ReportingLineMethod.TO_LEVEL) {
          return config.level !== undefined;
        }
        return true;
      },
      {
        message:
          'job_grade is required when method is TO_JOB_GRADE, level is required when method is TO_LEVEL',
      },
    ),
});

// 4. DEPARTMENT_HEAD
const DepartmentHeadConfigSchema = ApproverConfigBaseSchema.extend({
  type: z.literal(ApproverType.DEPARTMENT_HEAD),
  config: z
    .object({
      source: SourceTypeSchema,
      org_unit_id: z.number().int().positive().optional(),
      form_field: z.string().optional(),
    })
    .refine(
      (config) => {
        // If source is MANUAL, org_unit_id must be provided
        if (config.source === SourceType.MANUAL) {
          return config.org_unit_id !== undefined;
        }
        // If source is FORM_FIELD, form_field must be provided
        if (config.source === SourceType.FORM_FIELD) {
          return config.form_field !== undefined;
        }
        return true;
      },
      {
        message:
          'org_unit_id is required when source is MANUAL, form_field is required when source is FORM_FIELD',
      },
    ),
});

// 5. ROLE
const RoleConfigSchema = ApproverConfigBaseSchema.extend({
  type: z.literal(ApproverType.ROLE),
  config: z.object({
    role_id: z.number().int().positive(),
  }),
});

// 6. SPECIFIC_USERS
const SpecificUsersManualConfigSchema = z.object({
  source: z.literal(SourceType.MANUAL).optional(),
  user_ids: z.array(z.number().int().positive()).min(1, {
    message: 'At least one user ID is required',
  }),
});

const SpecificUsersExpressionConfigSchema = z.object({
  source: z.literal(SourceType.EXPRESSION),
  expression: z.string().min(1, {
    message: 'Expression is required when source is EXPRESSION',
  }),
});

const SpecificUsersConfigSchema = ApproverConfigBaseSchema.extend({
  type: z.literal(ApproverType.SPECIFIC_USERS),
  config: z.union([
    SpecificUsersManualConfigSchema,
    SpecificUsersExpressionConfigSchema,
  ]),
});

/**
 * Main ApproverConfig Schema
 *
 * Uses discriminated union based on the 'type' field.
 * This provides excellent type safety and clear error messages.
 */
export const ApproverConfigSchema = z.discriminatedUnion('type', [
  ApplicantConfigSchema,
  ApplicantReportingLineConfigSchema,
  SpecificUserReportingLineConfigSchema,
  DepartmentHeadConfigSchema,
  RoleConfigSchema,
  SpecificUsersConfigSchema,
]);

// Export individual schemas for testing
export const ApproverConfigSchemas = {
  Applicant: ApplicantConfigSchema,
  ApplicantReportingLine: ApplicantReportingLineConfigSchema,
  SpecificUserReportingLine: SpecificUserReportingLineConfigSchema,
  DepartmentHead: DepartmentHeadConfigSchema,
  Role: RoleConfigSchema,
  SpecificUsers: SpecificUsersConfigSchema,
};
