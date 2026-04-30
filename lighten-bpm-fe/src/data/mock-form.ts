import { FormDefinition } from "@/types/domain";
import { EntityKey, FormStatus } from "@/types/form-builder";

export const FinancialForm: FormDefinition = {
  id: "financial-form",
  revisionId: "",
  validation: {
    required: false,
    validators: [],
  },
  name: "Expense Claim Form",
  description: "This is an Expense Claim Form for demo",
  schema: {
    root: [
      "f2a3d835-9ebd-483d-8e8e-e57fac298b86",
      "024df8df-f43f-428b-979e-a549df730943",
      "167ee5c2-497e-47d4-aa0b-72a96b29de29",
      "72f3ca7e-19f1-41c0-819d-6e1af255e727",
    ],
    entities: {
      "f2a3d835-9ebd-483d-8e8e-e57fac298b86": {
        attributes: {
          width: 12,
          name: "text_field_mh8nw0fazpzyo",
          label: {
            isReference: false,
            value: "Item",
          },
          inputType: "text",
          placeholder: {
            isReference: false,
            value: "Enter text",
          },
          disabled: false,
          readonly: false,
          defaultValue: {
            isReference: false,
            value: "",
          },
          required: false,
          validator: {
            required: false,
          },
        },
        type: EntityKey.textField,
      },

      "167ee5c2-497e-47d4-aa0b-72a96b29de29": {
        attributes: {
          width: 12,
          label: {
            isReference: false,
            value: "Amount",
          },
          defaultValue: {
            isReference: false,
            value: undefined,
          },
          validator: {
            required: false,
          },
          required: false,
          // expression: "",
          decimalDigits: 0,
          name: "number_field",
        },
        type: EntityKey.numberField,
      },
      "024df8df-f43f-428b-979e-a549df730943": {
        attributes: {
          width: 12,
          name: "date_picker_field_mh8nw0fapvjrh",
          label: {
            isReference: false,
            value: "Purchase Date",
          },
          defaultValue: {
            isReference: false,
            value: undefined,
          },
          validator: {
            required: false,
          },
          required: false,
          disabled: false,
          readonly: false,
          dateSubtype: "date" as const,
        },
        type: EntityKey.datePickerField,
      },
      "72f3ca7e-19f1-41c0-819d-6e1af255e727": {
        attributes: {
          name: "textarea_field_mh8nw0fangqhd",
          width: 12,
          label: {
            isReference: false,
            value: "Description",
          },
          placeholder: {
            isReference: false,
            value: "Type here...",
          },
          defaultValue: {
            isReference: false,
            value: undefined,
          },
          validator: {
            required: false,
          },
          required: false,
        },
        type: EntityKey.textareaField,
      },
    },
  },
  version: 0,
  createdAt: "",
  updatedAt: "",
  publishStatus: FormStatus.Draft,
  tags: [
    {
      id: "dept_hr",
      name: "Human Resources (HR)",
      description:
        "Handles all employee-related matters, recruitment, and benefits.",
      color: "#8646F4",
      abbrev: "HR",
      createdAt: "",
      createdBy: "",
    },
  ],
};
export const ExpenseForm: FormDefinition = {
  id: "expense-form",
  revisionId: "",
  name: "費用申請表單",
  description: `⭐以簽核職級為例 (子公司費用申請):
  1. 所有費用，至少核一階主管
  2. 費用< 10萬，核至職級60
  3. 費用於職級60 核完後，會簽至總部人員 會簽完成
  4. 費用>= 10萬，且< 50萬，依申請人reporting line 往上簽核，核至職級80 (須排除已經簽核過的直
  5. 主管職級50 & 60) 費用>= 50萬，核至主管職級110
  
  ⭐Dylan Tsai (jobgrade: 30) 費用 >= 10萬，且 < 50萬
  `,
  validation: {
    required: false,
    validators: [],
  },
  schema: {
    root: [
      //   "e6b652a6-3029-4be8-8fba-3dbbd0a05041",
      //   "9a0ac96d-7369-4c61-be9c-b359410d1981",
      //   "8d8dec3a-61a4-4fbb-b072-84b8f0f1db69",
      //   "706d860a-e859-4219-ac18-50e2262712c8",
      "ddf0a663-fd18-464f-9790-b5198cf2cbaa",
      //   "226c11c9-ffad-4092-bacf-b14b1f0281cf",
      //   "ef45fe50-2f63-40fb-ad0e-15808c2b31b6",
      "287ea9e8-6303-475d-aa36-c41fa70625c6",
      "dd3994cc-142a-4013-95aa-a2065a96b51c",
      "eafcf103-c0ea-46b9-876e-e3236c03aacf",
      "7068cb84-8f34-4855-9241-a909c99b1dfb",
    ],
    entities: {
      //   "e6b652a6-3029-4be8-8fba-3dbbd0a05041": {
      //     attributes: {
      //       width: 12,
      //       name: "text_field_mhoh4mmvjplmo",
      //       label: "Application Name",
      //       inputType: "text",
      //       placeholder: "Enter text",
      //       disabled: false,
      //       readonly: false,
      //       defaultValue: "",
      //       required: true,
      //     },
      //     type: EntityKey.textField,
      //   },
      //   "9a0ac96d-7369-4c61-be9c-b359410d1981": {
      //     attributes: {
      //       width: 12,
      //       name: "text_field_mhoh4mmvjplmo",
      //       label: "Employee ID",
      //       inputType: "text",
      //       placeholder: "Enter text",
      //       disabled: false,
      //       readonly: false,
      //       defaultValue: "",
      //       required: true,
      //     },
      //     type: EntityKey.textField,
      //   },
      //   "8d8dec3a-61a4-4fbb-b072-84b8f0f1db69": {
      //     attributes: {
      //       width: 12,
      //       name: "text_field_mhoh4mmvjplmo",
      //       label: "Department Name",
      //       inputType: "text",
      //       placeholder: "Enter text",
      //       disabled: false,
      //       readonly: false,
      //       defaultValue: "",
      //       required: true,
      //     },
      //     type: EntityKey.textField,
      //   },
      //   "706d860a-e859-4219-ac18-50e2262712c8": {
      //     attributes: {
      //       width: 12,
      //       name: "text_field_mhoh4mmvjplmo",
      //       label: "Expense Type",
      //       inputType: "text",
      //       placeholder: "Enter text",
      //       disabled: false,
      //       readonly: false,
      //       defaultValue: "",
      //       required: true,
      //     },
      //     type: EntityKey.textField,
      //   },
      "ddf0a663-fd18-464f-9790-b5198cf2cbaa": {
        attributes: {
          width: 12,
          name: "text_field_mhoh4mmvjplmo",
          label: {
            isReference: false,
            value: "Expense Item",
          },
          inputType: "text",
          placeholder: {
            isReference: false,
            value: "Enter text",
          },
          disabled: false,
          readonly: false,
          defaultValue: {
            isReference: false,
            value: "",
          },
          required: true,
          validator: {
            required: false,
          },
        },
        type: EntityKey.textField,
      },
      //   "226c11c9-ffad-4092-bacf-b14b1f0281cf": {
      //     attributes: {
      //       width: 12,
      //       label: "Quantity",
      //       required: true,
      //       expression: "",
      //       decimalDigits: 0,
      //       name: "employee id",
      //     },
      //     type: EntityKey.numberField,
      //   },
      //   "ef45fe50-2f63-40fb-ad0e-15808c2b31b6": {
      //     attributes: {
      //       width: 12,
      //       label: "Unit Price",
      //       required: true,
      //       expression: "",
      //       decimalDigits: 0,
      //       name: "unit price",
      //     },
      //     type: EntityKey.numberField,
      //   },
      "287ea9e8-6303-475d-aa36-c41fa70625c6": {
        attributes: {
          width: 12,
          label: {
            isReference: false,
            value: "Amount",
          },
          defaultValue: {
            isReference: false,
            value: undefined,
          },
          validator: {
            required: false,
          },
          required: true,
          // expression: "",
          decimalDigits: 0,
          name: "amount-field",
        },
        type: EntityKey.numberField,
      },
      "dd3994cc-142a-4013-95aa-a2065a96b51c": {
        attributes: {
          width: 12,
          name: "date_picker_field_mhoh4mmvm5xmf",
          label: {
            isReference: false,
            value: "Expense Date",
          },
          defaultValue: {
            isReference: false,
            value: undefined,
          },
          validator: {
            required: false,
          },
          required: true,
          disabled: false,
          readonly: false,
          dateSubtype: "date" as const,
        },
        type: EntityKey.datePickerField,
      },
      "eafcf103-c0ea-46b9-876e-e3236c03aacf": {
        attributes: {
          width: 12,
          name: "text_field_mhoh4mmvjplmo",
          label: {
            isReference: false,
            value: "Receipt No.",
          },
          inputType: "text",
          placeholder: {
            isReference: false,
            value: "Enter text",
          },
          disabled: false,
          readonly: false,
          defaultValue: {
            isReference: false,
            value: "",
          },
          required: true,
          validator: {
            required: true,
          },
        },
        type: EntityKey.textField,
      },
      "7068cb84-8f34-4855-9241-a909c99b1dfb": {
        attributes: {
          name: "textarea_field_mhoh4mmvmwcrr",
          width: 12,
          label: {
            isReference: false,
            value: "Expense Description",
          },
          placeholder: {
            isReference: false,
            value: "Type here...",
          },
          defaultValue: {
            isReference: false,
            value: undefined,
          },
          validator: {
            required: false,
          },
          required: true,
        },
        type: EntityKey.textareaField,
      },
    },
  },
  createdAt: "",
  updatedAt: "",
  version: 0,
  publishStatus: FormStatus.Published,
  tags: [
    {
      id: "dept_usecase",
      name: "Lighten use case",
      description: "Lighten use case",
      color: "#000000",
      abbrev: "Lighten",
      createdAt: "",
      createdBy: "",
    },
  ],
};
