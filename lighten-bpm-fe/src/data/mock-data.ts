import { faker } from "@faker-js/faker";
import { getDefaultAttributes } from "@/const/form-builder";
import { Tag, FormDefinition, FlowDefinition, User } from "@/types/domain";
import { EntityKey, FormStatus } from "@/types/form-builder";
import { ApproverType, WorkflowNode, WorkflowNodeKey } from "@/types/flow";
import { Edge } from "@xyflow/react";
import { Application, OverallStatus, ReviewStatus } from "../types/application";
// import { User } from "@/schemas/auth";

import { ExpenseForm, FinancialForm } from "./mock-form";
import { EXPENSE_FLOW } from "./mock-flow";

export const mockUsers: User[] = [
  {
    id: "user-john",
    code: "",
    name: "John Doe",
    email: "john@example.com",
    roles: [],
    tags: [],
    jobGrade: 30,
    defaultOrgId: "",
    defaultOrgCode: "",
    isAdmin: false,
  },
  {
    id: "user-jane",
    code: "",
    name: "Jane Smith",
    email: "jane@example.com",
    roles: [],
    tags: [],
    jobGrade: 40,
    defaultOrgId: "",
    defaultOrgCode: "",
    isAdmin: false,
  },
  {
    id: "admin-user",
    code: "",
    name: "Admin User",
    email: "admin@example.com",
    roles: [],
    tags: [],
    jobGrade: 50,
    defaultOrgId: "",
    defaultOrgCode: "",
    isAdmin: false,
  },
  {
    id: "mock-gac-user",
    code: "",
    name: "Mock Gac User",
    email: "mock-gac-user@example.com",
    roles: [],
    tags: [],
    jobGrade: 60,
    defaultOrgId: "",
    defaultOrgCode: "",
    isAdmin: false,
  },
];
export const mockTags: Tag[] = [
  // {
  //   id: "dept_usecase",
  //   name: "Lighten use case",
  //   description: "Lighten use case",
  //   color: "#000000",
  //   abbrev: "Lighten",
  // },
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
  {
    id: "dept_finance",
    name: "Finance",
    description: "Manages company finances, budgeting, and expense claims.",
    color: "#F27430",
    abbrev: "Finance",
    createdAt: "",
    createdBy: "",
  },
  // {
  //   id: "dept_procurement",
  //   name: "Procurement",
  //   description:
  //     "Responsible for acquiring goods and services for the company.",
  // },
  {
    id: "dept_it",
    name: "Information Services (IT)",
    description:
      "Manages IT infrastructure, software, and provides tech support.",
    color: "#01A9DB",
    abbrev: "IT",
    createdAt: "",
    createdBy: "",
  },
  {
    id: "dept_admin",
    name: "Administration",
    description: "Oversees daily office operations and administrative support.",
    color: "#13C296",
    abbrev: "Administration",
    createdAt: "",
    createdBy: "",
  },
  // {
  //   id: "dept_sales",
  //   name: "Sales",
  //   description: "Drives business growth by selling products or services.",
  // },
  {
    id: "dept_marketing",
    name: "Marketing",
    description: "Promotes the company, products, and brand to the public.",
    color: "#FBBF24",
    abbrev: "Marketing",
    createdAt: "",
    createdBy: "",
  },

  // {
  //   id: "dept_design",
  //   name: "Design",
  //   description: "Creates visual concepts, branding, and product designs.",
  // },
];

// Generate 20 mock forms

export const mockForms: FormDefinition[] = [
  // ExpenseForm,
  FinancialForm,
  ...Array.from({ length: 20 }, () => {
    const tag = faker.helpers.arrayElement(
      mockTags.filter((d) => d.id !== "dept_usecase"),
    );
    return {
      id: `form_${faker.string.uuid()}`,
      revisionId: "",
      validation: {
        required: false,
        validators: [],
      },
      name: faker.helpers.arrayElement([
        "Leave Request",
        "Expense Claim",
        "IT Support",
        "Travel Request",
        "Purchase Order",
        "Training Request",
      ]),
      description: faker.lorem.sentence(),
      tags: [tag],
      schema: {
        entities: {
          "a68836dc-1478-435f-bdee-ca7aff098993": {
            type: EntityKey.textField as const,
            attributes: {
              ...getDefaultAttributes(EntityKey.textField),
              width: 12,
              name: "title",
              label: { isReference: false, value: faker.lorem.word() },
              inputType: "text" as const,
              placeholder: { isReference: false, value: faker.lorem.words(3) },
              required: faker.datatype.boolean(),
              disabled: false,
              readonly: false,
              defaultValue: { value: undefined, isReference: false },
              validator: {
                required: false,
              },
            },
          },
          "18950fc8-81f6-4927-91c0-880c36a56deb": {
            type: EntityKey.datePickerField as const,
            attributes: {
              ...getDefaultAttributes(EntityKey.datePickerField),
              width: 6,
              label: { isReference: false, value: "Date" },
              required: true,
              defaultValue: { isReference: false },
              validator: {
                required: false,
              },
              disabled: false,
              readonly: false,
              dateSubtype: "date" as const,
            },
          },
          "39ea99a0-9f37-4446-9376-d93d6d7c35c5": {
            type: EntityKey.textareaField as const,
            attributes: {
              ...getDefaultAttributes(EntityKey.textareaField),
              width: 12,
              label: { isReference: false, value: "Description" },
              placeholder: { isReference: false, value: "Enter details here" },
              required: true,
              defaultValue: { value: undefined, isReference: false },
              validator: {
                required: false,
              },
            },
          },
        },
        root: [
          "a68836dc-1478-435f-bdee-ca7aff098993",
          "18950fc8-81f6-4927-91c0-880c36a56deb",
          "39ea99a0-9f37-4446-9376-d93d6d7c35c5",
        ],
      },
      version: faker.number.int({ min: 1, max: 5 }),
      publishStatus: faker.helpers.arrayElement([
        FormStatus.Draft,
        FormStatus.Published,
      ]),
      createdAt: faker.date.past().toString(),
      updatedAt: faker.date.recent().toString(),
    };
  }),
];

// Generate 15 mock flows
export const mockFlows: FlowDefinition[] = [
  EXPENSE_FLOW,
  ...Array.from({ length: 15 }, (_, i) => {
    const tag = faker.helpers.arrayElement(
      mockTags.filter((d) => d.id !== "dept_usecase"),
    );
    const form = faker.helpers.arrayElement(
      mockForms.filter((f) => f.id !== "expense-form"),
    );

    // Create a simple 3-node workflow
    const nodes: WorkflowNode[] = [
      {
        id: "form-node",
        type: WorkflowNodeKey.Form,
        position: { x: 250, y: 50 },
        data: {
          form: form,
          next: "",
          parents: [],
        },
      },
      {
        id: "2",
        type: WorkflowNodeKey.Approval,
        position: { x: 250, y: 250 },
        data: {
          approver: ApproverType.User,
          specificUser: { type: "manual", userIds: ["user-john"] },
          label: "Manager Approval",
          next: "",
          parents: [],
        },
      },
      {
        id: "end-node",
        type: WorkflowNodeKey.End,
        position: { x: 250, y: 450 },
        data: {
          label: "End",
          next: "",
          parents: [],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: "eform-node-2",
        source: "form-node",
        target: "2",
      },
      { id: "e2-end-node", source: "2", target: "end-node" },
    ];

    return {
      id: `flow_${faker.string.uuid()}`,
      revisionId: "",
      name: `Workflow Example ${i + 1}`,
      description: faker.lorem.sentence(),
      tags: [tag],
      version: faker.number.int({ min: 1, max: 3 }),
      nodes,
      edges,
      createdAt: faker.date.past().toISOString(),
      updatedAt: faker.date.recent().toISOString(),
      publishStatus: faker.helpers.arrayElement([
        FormStatus.Draft,
        FormStatus.Published,
      ]),
    };
  }),
];

const createSpecificApplication = ({
  submittedBy,
  assigneeId,
  overallStatus,
  approvalStatus,
}: {
  submittedBy: string;
  assigneeId: string;
  overallStatus: OverallStatus;
  approvalStatus: ReviewStatus;
}): Application => {
  const form = faker.helpers.arrayElement(
    mockForms.filter((f) => f.id !== "expense-form"),
  );
  const workflow = faker.helpers.arrayElement(mockFlows);

  const formData: Record<string, any> = {};
  if (form.schema && form.schema.entities) {
    const titleEntityId = Object.keys(form.schema.entities).find(
      (id) => form.schema.entities[id].attributes.name === "title",
    );
    const dateEntityId = Object.keys(form.schema.entities).find(
      (id) => form.schema.entities[id].type === EntityKey.datePickerField,
    );
    const descEntityId = Object.keys(form.schema.entities).find(
      (id) => form.schema.entities[id].type === EntityKey.textareaField,
    );

    if (titleEntityId) formData[titleEntityId] = faker.lorem.sentence();
    if (dateEntityId) formData[dateEntityId] = faker.date.recent();
    if (descEntityId) formData[descEntityId] = faker.lorem.paragraph();
  }

  return {
    id: `app_${faker.string.uuid()}`,
    overallStatus: overallStatus,
    reviewStatus: approvalStatus,
    approvalId: "",
    submittedAt: faker.date.past().toISOString(),
    submittedBy,
    assigneeId,
    serialNumber: `APP-${faker.string.numeric(8)}`,
    formInstance: {
      form: form,
      data: formData,
    },
    workflowInstance: {
      workflow: workflow,
      data: {},
    },
  };
};

const specificMockApplications: Application[] = [
  // #1: mock-gac-user-id as assignee, InProgress
  createSpecificApplication({
    submittedBy: "user-john",
    assigneeId: "mock-gac-user-id",
    overallStatus: OverallStatus.InProgress,
    approvalStatus: ReviewStatus.Pending,
  }),
  createSpecificApplication({
    submittedBy: "user-jane",
    assigneeId: "mock-gac-user-id",
    overallStatus: OverallStatus.InProgress,
    approvalStatus: ReviewStatus.Pending,
  }),
  // #2: admin-user as assignee, InProgress
  createSpecificApplication({
    submittedBy: "user-john",
    assigneeId: "admin-user",
    overallStatus: OverallStatus.InProgress,
    approvalStatus: ReviewStatus.Pending,
  }),
  createSpecificApplication({
    submittedBy: "user-jane",
    assigneeId: "admin-user",
    overallStatus: OverallStatus.InProgress,
    approvalStatus: ReviewStatus.Pending,
  }),
  // #3: mock-gac-user-id as submittedBy, InProgress
  createSpecificApplication({
    submittedBy: "mock-gac-user-id",
    assigneeId: "user-john",
    overallStatus: OverallStatus.InProgress,
    approvalStatus: ReviewStatus.Pending,
  }),
  createSpecificApplication({
    submittedBy: "mock-gac-user-id",
    assigneeId: "user-jane",
    overallStatus: OverallStatus.InProgress,
    approvalStatus: ReviewStatus.Pending,
  }),
  // #4: mock-gac-user-id as submittedBy, Approved
  createSpecificApplication({
    submittedBy: "mock-gac-user-id",
    assigneeId: "user-john",
    overallStatus: OverallStatus.CompletedApproved,
    approvalStatus: ReviewStatus.Approved,
  }),
  createSpecificApplication({
    submittedBy: "mock-gac-user-id",
    assigneeId: "user-jane",
    overallStatus: OverallStatus.CompletedRejected,
    approvalStatus: ReviewStatus.Rejected,
  }),
  // #5: admin-user as submittedBy, InProgress
  createSpecificApplication({
    submittedBy: "admin-user",
    assigneeId: "user-john",
    overallStatus: OverallStatus.InProgress,
    approvalStatus: ReviewStatus.Pending,
  }),
  createSpecificApplication({
    submittedBy: "admin-user",
    assigneeId: "user-jane",
    overallStatus: OverallStatus.InProgress,
    approvalStatus: ReviewStatus.Pending,
  }),
  // #6: admin-user as submittedBy, Approved
  createSpecificApplication({
    submittedBy: "admin-user",
    assigneeId: "user-john",
    overallStatus: OverallStatus.CompletedApproved,
    approvalStatus: ReviewStatus.Approved,
  }),
  createSpecificApplication({
    submittedBy: "admin-user",
    assigneeId: "user-jane",
    overallStatus: OverallStatus.CompletedRejected,
    approvalStatus: ReviewStatus.Rejected,
  }),
];

export const mockApplications: Application[] = [
  ...specificMockApplications,
  ...Array.from({ length: 5 }, (_, i) => {
    const form = faker.helpers.arrayElement(
      mockForms.filter((f) => f.id !== "expense-form"),
    );
    const workflow = faker.helpers.arrayElement(mockFlows);

    // Generate form data that is consistent with the form's schema
    const formData: Record<string, any> = {};
    if (form.schema && form.schema.entities) {
      // This logic assumes the mock schema structure (one title, one date, one description)
      // It finds the actual IDs for those fields and uses them as keys.
      const titleEntityId = Object.keys(form.schema.entities).find(
        (id) => form.schema.entities[id].attributes.name === "title",
      );
      const dateEntityId = Object.keys(form.schema.entities).find(
        (id) => form.schema.entities[id].type === EntityKey.datePickerField,
      );
      const descEntityId = Object.keys(form.schema.entities).find(
        (id) => form.schema.entities[id].type === EntityKey.textareaField,
      );

      if (titleEntityId) formData[titleEntityId] = faker.lorem.sentence();
      if (dateEntityId) formData[dateEntityId] = faker.date.recent();
      if (descEntityId) formData[descEntityId] = faker.lorem.paragraph();
    }

    return {
      id: `app_${faker.string.uuid()}`,
      approvalId: "",
      overallStatus: faker.helpers.arrayElement([
        OverallStatus.CompletedApproved,
        OverallStatus.Draft,
        OverallStatus.InProgress,
        OverallStatus.CompletedRejected,
        OverallStatus.Canceled,
      ]),
      reviewStatus: faker.helpers.arrayElement([
        ReviewStatus.Approved,
        ReviewStatus.Pending,
        ReviewStatus.Rejected,
      ]),
      submittedAt: faker.date.past().toISOString(),
      submittedBy: faker.helpers.arrayElement(mockUsers).id,
      assigneeId: faker.helpers.arrayElement(mockUsers).id,
      serialNumber: `APP-${faker.string.numeric(8)}`,
      formInstance: {
        form: form,
        data: formData,
      },
      workflowInstance: {
        workflow: workflow,
        data: {},
      },
    };
  }),
];

export const mockUsersOptions = [
  { label: "Sam Lee", value: "user-sam" },
  { label: "John Doe", value: "user-john" },
  { label: "Jane Smith", value: "user-jane" },
  { label: "Admin User", value: "admin-user", id: "admin-user" },
  { label: "Mock Gac User", value: "mock-gac-user", id: "mock-gac-user-id" },
];

export const mockRoles = [
  { label: "Manager", value: "role-manager" },
  { label: "Developer", value: "role-dev" },
  { label: "QA", value: "role-qa" },
];
