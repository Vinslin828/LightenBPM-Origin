import { JSX, ReactNode } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  icon: ({ className }: { className?: string }) => JSX.Element;
  labelKey: string;
  onClick?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
};

export default function PaletteTile({ icon, ...props }: Props) {
  const { t } = useTranslation("translation", {
    keyPrefix: "form_builder.entities",
  });

  return (
    <button
      className="flex flex-col py-3 gap-2 justify-center items-center rounded-md border border-[#E0E2EC] bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer group"
      onClick={(e) => {
        e.stopPropagation();
        setTimeout(() => {
          props.onClick?.();
        }, 200);
      }}
      onDragStart={props.onDragStart}
      onDragEnd={props.onDragEnd}
      draggable
    >
      <div className="fill-primary-text text-primary-text hover:fill-lighten-blue">
        {icon({})}
      </div>
      <div className="text-[#1F2A37] group-hover:text-blue-700 text-center font-inter text-xs font-medium leading-3">
        {t(props.labelKey)}
      </div>
    </button>
  );
}
