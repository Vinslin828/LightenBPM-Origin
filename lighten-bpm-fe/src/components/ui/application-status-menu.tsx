import { OverallStatus } from "@/types/application";
import { ApplicationStatusTag } from "../application-status-tag";
import Menu from "./menu";
import { IconDots } from "@tabler/icons-react";

type Props = {
  onItemSelect: (value: OverallStatus | null) => void;
};
export default function ApplicationStatusMenu({ onItemSelect }: Props) {
  const menuItems = [
    {
      label: "All",
      onClick: () => onItemSelect(null),
    },
    ...Object.values(OverallStatus).map((status) => ({
      label: <ApplicationStatusTag status={status} />,
      onClick: () => onItemSelect(status),
    })),
  ];
  return (
    <Menu
      items={menuItems}
      trigger={
        <IconDots className="text-secondary-text cursor-pointer h-5 w-5" />
      }
    />
  );
}
