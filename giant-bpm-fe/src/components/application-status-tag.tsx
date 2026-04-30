import Tag from "@/components/ui/tag";
import { OverallStatus, ReviewStatus } from "@/types/application";

type StatusStyle = {
  label: string;
  backgroundColor: string;
  textColor: string;
};

const STATUS_STYLES: Record<OverallStatus, StatusStyle> = {
  [OverallStatus.CompletedApproved]: {
    label: "Completed(Approved)",
    backgroundColor: "bg-green-light-6",
    textColor: "text-green",
  },
  [OverallStatus.InProgress]: {
    label: "In Progress",
    backgroundColor: "bg-giant-blue/10",
    textColor: "text-giant-blue",
  },
  [OverallStatus.CompletedRejected]: {
    label: "Completed(Rejected)",
    backgroundColor: "bg-red-light-5",
    textColor: "text-red",
  },
  [OverallStatus.Draft]: {
    label: "Draft",
    backgroundColor: "bg-gray-2",
    textColor: "text-secondary-text",
  },
  [OverallStatus.Canceled]: {
    label: "Canceled",
    backgroundColor: "bg-red-light-5",
    textColor: "text-red",
  },
};

const REVIEW_STATUS_STYLES: Record<ReviewStatus, StatusStyle> = {
  [ReviewStatus.Approved]: {
    label: "Approved",
    backgroundColor: "bg-green-light-6",
    textColor: "text-green",
  },
  [ReviewStatus.Pending]: {
    label: "Pending",
    backgroundColor: "bg-giant-blue/10",
    textColor: "text-giant-blue",
  },
  [ReviewStatus.Rejected]: {
    label: "Rejected",
    backgroundColor: "bg-red-light-5",
    textColor: "text-red",
  },
  [ReviewStatus.Canceled]: {
    label: "Canceled",
    backgroundColor: "bg-gray-2",
    textColor: "text-primary-text",
  },
  [ReviewStatus.NotStarted]: {
    label: "Rejected",
    backgroundColor: "bg-red-light-5",
    textColor: "text-red",
  },
  [ReviewStatus.Skipped]: {
    label: "Rejected",
    backgroundColor: "bg-red-light-5",
    textColor: "text-red",
  },
};

interface ApplicationStatusTagProps {
  status?: OverallStatus | null;
  className?: string;
}

interface ReviewStatusTagProps {
  status: ReviewStatus | null;
  className?: string;
}

export function ApplicationStatusTag({
  status,
  className,
}: ApplicationStatusTagProps) {
  if (!status) {
    return null;
  }
  const { label, backgroundColor, textColor } =
    STATUS_STYLES[status] ?? STATUS_STYLES[OverallStatus.InProgress];

  return (
    <Tag
      className={className}
      backgroundColor={backgroundColor}
      textColor={textColor}
    >
      {label}
    </Tag>
  );
}

export function ReviewStatusTag({ status, className }: ReviewStatusTagProps) {
  if (status === null || status === ReviewStatus.NotStarted) return null;
  const { label, backgroundColor, textColor } =
    REVIEW_STATUS_STYLES[status] ?? REVIEW_STATUS_STYLES[ReviewStatus.Pending];

  return (
    <Tag
      className={className}
      backgroundColor={backgroundColor}
      textColor={textColor}
    >
      {label}
    </Tag>
  );
}
