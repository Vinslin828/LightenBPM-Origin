import { z } from 'zod';
import { COMPONENT_RULE_ACTION } from '../../../types';

/**
 * Component rule schema used by start nodes and approver configs.
 */
export const ComponentRuleSchema = z.object({
  component_name: z.string().min(1, 'Component name is required'),
  actions: z
    .array(
      z.enum([
        COMPONENT_RULE_ACTION.HIDE,
        COMPONENT_RULE_ACTION.EDITABLE,
        COMPONENT_RULE_ACTION.DISABLED,
        COMPONENT_RULE_ACTION.REQUIRED,
      ]),
    )
    .min(1, 'At least one action is required'),
  condition: z.string().optional(),
});
