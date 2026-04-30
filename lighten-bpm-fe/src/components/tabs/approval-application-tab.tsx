import { cn } from "@/utils/cn";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function useApprovalApplicationTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab =
    searchParams.get("tab") === "application"
      ? ("application" as const)
      : ("approval" as const);

  const setActiveTab = (tab: "approval" | "application") => {
    setSearchParams({ tab });
  };

  return { activeTab, setActiveTab };
}

export default function ApprovalApplicationTab({
  activeTab,
  setActiveTab,
}: {
  activeTab: "approval" | "application";
  setActiveTab: (tab: "approval" | "application") => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-2.5">
      <button
        onClick={() => setActiveTab("approval")}
        className={cn(
          "rounded-lg flex items-center gap-2.5 px-[22px] py-2.5",
          activeTab === "approval"
            ? "bg-[#1a75e0] text-white"
            : "bg-white border border-stroke text-[#637381]",
        )}
      >
        <span className="font-medium">{t("dashboard.approval_list")}</span>
      </button>
      <button
        onClick={() => setActiveTab("application")}
        className={cn(
          "rounded-lg flex items-center gap-2.5 px-[22px] py-2.5",
          activeTab === "application"
            ? "bg-[#1a75e0] text-white"
            : "bg-white border border-stroke text-[#637381]",
        )}
      >
        <span className="font-medium">{t("dashboard.application_list")}</span>
      </button>
    </div>
  );
}
