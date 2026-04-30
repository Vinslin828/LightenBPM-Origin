import { ReviewStatus } from "@/types/application";
import { ReviewStatusTag } from "../application-status-tag";
import Menu from "./menu";
import { IconDots } from "@tabler/icons-react";

type Props = {
  onItemSelect: (value: ReviewStatus | null) => void;
};
export default function ApprovalStatusMenu({ onItemSelect }: Props) {
  const menuItems = [
    {
      label: "All",
      onClick: () => onItemSelect(null),
    },
    {
      label: <ReviewStatusTag status={ReviewStatus.Approved} />,
      onClick: () => onItemSelect(ReviewStatus.Approved),
    },
    {
      label: <ReviewStatusTag status={ReviewStatus.Pending} />,
      onClick: () => onItemSelect(ReviewStatus.Pending),
    },
    {
      label: <ReviewStatusTag status={ReviewStatus.Rejected} />,
      onClick: () => onItemSelect(ReviewStatus.Rejected),
    },
  ];
  return (
    <Menu
      items={menuItems}
      trigger={<IconDots className="text-secondary-text cursor-pointer" />}
    />
  );
}
