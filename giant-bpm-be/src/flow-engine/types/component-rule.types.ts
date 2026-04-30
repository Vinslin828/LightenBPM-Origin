export const COMPONENT_RULE_ACTION = {
  HIDE: 'hide',
  EDITABLE: 'editable',
  DISABLED: 'disabled',
  REQUIRED: 'required',
} as const;

export type ComponentRuleAction =
  (typeof COMPONENT_RULE_ACTION)[keyof typeof COMPONENT_RULE_ACTION];

export interface ComponentRule {
  component_name: string;
  actions: ComponentRuleAction[];
  condition?: string;
}
