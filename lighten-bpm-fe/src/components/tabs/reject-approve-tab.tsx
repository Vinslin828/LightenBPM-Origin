import { cn } from "@/utils/cn";
import { Button } from "@ui/button";
import { useState } from "react";
import { CheckCircleIcon, CrossCircleIcon } from "../icons";
export function useApproveRejectTab() {
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  return { decision, setDecision };
}

export default function ApproveRejectTab({
  decision,
  setDecision,
}: {
  decision: "approve" | "reject" | null;
  setDecision: (decision: "approve" | "reject") => void;
}) {
  return (
    <div className="mt-1 text-base text-dark font-semibold whitespace-pre-wrap flex flex-row gap-3">
      <Button
        className={cn(
          "w-full",
          decision === "reject" && "bg-red text-white hover:bg-red/90",
        )}
        variant={"destructive-outline"}
        onClick={() => setDecision("reject")}
      >
        <CrossCircleIcon className="w-5 h-5" />
        Reject
      </Button>
      <Button
        className={cn(
          "w-full",
          decision === "approve" && "bg-green text-white hover:bg-green-600",
        )}
        variant={"success-outline"}
        onClick={() => setDecision("approve")}
      >
        <CheckCircleIcon className="w-5 h-5" />
        Approve
      </Button>
    </div>
  );
}
