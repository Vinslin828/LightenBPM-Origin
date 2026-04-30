import { EntityKey } from "@/types/form-builder";
import { useTranslation } from "react-i18next";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/utils/cn";
import { getEntityLabelKey } from "@/const/form-builder";
import { WorkflowNodeKey } from "@/types/flow";
import { getNodeLabelKey } from "@/const/flow";

type Props = {
  icon: React.ReactNode;
  componentType: WorkflowNodeKey;
  className?: string;
};

export default function AttributePanelHeader({
  icon,
  componentType,
  className,
}: Props) {
  const { t } = useTranslation("translation", {
    keyPrefix: "flow.nodes",
  });
  const [isScrolled, setIsScrolled] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const labelKey = getNodeLabelKey(componentType);

  useEffect(() => {
    // We assume the direct parent of the header is the scrollable container
    const scrollContainer = headerRef.current?.parentElement;
    if (!scrollContainer) return;

    const handleScroll = () => {
      const hasScrolled = scrollContainer.scrollTop > 0;
      setIsScrolled(hasScrolled);
    };

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true });

    // Check initial scroll position
    handleScroll();

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <div
      ref={headerRef}
      className={cn(
        "border-b border-b-stroke text-dark py-[13px] px-5 flex flex-row gap-[14px] text-base font-semibold items-center sticky top-0 bg-white z-10 transition-shadow duration-200",
        {
          "shadow-md": isScrolled,
        },
      )}
    >
      <div
        className={cn(
          "p-[6px] bg-yellow-light rounded-sm border-yellow border-[0.5px]",
          className,
        )}
      >
        {icon}
      </div>
      {t(getNodeLabelKey(componentType))}
    </div>
  );
}
