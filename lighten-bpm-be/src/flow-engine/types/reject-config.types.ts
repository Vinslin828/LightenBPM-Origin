export enum RejectBehavior {
  RETURN_TO_APPLICANT = 'return_to_applicant',
  SEND_TO_SPECIFIC_NODE = 'send_to_specific_node',
  BACK_TO_PREVIOUS_NODE = 'back_to_previous_node',
  USER_SELECT = 'user_select',
  CLOSE_APPLICATION = 'close_application',
}

export interface UserSelectOptions {
  // Allow user to select "return to applicant"
  allow_return_to_applicant?: boolean;

  // Allow user to select "close application"
  allow_close_application?: boolean;

  // List of approval nodes that user can select to reject to
  // If provided, at least one "guaranteed" node must be pre-selected in frontend
  selectable_node_keys?: string[];
}

export interface RejectConfig {
  behavior: RejectBehavior;

  // Required when behavior = SEND_TO_SPECIFIC_NODE
  // Must be a "guaranteed" preceding approval node
  target_node_key?: string;

  // Required when behavior = USER_SELECT
  // At least one option must be enabled
  user_select_options?: UserSelectOptions;
}
