import { z } from 'zod';
import { RejectBehaviorSchema } from './common.schema';
import { RejectBehavior } from '../../../types';

/**
 * Reject Configuration Schemas
 *
 * Defines validation rules for different reject behaviors.
 */

// User select options schema
const UserSelectOptionsSchema = z
  .object({
    allow_return_to_applicant: z.boolean().optional(),
    allow_close_application: z.boolean().optional(),
    selectable_node_keys: z.array(z.string()).optional(),
  })
  .refine(
    (options) => {
      // At least one of the action options must be enabled
      const hasReturnToApplicant = options.allow_return_to_applicant === true;
      const hasCloseApplication = options.allow_close_application === true;

      return hasReturnToApplicant || hasCloseApplication;
    },
    {
      message:
        'At least one action must be enabled: allow_return_to_applicant or allow_close_application',
    },
  );

/**
 * Base Reject Config Schema
 *
 * Validates the structure based on behavior type.
 * Note: Context-aware validation (e.g., checking if target_node_key exists in flow)
 * is handled separately in the validator.
 */
export const RejectConfigSchema = z
  .object({
    behavior: RejectBehaviorSchema,
    target_node_key: z.string().optional(),
    user_select_options: UserSelectOptionsSchema.optional(),
  })
  .refine(
    (config) => {
      // If behavior is SEND_TO_SPECIFIC_NODE, target_node_key must be provided and non-empty
      if (config.behavior === RejectBehavior.SEND_TO_SPECIFIC_NODE) {
        return (
          config.target_node_key !== undefined &&
          config.target_node_key.length > 0
        );
      }
      return true;
    },
    {
      message:
        'target_node_key is required and must not be empty when behavior is SEND_TO_SPECIFIC_NODE',
      path: ['target_node_key'],
    },
  )
  .refine(
    (config) => {
      // If behavior is USER_SELECT, user_select_options must be provided
      if (config.behavior === RejectBehavior.USER_SELECT) {
        return config.user_select_options !== undefined;
      }
      return true;
    },
    {
      message: 'user_select_options is required when behavior is USER_SELECT',
      path: ['user_select_options'],
    },
  );
