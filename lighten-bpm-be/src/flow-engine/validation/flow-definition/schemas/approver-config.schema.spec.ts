import { ApproverConfigSchema } from './approver-config.schema';
import { ApproverType, ReportingLineMethod, SourceType } from '../../../types';

describe('ApproverConfigSchema', () => {
  describe('APPLICANT type', () => {
    it('should accept valid applicant config', () => {
      const config = {
        type: ApproverType.APPLICANT,
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should accept applicant config with optional fields', () => {
      const config = {
        type: ApproverType.APPLICANT,
        reuse_prior_approvals: true,
        description: 'Test description',
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });
  });

  describe('APPLICANT_REPORTING_LINE type', () => {
    it('should accept config with TO_JOB_GRADE method', () => {
      const config = {
        type: ApproverType.APPLICANT_REPORTING_LINE,
        config: {
          method: ReportingLineMethod.TO_JOB_GRADE,
          job_grade: 5,
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should accept config with TO_LEVEL method', () => {
      const config = {
        type: ApproverType.APPLICANT_REPORTING_LINE,
        config: {
          method: ReportingLineMethod.TO_LEVEL,
          level: 3,
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should accept config with optional org_reference_field', () => {
      const config = {
        type: ApproverType.APPLICANT_REPORTING_LINE,
        config: {
          method: ReportingLineMethod.TO_JOB_GRADE,
          job_grade: 5,
          org_reference_field: 'department_id',
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should reject TO_JOB_GRADE without job_grade', () => {
      const config = {
        type: ApproverType.APPLICANT_REPORTING_LINE,
        config: {
          method: ReportingLineMethod.TO_JOB_GRADE,
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject TO_LEVEL without level', () => {
      const config = {
        type: ApproverType.APPLICANT_REPORTING_LINE,
        config: {
          method: ReportingLineMethod.TO_LEVEL,
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });
  });

  describe('SPECIFIC_USER_REPORTING_LINE type', () => {
    it('should accept config with MANUAL source and user_id', () => {
      const config = {
        type: ApproverType.SPECIFIC_USER_REPORTING_LINE,
        config: {
          source: SourceType.MANUAL,
          user_id: 123,
          method: ReportingLineMethod.TO_JOB_GRADE,
          job_grade: 5,
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should accept config with FORM_FIELD source and form_field', () => {
      const config = {
        type: ApproverType.SPECIFIC_USER_REPORTING_LINE,
        config: {
          source: SourceType.FORM_FIELD,
          form_field: 'manager_id',
          method: ReportingLineMethod.TO_LEVEL,
          level: 3,
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should reject MANUAL source without user_id', () => {
      const config = {
        type: ApproverType.SPECIFIC_USER_REPORTING_LINE,
        config: {
          source: SourceType.MANUAL,
          method: ReportingLineMethod.TO_JOB_GRADE,
          job_grade: 5,
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject FORM_FIELD source without form_field', () => {
      const config = {
        type: ApproverType.SPECIFIC_USER_REPORTING_LINE,
        config: {
          source: SourceType.FORM_FIELD,
          method: ReportingLineMethod.TO_LEVEL,
          level: 2,
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should accept TO_JOB_GRADE method with job_grade', () => {
      const config = {
        type: ApproverType.SPECIFIC_USER_REPORTING_LINE,
        config: {
          source: SourceType.MANUAL,
          user_id: 123,
          method: ReportingLineMethod.TO_JOB_GRADE,
          job_grade: 5,
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should reject TO_JOB_GRADE method without job_grade', () => {
      const config = {
        type: ApproverType.SPECIFIC_USER_REPORTING_LINE,
        config: {
          source: SourceType.MANUAL,
          user_id: 123,
          method: ReportingLineMethod.TO_JOB_GRADE,
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });
  });

  describe('DEPARTMENT_HEAD type', () => {
    it('should accept config with MANUAL source and org_unit_id', () => {
      const config = {
        type: ApproverType.DEPARTMENT_HEAD,
        config: {
          source: SourceType.MANUAL,
          org_unit_id: 456,
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should accept config with FORM_FIELD source and form_field', () => {
      const config = {
        type: ApproverType.DEPARTMENT_HEAD,
        config: {
          source: SourceType.FORM_FIELD,
          form_field: 'department_field',
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should reject MANUAL source without org_unit_id', () => {
      const config = {
        type: ApproverType.DEPARTMENT_HEAD,
        config: {
          source: SourceType.MANUAL,
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject FORM_FIELD source without form_field', () => {
      const config = {
        type: ApproverType.DEPARTMENT_HEAD,
        config: {
          source: SourceType.FORM_FIELD,
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });
  });

  describe('ROLE type', () => {
    it('should accept valid role config', () => {
      const config = {
        type: ApproverType.ROLE,
        config: {
          role_id: 789,
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should reject role config without role_id', () => {
      const config = {
        type: ApproverType.ROLE,
        config: {},
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject role config with invalid role_id type', () => {
      const config = {
        type: ApproverType.ROLE,
        config: {
          role_id: 'invalid',
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });
  });

  describe('SPECIFIC_USERS type', () => {
    it('should accept valid specific users config', () => {
      const config = {
        type: ApproverType.SPECIFIC_USERS,
        config: {
          user_ids: [1, 2, 3],
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should reject empty user_ids array', () => {
      const config = {
        type: ApproverType.SPECIFIC_USERS,
        config: {
          user_ids: [],
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject config without user_ids', () => {
      const config = {
        type: ApproverType.SPECIFIC_USERS,
        config: {},
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject user_ids with non-numeric values', () => {
      const config = {
        type: ApproverType.SPECIFIC_USERS,
        config: {
          user_ids: [1, 'invalid', 3],
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject negative user IDs', () => {
      const config = {
        type: ApproverType.SPECIFIC_USERS,
        config: {
          user_ids: [1, -2, 3],
        },
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });
  });

  describe('Invalid type', () => {
    it('should reject unknown approver type', () => {
      const config = {
        type: 'unknown_type',
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject missing type field', () => {
      const config = {
        config: {},
      };

      const result = ApproverConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });
  });
});
