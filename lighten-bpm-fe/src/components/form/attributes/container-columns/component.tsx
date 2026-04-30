import { Label } from "@/components/ui/label";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { containerColumnsAttribute } from "./definition";
import { useTranslation } from "react-i18next";

const COLUMN_OPTIONS = [2, 3, 4] as const;

export const ContainerColumnsAttribute = createAttributeComponent(
  containerColumnsAttribute,
  function ContainerColumnsAttribute(props) {
    const currentValue = (props.attribute.value as number) ?? 2;
    const { t } = useTranslation("translation", {
      keyPrefix: "form_builder.attributes",
    });

    const handleChange = (columns: number) => {
      props.setValue(columns);
    };

    return (
      <div className="flex flex-col gap-2.5">
        <Label>{t("columns")}</Label>
        <div className="flex flex-col gap-3 pl-5">
          {COLUMN_OPTIONS.map((option) => (
            <label
              key={option}
              className="flex items-center gap-2.5 cursor-pointer"
              tabIndex={0}
              aria-label={`${option} columns`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleChange(option);
                }
              }}
            >
              <input
                type="radio"
                name="containerColumns"
                value={option}
                checked={currentValue === option}
                onChange={() => handleChange(option)}
                className="w-5 h-5 accent-lighten-blue cursor-pointer"
              />
              <span className="text-base text-primary-text">
                {t("n_columns", { count: option })}
              </span>
            </label>
          ))}
        </div>
      </div>
    );
  },
);
