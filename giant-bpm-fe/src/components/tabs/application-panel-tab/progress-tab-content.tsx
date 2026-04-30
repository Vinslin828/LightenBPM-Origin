import { useCallback, useState, useMemo, useRef, useEffect } from "react";
import {
  Application,
  ReviewStatus,
  ProgressStatus,
  ProgressType,
  type Progress,
  OverallStatus,
} from "@/types/application";
import { ApplicationStatusTag } from "@/components/application-status-tag";
import { cn } from "@/utils/cn";
import { Check, ChevronRight, X } from "lucide-react";
import { BranchIcon, SignIcon } from "@/components/icons";
import BtnArrow from "@ui/arrow-button";
import { ReviewCard } from "@/components/application-progress/review-card";
import { BottomSheet, useDrawer } from "@ui/drawer";

import { useApplicationProgress } from "@/hooks/useApplication";

// --- Helper Functions -------------------------------------------------------

const getAllStepIds = (steps: Progress): string[] => {
  let ids: string[] = [];
  for (const step of steps) {
    ids.push(step.id);
    if (step.type === ProgressType.Condition) {
      for (const branch of step.children) {
        ids = ids.concat(getAllStepIds(branch));
      }
    }
  }
  return ids;
};

const findInProgressStep = (steps: Progress): Progress[number] | undefined => {
  for (const step of steps) {
    if (
      step.status === ProgressStatus.Pending ||
      step.status === ProgressStatus.NotStarted
    ) {
      return step;
    }
    if (step.type === ProgressType.Condition) {
      for (const branch of step.children) {
        const found = findInProgressStep(branch);
        if (found) return found;
      }
    }
  }
  return undefined;
};

const getIcon = (type: ProgressType, status: ProgressStatus) => {
  switch (status) {
    case ProgressStatus.Approved:
      return (
        <div className="rounded-full bg-green p-2">
          <Check className="text-white h-4 w-4" />
        </div>
      );
    case ProgressStatus.Pending:
      return (
        <div className="rounded-full bg-giant-blue p-2">
          {type === ProgressType.Condition ? (
            <BranchIcon className="text-white h-5 w-5" />
          ) : (
            <SignIcon className="text-white h-5 w-5" />
          )}
        </div>
      );
    case ProgressStatus.NotStarted:
      return (
        <div className="rounded-full bg-white border border-stroke p-2">
          {type === ProgressType.Condition ? (
            <BranchIcon className="text-primary-text h-5 w-5" />
          ) : (
            <SignIcon className="text-primary-text h-5 w-5" />
          )}
        </div>
      );
    case ProgressStatus.Rejected:
      return (
        <div className="rounded-full bg-red p-2">
          <X className="text-white h-5 w-5" />
        </div>
      );
    default:
      return (
        <div className="rounded-full bg-white border border-stroke p-2">
          {type === ProgressType.Condition ? (
            <BranchIcon className="text-primary-text h-5 w-5" />
          ) : (
            <SignIcon className="text-primary-text h-5 w-5" />
          )}
        </div>
      );
  }
};

const getTimeLineColor = (status: ProgressStatus) => {
  switch (status) {
    case ProgressStatus.Approved:
      return "before:bg-green";
    case ProgressStatus.Pending:
      return "before:bg-giant-blue";
    case ProgressStatus.NotStarted:
    case ProgressStatus.Canceled:
      return "before:bg-gray-300";
    case ProgressStatus.Rejected:
      return "before:bg-red";
  }
};

const approvalIndicator = (threshold: number, total: number) => {
  return (
    <div className="flex flex-row items-center text-primary-text text-xs font-medium">
      {threshold} of {total} must approve
    </div>
  );
};

interface ProgressStepProps {
  step: Progress[number];
  index: number;
  isLast: boolean;
  expandedSteps: Set<string>;
  toggleStep: (stepId: string) => void;
  scrollTo?: boolean;
}

const ProgressStep = ({
  step,
  index,
  expandedSteps,
  toggleStep,
  scrollTo = false,
}: ProgressStepProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const isExpanded = expandedSteps.has(step.id);
  const showToggle = step.children && step.children.length > 0;

  useEffect(() => {
    if (scrollTo) {
      ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [scrollTo]);

  function renderContent() {
    if (step.type === ProgressType.Review) {
      const totalCount = step.children.length;
      return (
        <div className="ml-11 mt-3 space-y-2">
          {approvalIndicator(step.isReportingLine ? totalCount : 1, totalCount)}
          {step.children.map((node) => (
            <ReviewCard
              key={node.assigneeName}
              node={node}
              className={
                node.status === ReviewStatus.Canceled ? "opacity-50" : undefined
              }
            />
          ))}
        </div>
      );
    } else if (step.type === ProgressType.Group) {
      // const totalCount = step.children.reduce(
      //   (prev, current) => (prev += current.data.length),
      //   0,
      // );
      const totalCount = step.children.length;
      const isGroupStatusCanceled = step.status === ProgressStatus.Canceled;

      return (
        <div
          className={cn(
            "ml-11 mt-3 space-y-2 bg-white rounded-2xl border-stroke border",
            // isGroupStatusCanceled && "opacity-50",
          )}
        >
          <div className="flex flex-row bg-gray-2 h-8 items-center justify-center rounded-t-2xl text-primary-text text-xs font-medium">
            {step.method === "AND" ? totalCount : 1} of {totalCount} groups must
            approve
          </div>
          <div className="p-2.5">
            {step.children.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-2">
                <div>{group.title}</div>
                {approvalIndicator(
                  group.isReportingLine ? group.data.length : 1,
                  group.data.length,
                )}
                {group.data.map((node) => (
                  <ReviewCard
                    key={node.id}
                    node={node}
                    className={
                      node.status === ReviewStatus.Canceled &&
                      !isGroupStatusCanceled
                        ? "opacity-50"
                        : undefined
                    }
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    } else if (step.type === ProgressType.Condition) {
      return (
        <div className="ml-11 mt-3">
          {step.children.map((branch, branchIndex) => (
            <div
              key={branchIndex}
              className={cn(
                "step flex flex-col before:h-full last:before:h-1",
                step.status === ProgressStatus.Pending &&
                  "before:bg-giant-blue",
                step.status === ProgressStatus.Approved && "before:bg-green",
                step.status === ProgressStatus.Rejected && "before:bg-red",
                step.status === ProgressStatus.NotStarted &&
                  "before:bg-gray-300",
              )}
            >
              <div
                className={cn(
                  "absolute top-4 -left-7 w-6.5 h-0.5",
                  step.status === ProgressStatus.Pending && "bg-giant-blue",
                  step.status === ProgressStatus.Approved && "bg-green",
                  step.status === ProgressStatus.Rejected && "bg-red",
                  step.status === ProgressStatus.NotStarted && "bg-gray-300",
                  step.status === ProgressStatus.Canceled && "bg-gray-300",
                )}
              />
              {branch.map((node, nodeIndex) => (
                <ProgressStep
                  key={node.id}
                  step={node}
                  index={nodeIndex}
                  isLast={nodeIndex === branch.length - 1}
                  expandedSteps={expandedSteps}
                  toggleStep={toggleStep}
                />
              ))}
            </div>
          ))}
        </div>
      );
    }
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "step relative pb-4 before:bg-gray-300 before:h-full",
        step.type === ProgressType.Condition && isExpanded
          ? "last:before:h-full"
          : "last:before:h-1",
        getTimeLineColor(step.status),
        step.status === ProgressStatus.Canceled && "opacity-50",
      )}
    >
      {/* Step Title */}
      <div className="flex items-center gap-3">
        {/* Stepper icon */}
        <div className={"relative h-8 w-8 z-10"}>
          <div className="absolute inset-0 flex items-center justify-center">
            {getIcon(step.type, step.status)}
          </div>
        </div>
        {/* Collapse button */}
        <div className="flex flex-1 items-center">
          <div className="text-dark flex flex-1 font-semibold">
            {index + 1}. {step.title}
          </div>
          {showToggle && (
            <BtnArrow
              direction={isExpanded ? "up" : "down"}
              onClick={() => toggleStep(step.id)}
            />
          )}
        </div>
      </div>
      {isExpanded && renderContent()}
    </div>
  );
};

// --- Main Component ---------------------------------------------------------

interface ApplicationProgressProps {
  application: Application;
}

export default function ApplicationProgress({
  application,
}: ApplicationProgressProps) {
  const { progress, isLoading } = useApplicationProgress(
    application.serialNumber,
  );

  if (application.overallStatus === OverallStatus.Draft) {
    return (
      <div className="lg:max-w-[476px] w-full bg-gray-2 h-full flex items-center justify-center py-10 text-primary-text">
        Submit to see application progress
      </div>
    );
  }

  return (
    <>
      <div className="lg:max-w-[476px] w-full bg-gray-2 overflow-y-auto min-h-0 max-h-full">
        <div className="flex flex-col border-stroke">
          {/* <ProgressTabs /> */}
          {/* Header */}
          <div className="bg-white border-stroke flex min-h-[58px] items-center border-b px-5 sticky top-0 z-15">
            <span className="text-dark flex-1 text-base font-semibold">
              Overall progress
            </span>
            <ApplicationStatusTag status={progress?.overallStatus ?? null} />
          </div>

          {/* Progress flow */}
          {isLoading && "loading"}
          {!progress && "no progress"}
          {progress && (
            <Progress
              progress={progress.progress}
              overallStatus={progress.overallStatus}
            />
          )}
        </div>
      </div>
    </>
  );
}

type ProgressProps = {
  progress: Progress;
  overallStatus: OverallStatus;
  //   expandedSteps: Set<string>;
  //   toggleStep: (stepId: string) => void;
  //   inProgressStep: Progress[number] | undefined;
};
export function Progress({ progress, overallStatus }: ProgressProps) {
  const allStepIds = useMemo(() => new Set(getAllStepIds(progress)), []);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(allStepIds);

  const toggleStep = useCallback((stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }, []);
  const inProgressStep = useMemo(() => findInProgressStep(progress), []);
  return (
    <div
      className={cn(
        "p-5",
        overallStatus === OverallStatus.Canceled && "opacity-50",
      )}
    >
      <div className="relative">
        {progress.map((step, index) => (
          <ProgressStep
            key={step.id}
            step={step}
            index={index}
            isLast={index === progress.length - 1}
            expandedSteps={expandedSteps}
            toggleStep={toggleStep}
            scrollTo={step.id === inProgressStep?.id}
          />
        ))}
      </div>
    </div>
  );
}
