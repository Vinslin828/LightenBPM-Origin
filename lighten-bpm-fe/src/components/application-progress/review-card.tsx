import { ReviewerData, ReviewStatus } from "@/types/application";
import { DepartmentIcon } from "../icons";
import { Avatar } from "@ui/avatar";
import { ReviewStatusTag } from "../application-status-tag";
import dayjs from "dayjs";
import { cn } from "@/utils/cn";

export const ReviewCard: React.FC<{
  node: ReviewerData;
  className?: string;
}> = ({ node, className }) => (
  <div
    className={cn(
      "border-stroke flex flex-col rounded-md border bg-white overflow-clip max-w-[394px]",
      className,
    )}
  >
    <div className="flex items-center gap-4 p-3 ">
      <div className="flex flex-1 items-center gap-2">
        {node.type === "user" ? (
          <Avatar name={node.assigneeName} />
        ) : (
          <div
            className={cn(
              "bg-gray-2 rounded-full h-11 w-11 p-2.5",
              node.status === ReviewStatus.Canceled && "opacity-25",
            )}
          >
            <DepartmentIcon className="text-primary-text" />
          </div>
        )}
        <div className="flex-1">
          <div className="text-dark font-medium">{node.assigneeName}</div>
          {node.timestamp && (
            <div className="text-secondary-text text-xs">
              {dayjs(node.timestamp).format("YYYY-MM-DD HH:mm")}
            </div>
          )}
        </div>
      </div>
      {node.status !== ReviewStatus.Canceled && (
        <ReviewStatusTag status={node.status} />
      )}
    </div>
    {node.comment && (
      <div className="bg-gray p-4 text-sm text-dark">{node.comment}</div>
    )}
  </div>
);
