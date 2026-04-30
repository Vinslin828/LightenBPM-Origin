import { RejectConfigSchema } from './reject-config.schema';
import { RejectBehavior } from '../../../types';

describe('RejectConfigSchema', () => {
  describe('RETURN_TO_APPLICANT', () => {
    it('should accept RETURN_TO_APPLICANT behavior', () => {
      const config = {
        behavior: RejectBehavior.RETURN_TO_APPLICANT,
      };

      const result = RejectConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });
  });

  describe('SEND_TO_SPECIFIC_NODE', () => {
    it('should accept SEND_TO_SPECIFIC_NODE with target_node_key', () => {
      const config = {
        behavior: RejectBehavior.SEND_TO_SPECIFIC_NODE,
        target_node_key: 'approval1',
      };

      const result = RejectConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should reject SEND_TO_SPECIFIC_NODE without target_node_key', () => {
      const config = {
        behavior: RejectBehavior.SEND_TO_SPECIFIC_NODE,
      };

      const result = RejectConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject SEND_TO_SPECIFIC_NODE with empty target_node_key', () => {
      const config = {
        behavior: RejectBehavior.SEND_TO_SPECIFIC_NODE,
        target_node_key: '',
      };

      const result = RejectConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });
  });

  describe('BACK_TO_PREVIOUS_NODE', () => {
    it('should accept BACK_TO_PREVIOUS_NODE behavior', () => {
      const config = {
        behavior: RejectBehavior.BACK_TO_PREVIOUS_NODE,
      };

      const result = RejectConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });
  });

  describe('USER_SELECT', () => {
    it('should reject USER_SELECT with only selectable_node_keys (no action flags)', () => {
      const config = {
        behavior: RejectBehavior.USER_SELECT,
        user_select_options: {
          selectable_node_keys: ['node1', 'node2', 'node3'],
        },
      };

      const result = RejectConfigSchema.safeParse(config);

      // Should fail because no action flags (allow_return_to_applicant or allow_close_application) are enabled
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'At least one action must be enabled',
        );
      }
    });

    it('should accept USER_SELECT with allow_return_to_applicant', () => {
      const config = {
        behavior: RejectBehavior.USER_SELECT,
        user_select_options: {
          allow_return_to_applicant: true,
        },
      };

      const result = RejectConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should accept USER_SELECT with allow_close_application', () => {
      const config = {
        behavior: RejectBehavior.USER_SELECT,
        user_select_options: {
          allow_close_application: true,
        },
      };

      const result = RejectConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should accept USER_SELECT with multiple options', () => {
      const config = {
        behavior: RejectBehavior.USER_SELECT,
        user_select_options: {
          allow_return_to_applicant: true,
          allow_close_application: true,
          selectable_node_keys: ['node1', 'node2'],
        },
      };

      const result = RejectConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });

    it('should reject USER_SELECT without user_select_options', () => {
      const config = {
        behavior: RejectBehavior.USER_SELECT,
      };

      const result = RejectConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject USER_SELECT with no enabled options', () => {
      const config = {
        behavior: RejectBehavior.USER_SELECT,
        user_select_options: {
          allow_return_to_applicant: false,
          allow_close_application: false,
        },
      };

      const result = RejectConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject USER_SELECT with empty selectable_node_keys and no action flags', () => {
      const config = {
        behavior: RejectBehavior.USER_SELECT,
        user_select_options: {
          selectable_node_keys: [],
        },
      };

      const result = RejectConfigSchema.safeParse(config);

      // Should fail because no action flags are enabled
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          'At least one action must be enabled',
        );
      }
    });
  });

  describe('CLOSE_APPLICATION', () => {
    it('should accept CLOSE_APPLICATION behavior', () => {
      const config = {
        behavior: RejectBehavior.CLOSE_APPLICATION,
      };

      const result = RejectConfigSchema.safeParse(config);

      expect(result.success).toBe(true);
    });
  });

  describe('Invalid configurations', () => {
    it('should reject config without behavior', () => {
      const config = {};

      const result = RejectConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject config with invalid behavior', () => {
      const config = {
        behavior: 'INVALID_BEHAVIOR',
      };

      const result = RejectConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });

    it('should reject config with null behavior', () => {
      const config = {
        behavior: null,
      };

      const result = RejectConfigSchema.safeParse(config);

      expect(result.success).toBe(false);
    });
  });

  describe('Extra fields handling', () => {
    it('should ignore extra fields for RETURN_TO_APPLICANT', () => {
      const config = {
        behavior: RejectBehavior.RETURN_TO_APPLICANT,
        target_node_key: 'should_be_ignored',
        selectable_nodes: ['should', 'be', 'ignored'],
      };

      const result = RejectConfigSchema.safeParse(config);

      // Should still be valid as extra fields are typically ignored by Zod
      expect(result.success).toBe(true);
    });

    it('should accept SEND_TO_SPECIFIC_NODE with extra selectable_nodes field', () => {
      const config = {
        behavior: RejectBehavior.SEND_TO_SPECIFIC_NODE,
        target_node_key: 'node1',
        selectable_nodes: ['should', 'be', 'ignored'],
      };

      const result = RejectConfigSchema.safeParse(config);

      // Should still be valid
      expect(result.success).toBe(true);
    });
  });
});
