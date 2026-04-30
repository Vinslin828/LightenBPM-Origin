import { deparseFlow } from "../workflow/transform";
import { tTag, tUser } from "../master-data/transform";
import { FormStatus } from "@/types/form-builder";
import {
  Application,
  ApplicationForm,
  Comment,
  OverallStatus,
  ReviewStatus,
} from "@/types/application";
import {
  ApplicationApprovalResponse,
  ApplicationFormListResponse,
  ApplicationFormResponse,
  ApplicationListItemResponse,
  ApplicationResponse,
  CommentResponse,
} from "./response";
import { FlowDefinition, FormDefinition, PaginatedData } from "@/types/domain";
import { FormResponse } from "../form/response";
import { transformPaginatedResponse } from "../shared";
import { deparseFormData } from "@/utils/parser";

function tStatus(
  status: ApplicationListItemResponse["overallStatus"],
): OverallStatus {
  switch (status) {
    case "CANCELLED":
      return OverallStatus.Canceled;
    case "COMPLETED":
      return OverallStatus.CompletedApproved;
    case "DRAFT":
      return OverallStatus.Draft;
    case "REJECTED":
      return OverallStatus.CompletedRejected;
    case "RUNNING":
      return OverallStatus.InProgress;
    case "REPLACED":
      return OverallStatus.Canceled;
  }
}

function tReviewStatus(
  status: ApplicationListItemResponse["approvalStatus"],
): ReviewStatus | null {
  switch (status) {
    case "CANCELLED":
      return ReviewStatus.Canceled;
    case "REJECTED":
      return ReviewStatus.Rejected;
    case "PENDING":
      return ReviewStatus.Pending;
    case "APPROVED":
      return ReviewStatus.Approved;
    case "WAITING":
      return ReviewStatus.NotStarted;
  }
}

export function tApplicationListItemSchema(
  item: ApplicationListItemResponse,
): Application {
  console.debug(item);
  return {
    serialNumber: item.serial_number,
    overallStatus: tStatus(item.overallStatus),
    submittedAt: item.submittedAt ?? "",
    id: item.serial_number,
    // reviewStatus:
    //   item.approval_tasks.length > 0
    //     ? tReviewStatus(
    //         item.approval_tasks[item.approval_tasks.length - 1].status,
    //       )
    //     : null,
    reviewStatus: tReviewStatus(item.approvalStatus),
    submittedBy: item.applicantId.toString(),
    approvalId: item.pendingApprovalTask?.id ?? "",
    applicantId: item.applicantId,
    submitterId: item.submitterId,

    formInstance: {
      form: {
        id: "",
        revisionId: "",
        name: item.formName,
        description: "",
        schema: {
          entities: {},
          root: [],
        },
        version: 0,
        createdAt: "",
        updatedAt: "",
        publishStatus: FormStatus.Published,
        tags: [],
        validation: {
          required: false,
          validators: [],
        },
      },
      data: {},
    },
    workflowInstance: {
      workflow: {
        id: "",
        revisionId: "",
        name: "",
        description: "",
        tags: [],
        version: 0,
        nodes: [],
        edges: [],
        createdAt: "",
        updatedAt: "",
        publishStatus: FormStatus.Published,
      },
      data: {},
    },
    assigneeId: "",
  };
}

export function tOverallStatus(status: string): OverallStatus {
  const upperStatus = status.toUpperCase();
  switch (upperStatus) {
    case "CANCELLED":
      return OverallStatus.Canceled;
    case "COMPLETED":
      return OverallStatus.CompletedApproved; // Assuming COMPLETED is Approved
    case "DRAFT":
      return OverallStatus.Draft;
    case "REJECTED":
      return OverallStatus.CompletedRejected;
    case "RUNNING":
      return OverallStatus.InProgress;
    case "REPLACED":
      return OverallStatus.Canceled; // Assuming REPLACED is a form of Canceled
    default:
      return OverallStatus.InProgress;
  }
}

function tReviewStatusFromInstance(status: string): ReviewStatus | null {
  const upperStatus = status.toUpperCase();
  switch (upperStatus) {
    case "CANCELLED":
      return ReviewStatus.Canceled;
    case "COMPLETED":
      return ReviewStatus.Approved;
    case "DRAFT":
      return null;
    case "REJECTED":
      return ReviewStatus.Rejected;
    case "RUNNING":
      return ReviewStatus.Pending;
    case "REPLACED":
      return ReviewStatus.Canceled;
    case "PENDING":
      return ReviewStatus.Pending;
    default:
      return null;
  }
}

export function tApplicationSchema(data: ApplicationResponse): Application {
  const { form_instance, workflow_instance, serial_number, workflow_nodes } =
    data;

  console.debug({ data, form_instance });

  const form_schema = {
    root: form_instance.revision.form_schema?.root ?? [],
    entities: form_instance.revision.form_schema?.entities ?? {},
  };

  // Create a temporary object that satisfies the FormResponse type for deparseFlow
  const formInstanceForDeparse: FormResponse = {
    ...form_instance,
    is_template: false, // Provide a default value
    is_active: true, // Provide a default value
    tags: [], // Provide a default empty array
  };

  const { nodes, edges } = workflow_instance.revision.flow_definition
    ? deparseFlow(
        workflow_instance.revision.flow_definition,
        formInstanceForDeparse,
      )
    : { nodes: [], edges: [] };

  const flowDefinition: FlowDefinition = {
    id: workflow_instance.revision.workflow_id,
    revisionId: workflow_instance.revision.revision_id,
    name: workflow_instance.revision.name,
    description: workflow_instance.revision.description ?? "",
    tags: [], // Not available on workflow_instance
    version: workflow_instance.revision.version,
    nodes,
    edges,
    createdAt: workflow_instance.revision.created_at,
    updatedAt: workflow_instance.revision.created_at, // Fallback
    publishStatus: FormStatus.Published, // Assumption
  };

  const rawFormData =
    (form_instance.form_data as { data?: Record<string, unknown> })?.data ??
    form_instance.form_data;
  const embeddedSchema = (
    form_instance.form_data as {
      schema?: typeof form_schema;
    }
  )?.schema;

  // Prefer revision schema as source-of-truth. Use embedded schema only when it is more complete.
  const revisionEntityCount = Object.keys(form_schema.entities ?? {}).length;
  const embeddedEntityCount = Object.keys(
    embeddedSchema?.entities ?? {},
  ).length;
  const rawFormSchema =
    embeddedSchema && embeddedEntityCount > revisionEntityCount
      ? embeddedSchema
      : form_schema;

  const { data: deparsedData, schema: deparsedSchema } = deparseFormData(
    rawFormData ?? {},
    rawFormSchema ?? form_schema,
  );

  console.debug({ deparsedSchema });
  if (import.meta.env.DEV) {
    const rawKnownValueCount = Object.keys(rawFormData ?? {}).filter((key) =>
      Object.prototype.hasOwnProperty.call(rawFormSchema?.entities ?? {}, key),
    ).length;
    const mappedKnownValueCount = Object.keys(deparsedData).filter((key) =>
      Object.prototype.hasOwnProperty.call(deparsedSchema.entities ?? {}, key),
    ).length;

    if (mappedKnownValueCount < rawKnownValueCount) {
      console.warn("[tApplicationSchema] Some form values were not mapped", {
        rawKnownValueCount,
        mappedKnownValueCount,
        revisionEntityCount,
        embeddedEntityCount,
      });
    }
  }

  const formDefinition: FormDefinition = {
    id: form_instance.id,
    revisionId: form_instance.revision.revision_id,
    name: form_instance.revision.name,
    description: form_instance.revision.description ?? "",
    schema: deparsedSchema,
    version: form_instance.revision.version,
    createdAt: form_instance.revision.created_at,
    updatedAt: form_instance.revision.created_at, // Not available, using created_at as fallback
    publishStatus: FormStatus.Published, // Assumption from other transforms
    tags: [],
    validation: form_instance.revision.validation ?? {
      required: false,
      validators: [],
    },
  };

  const approvalId =
    workflow_nodes && workflow_nodes.length > 0
      ? (workflow_nodes[0].approvals?.find(
          (approval) => approval.status === "PENDING",
        )?.id ?? "")
      : "";
  console.debug(
    { approvalId, workflow_nodes },
    tReviewStatusFromInstance(
      workflow_nodes && workflow_nodes?.length > 0
        ? (workflow_nodes[0].approvals?.find((a) => a.status !== "PENDING")
            ?.status ?? ReviewStatus.Pending)
        : ReviewStatus.Pending,
    ),
  );
  return {
    id: workflow_instance.id,
    serialNumber: serial_number,
    overallStatus: tOverallStatus(workflow_instance.status),
    reviewStatus: tReviewStatusFromInstance(
      workflow_nodes && workflow_nodes.length > 0
        ? (workflow_nodes[0].approvals?.find((a) => a.status !== "PENDING")
            ?.status ?? "")
        : ReviewStatus.Pending,
    ),
    submittedAt: workflow_instance.appliedAt ?? "",
    submittedBy: workflow_instance.applicant.id.toString(),
    assigneeId: "", // Not available in the response
    approvalId: approvalId,
    submitter: workflow_instance.submitter
      ? tUser(workflow_instance.submitter)
      : tUser(workflow_instance.applicant),
    applicant: tUser(workflow_instance.applicant),
    applicantId: workflow_instance.applicant.id,
    submitterId: workflow_instance.submitter
      ? workflow_instance.submitter.id
      : workflow_instance.applicant.id,
    formInstance: {
      form: formDefinition,
      data: deparsedData,
    },
    workflowInstance: {
      workflow: flowDefinition,
      data: {}, // Not available in the response
    },
  };
}

export function tApplicationFormSchema(
  data: ApplicationFormResponse,
): ApplicationForm {
  return {
    bindingId: String(data.binding_id),
    form: {
      id: data.form_id,
      name: `${data.form_name} - ${data.workflow_name}`,
      revisionId: data.form_revision_id,
      description: data.form_desc,
    },
    workflow: {
      id: data.workflow_id,
      name: data.workflow_name,
      revisionId: data.workflow_revision_id,
      description: data.workflow_desc ?? "",
    },
  };
}
export function tApplicationFormListShcema(
  data: ApplicationFormListResponse,
): PaginatedData<ApplicationForm> {
  return transformPaginatedResponse(data, tApplicationFormSchema);
}

export function tCommentSchema(data: CommentResponse): Comment {
  return {
    approvalId: data.approval_task_id,
    author: tUser(data.author),
    content: data.content,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function tApplicationApprovalSchema(
  data: ApplicationApprovalResponse,
): Application {
  const rawFormData = data.form_data;
  const rawFormSchema = {
    root: data.form_schema.root ?? [],
    entities: data.form_schema.entities ?? {},
  };
  const { data: deparsedData, schema: deparsedSchema } = deparseFormData(
    rawFormData,
    rawFormSchema,
  );

  const formDefinition: FormDefinition = {
    id: "",
    revisionId: "",
    name: data.form_name,
    description: data.form_desc ?? "",
    schema: deparsedSchema,
    version: 0,
    createdAt: "",
    updatedAt: "",
    publishStatus: FormStatus.Published, // Assumption from other transforms
    tags: [],
    // TODO: need to return validation?
    validation: {
      required: false,
      validators: [],
    },
  };

  const flowDefinition: FlowDefinition = {
    id: "",
    revisionId: "",
    name: data.workflow_name,
    description: data.workflow_desc ?? "",
    tags: [], // Not available on workflow_instance
    version: 0,
    nodes: [],
    edges: [],
    createdAt: "",
    updatedAt: "",
    publishStatus: FormStatus.Published, // Assumption
  };
  return {
    id: data.serial_number,
    overallStatus: tOverallStatus(data.application_status),
    reviewStatus: tReviewStatus(data.approval_task.status),
    serialNumber: data.serial_number,
    submittedAt: data.application_appliedAt ?? "",
    submittedBy:
      data.workflow_node.subflow_instance?.applicant.id.toString() ?? "",
    applicantId: data.workflow_node.subflow_instance?.applicant.id ?? 0,
    submitterId: data.workflow_node.subflow_instance?.applicant.id ?? 0,
    assigneeId: "",
    formInstance: {
      form: formDefinition,
      data: deparsedData,
    },
    workflowInstance: {
      workflow: flowDefinition,
      data: {},
    },
    approvalId: data.approval_task.id,
    comment: data.comments.find(
      (c) => c.approval_task_id === data.approval_task.id,
    )?.content,
  };
}
