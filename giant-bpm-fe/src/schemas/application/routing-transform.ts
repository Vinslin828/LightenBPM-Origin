import { z } from "zod";
import {
  routingSchema,
  approvalRoutingNodeSchema,
  routingApprovalSchema,
} from "./routing-definition";
import {
  OverallStatus,
  Progress,
  ProgressStatus,
  ProgressType,
  ReviewerData,
  ReviewStatus,
  type EndStep,
} from "@/types/application";

type Routing = z.infer<typeof routingSchema>;
type ApprovalNode = z.infer<typeof approvalRoutingNodeSchema>;
type RoutingApproval = z.infer<typeof routingApprovalSchema>;

const statusMap: Record<string, ProgressStatus> = {
  COMPLETED: ProgressStatus.Approved,
  APPROVED: ProgressStatus.Approved,
  RUNNING: ProgressStatus.Pending,
  PENDING: ProgressStatus.Pending,
  WAITING: ProgressStatus.Pending,
  ACTIVE: ProgressStatus.Pending,
  INACTIVE: ProgressStatus.NotStarted,
  NOT_STARTED: ProgressStatus.NotStarted,
  REJECTED: ProgressStatus.Rejected,
  FAILED: ProgressStatus.Rejected,
  CANCELED: ProgressStatus.Canceled,
  CANCELLED: ProgressStatus.Canceled,
};

function toProgressStatus(
  status: "PENDING" | "INACTIVE" | "COMPLETED" | "FAILED",
): ProgressStatus {
  switch (status) {
    case "PENDING":
      return ProgressStatus.Pending;
    case "INACTIVE":
      return ProgressStatus.NotStarted;
    case "COMPLETED":
      return ProgressStatus.Approved;
    case "FAILED":
      return ProgressStatus.Rejected;
  }
  return ProgressStatus.NotStarted;
}

function toReviewStatus(
  status: "PENDING" | "WAITING" | "APPROVED" | "REJECTED" | "CANCELLED",
): ReviewStatus {
  switch (status) {
    case "PENDING":
      return ReviewStatus.Pending;
    case "WAITING":
      return ReviewStatus.NotStarted;
    case "APPROVED":
      return ReviewStatus.Approved;
    case "CANCELLED":
      return ReviewStatus.Canceled;
    case "REJECTED":
      return ReviewStatus.Rejected;
  }
}

function mapReviewer(approval: RoutingApproval): ReviewerData {
  const assignee = approval.assignee;
  return {
    id: approval.approvalTaskId,
    type: "user",
    assigneeName: assignee.name,
    status: toReviewStatus(approval.status),
    comment: undefined,
    timestamp: undefined,
  };
}

type ApprovalProgressStep =
  | {
      id: string;
      title: string;
      status: ProgressStatus;
      type: ProgressType.Review;
      children: ReviewerData[];
      isReportingLine: boolean;
    }
  | {
      id: string;
      title: string;
      status: ProgressStatus;
      type: ProgressType.Group;
      method: "AND" | "OR";
      children: {
        title?: string;
        data: ReviewerData[];
        isReportingLine: boolean;
      }[];
    };

function mapApprovalNode(
  node: ApprovalNode,
  overallStatus?: OverallStatus,
): ApprovalProgressStep {
  const base = {
    id: node.key,
    title: node.desc || node.type,
    status: toProgressStatus(node.status),
  };

  const groups =
    node.approvalGroups?.map((group, index) => ({
      title: group.desc
        ? group.desc
        : group.isReportingLine
          ? "Reporting line"
          : node.approvalGroups && node.approvalGroups.length > 1
            ? `Group ${index + 1}`
            : undefined,
      data: group.approvals.map(mapReviewer),
      isReportingLine: group.isReportingLine,
    })) ?? [];

  if (node.approvalMethod === "parallel" || groups.length > 1) {
    const step = {
      ...base,
      type: ProgressType.Group as const,
      method: node.approvalLogic ?? "AND",
      children: groups,
    };
    return {
      ...step,
      status: deriveGroupStatus(step.children, base.status, overallStatus),
    };
  }

  const isReportingLine = groups[0].isReportingLine;
  const reviewers = groups.flatMap((group) => group.data);
  return {
    ...base,
    type: ProgressType.Review as const,
    status: deriveReviewStatus(reviewers, base.status, overallStatus),
    children: reviewers,
    isReportingLine,
  };
}

function deriveReviewStatus(
  reviewers: ReviewerData[],
  fallback: ProgressStatus,
  overallStatus?: OverallStatus,
): ProgressStatus {
  if (reviewers.some((reviewer) => reviewer.status === ReviewStatus.Rejected)) {
    return ProgressStatus.Rejected;
  }
  const allWaiting =
    reviewers.length > 0 &&
    reviewers.every((reviewer) => reviewer.status === ReviewStatus.NotStarted);
  if (
    allWaiting &&
    fallback === ProgressStatus.NotStarted &&
    overallStatus === OverallStatus.CompletedRejected
  ) {
    return ProgressStatus.Canceled;
  }
  return fallback;
}

function deriveGroupStatus(
  groups: { data: ReviewerData[] }[],
  fallback: ProgressStatus,
  overallStatus?: OverallStatus,
): ProgressStatus {
  const hasRejected = groups.some((group) =>
    group.data.some((reviewer) => reviewer.status === ReviewStatus.Rejected),
  );
  if (hasRejected) {
    return ProgressStatus.Rejected;
  }
  const allWaiting =
    groups.length > 0 &&
    groups.every(
      (group) =>
        group.data.length > 0 &&
        group.data.every(
          (reviewer) => reviewer.status === ReviewStatus.NotStarted,
        ),
    );
  if (
    allWaiting &&
    fallback === ProgressStatus.NotStarted &&
    overallStatus === OverallStatus.CompletedRejected
  ) {
    return ProgressStatus.Canceled;
  }
  return fallback;
}

function deriveConditionStatus(
  childSteps: ApprovalProgressStep[],
  fallback: ProgressStatus,
): ProgressStatus {
  const statuses = childSteps.map((step) => step.status);

  const allCanceled =
    statuses.length > 0 &&
    statuses.every((status) => status === ProgressStatus.Canceled);
  if (allCanceled) {
    return ProgressStatus.Canceled;
  }

  const allRejected =
    statuses.length > 0 &&
    statuses.every((status) => status === ProgressStatus.Rejected);
  if (allRejected) {
    return ProgressStatus.Rejected;
  }

  if (statuses.some((status) => status === ProgressStatus.Rejected)) {
    return ProgressStatus.Rejected;
  }

  if (statuses.some((status) => status === ProgressStatus.Pending)) {
    return ProgressStatus.Pending;
  }

  if (statuses.every((status) => status === ProgressStatus.Approved)) {
    return ProgressStatus.Approved;
  }

  if (statuses.every((status) => status === ProgressStatus.NotStarted)) {
    return ProgressStatus.NotStarted;
  }

  return fallback;
}

export function tApplicationProgress(
  routing?: Routing,
  overallStatus?: OverallStatus,
): Progress {
  if (!routing?.nodes?.length) return [];

  const nodeByKey = new Map(routing.nodes.map((node) => [node.key, node]));
  const conditionChildKeys = new Set<string>();
  const steps: Progress = [];

  routing.nodes.forEach((node) => {
    if (node.type === "condition") {
      const childSteps = (node.child_keys ?? [])
        .map((childKey) => {
          conditionChildKeys.add(childKey);
          const childNode = nodeByKey.get(childKey);
          if (
            childNode?.type === "approval" &&
            childNode.approvalGroups?.some(
              (group) => group.approvals.length > 0,
            )
          ) {
            return mapApprovalNode(childNode, overallStatus);
          }
          return null;
        })
        .filter((step): step is ApprovalProgressStep => Boolean(step));

      if (childSteps.length > 0) {
        steps.push({
          id: node.key,
          title: node.desc || "Condition",
          type: ProgressType.Condition,
          status: deriveConditionStatus(
            childSteps,
            toProgressStatus(node.status),
          ),
          children: childSteps.map((childStep) => [childStep]),
        });
      }
      return;
    }

    if (
      node.type === "approval" &&
      !conditionChildKeys.has(node.key) &&
      node.approvalGroups?.some((group) => group.approvals.length > 0)
    ) {
      steps.push(mapApprovalNode(node, overallStatus));
    }
  });

  const completionStatus =
    steps.length === 0
      ? ProgressStatus.NotStarted
      : steps.every((step) => step.status === ProgressStatus.Approved)
        ? ProgressStatus.Approved
        : steps.some((step) => step.status === ProgressStatus.Rejected)
          ? ProgressStatus.Rejected
          : ProgressStatus.NotStarted;

  const completedStep: EndStep = {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `completed-${Date.now()}`,
    title: "Completed",
    type: ProgressType.End as const,
    status: completionStatus,
    children: null,
  };

  return [...steps, completedStep];
}
