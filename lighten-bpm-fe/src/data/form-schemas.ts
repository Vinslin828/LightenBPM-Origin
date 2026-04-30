// Form Schema Definitions
// Sample and initial form schemas for the form builder

import { EntityKey } from "@/types/form-builder";

export const initialSchema = {
  entities: {
    "a68836dc-1478-435f-bdee-ca7aff098993": {
      type: EntityKey.textField as const,
      attributes: {
        width: 12,
        name: "first_name",
        label: "First Name",
        inputType: "text" as const,
        placeholder: "Enter your first name",
        disabled: false,
        readonly: false,
        defaultValue: "",
        required: true,
        flowType: ["recursive" as const],
      },
    },
    "18950fc8-81f6-4927-91c0-880c36a56deb": {
      type: EntityKey.textField as const,
      attributes: {
        width: 12,
        name: "last_name",
        label: "Last Name",
        inputType: "text" as const,
        placeholder: "Enter your last name",
        disabled: false,
        readonly: false,
        defaultValue: "",
        required: true,
        flowType: ["recursive" as const],
      },
    },
    "39ea99a0-9f37-4446-9376-d93d6d7c35c5": {
      type: EntityKey.textareaField as const,
      attributes: {
        name: "textarea_field",
        width: 12,
        label: "About You",
        required: false,
        placeholder: "Tell us about yourself",
        defaultValue: "",
        disabled: false,
        readonly: false,
        flowType: undefined,
      },
    },
  },
  root: [
    "a68836dc-1478-435f-bdee-ca7aff098993",
    "18950fc8-81f6-4927-91c0-880c36a56deb",
    "39ea99a0-9f37-4446-9376-d93d6d7c35c5",
  ],
};
