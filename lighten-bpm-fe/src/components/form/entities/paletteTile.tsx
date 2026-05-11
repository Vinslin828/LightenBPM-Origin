import { JSX } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  icon: ({ className }: { className?: string }) => JSX.Element;
  labelKey: string;
  onClick?: () => void;
};

export default function PaletteTile({ icon, ...props }: Props) {
  const { t } = useTranslation("translation", {
    keyPrefix: "form_builder.entities",
  });

  return (
    <button
      className="flex h-[76px] w-full min-w-0 flex-col py-1.5 px-1 gap-1 justify-center items-center rounded-md border border-[#E0E2EC] bg-white hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-grab active:cursor-grabbing group"
      onClick={(e) => {
        e.stopPropagation();
        setTimeout(() => {
          props.onClick?.();
        }, 200);
      }}
    >
      <div className="fill-primary-text text-primary-text hover:fill-lighten-blue">
        {icon({})}
      </div>
      <div className="w-full min-w-0 text-[#1F2A37] group-hover:text-blue-700 text-center font-inter text-xs font-medium leading-4">
        {t(props.labelKey)}
      </div>
    </button>
  );
}
