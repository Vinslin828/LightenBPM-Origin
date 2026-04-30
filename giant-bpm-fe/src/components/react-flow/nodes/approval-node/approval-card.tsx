import { ApprovalIcon, ApproveIcon, TrashIcon } from "@/components/icons";
import { ApprovalNodeType } from "@/types/flow";
import { Button } from "@ui/button";
import { useTranslation } from "react-i18next";
import { ApproverTag } from "./approver-tag";

const approverPrefix = "approver_type";

type ApprovalCardProps = {
  data: ApprovalNodeType["data"];
  selected?: boolean;
  onRemove?: () => void;
};

export function ApprovalCard({ data, selected, onRemove }: ApprovalCardProps) {
  const { t } = useTranslation();

  return (
    <div className="w-[280px] min-h-[84px] h-full bg-white rounded-md shadow-sm overflow-hidden flex">
      <div className="w-1 bg-amber-400 flex-shrink-0" />
      <div className="flex flex-col justify-between p-3 flex-1 max-w-full">
        <div className="flex flex-row items-center gap-2">
          <ApprovalIcon className="w-4 h-4 text-primary-text" />
          <span className="text-primary-text text-xs font-medium">
            {t("flow.nodes.approval_node")}
          </span>
          {selected && onRemove && (
            <Button
              variant={"icon"}
              className="rounded-full bg-gray-2 p-1 absolute right-2.5 top-2.5 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
            >
              <TrashIcon className="w-3.5 h-3.5 text-secondary-text" />
            </Button>
          )}
        </div>
        <div className="pt-1 pb-2.5 text-xs">{data.description}</div>
        <div className="flex items-center justify-between max-w-full">
          <span className="text-[#111928] text-sm font-medium flex flex-row items-center justify-center max-w-full">
            <ApproveIcon className="h-4 w-4 mr-1.5" />
            <div className="overflow-ellipsis overflow-hidden whitespace-nowrap">
              {t(`${approverPrefix}.${data?.approver}`)}
            </div>
            <ApproverTag data={data} />
          </span>
        </div>
      </div>
    </div>
  );
}
