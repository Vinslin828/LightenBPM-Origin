import * as React from "react";
import { createEntityComponent } from "@coltorapps/builder-react";
import { useAtomValue } from "jotai";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import {
  interpreterStoreAtom,
  runtimeApplicationAtom,
  formSettingAtom,
} from "@/store";
import { useCodeHelper } from "@/hooks/useCode/useCodeHelper";
import { useGridDynamicDropdownOptions } from "@/hooks/useMasterData";
import { useTranslation } from "react-i18next";
import {
  getEntityTranslationKey,
  getGridColumnTranslationKey,
  getOptionTranslationKey,
  resolveEntityLabel,
  useEntityLabel,
} from "@/hooks/useEntityLabel";

import { DataGrid, type GridHeaderItem } from "@ui/DataGrid";
import { gridEntity } from "./definition";

export const GridEntity = createEntityComponent(
  gridEntity,
  function GridEntity(props) {
    const id = React.useId();
    const rawEntityErrorMessage =
      props.entity.error instanceof Error
        ? props.entity.error.message
        : formatError(props.entity.value, props.entity.error)?._errors?.[0];

    const iStore = useAtomValue(interpreterStoreAtom);
    const runtimeApplication = useAtomValue(runtimeApplicationAtom);
    const { defaultLang, labelTranslations } = useAtomValue(formSettingAtom);
    const { i18n } = useTranslation();

    const { executeCodeWithExtra } = useCodeHelper({
      formSchema: iStore?.schema ?? { root: [], entities: {} },
      formData: (iStore?.getEntitiesValues?.() ?? {}) as Record<
        string,
        unknown
      >,
      application: runtimeApplication,
    });

    const gridHeaders = props.entity.attributes.gridHeaders as GridHeaderItem[];
    const entityTranslationKey = getEntityTranslationKey(
      props.entity.id,
      props.entity.attributes,
    );

    // Translate column header labels
    const translatedHeaders: GridHeaderItem[] = React.useMemo(
      () =>
        gridHeaders.map((header) => {
          const columnTranslationKey = getGridColumnTranslationKey(
            entityTranslationKey,
            header.keyValue,
          );
          const staticDatasource =
            header.datasource &&
            typeof header.datasource === "object" &&
            (header.datasource as { type?: string }).type === "static" &&
            Array.isArray((header.datasource as { options?: unknown }).options)
              ? (header.datasource as {
                  type: "static";
                  options: Array<{
                    label: string;
                    value: string;
                    key?: string;
                  }>;
                })
              : undefined;

          const datasource = staticDatasource
            ? {
                ...staticDatasource,
                options: staticDatasource.options.map((option) => ({
                  ...option,
                  label: resolveEntityLabel(
                    getOptionTranslationKey(
                      `${props.entity.id}_col_${header.keyValue}`,
                      option.value,
                    ),
                    option.label,
                    labelTranslations,
                    defaultLang,
                    i18n.language,
                    [
                      getOptionTranslationKey(
                        columnTranslationKey,
                        option.value,
                      ),
                    ],
                  ),
                })),
              }
            : header.datasource;

          return {
            ...header,
            datasource,
            label: resolveEntityLabel(
              `${props.entity.id}_col_${header.keyValue}`,
              header.label,
              labelTranslations,
              defaultLang,
              i18n.language,
              [columnTranslationKey],
            ),
          };
        }),
      [
        gridHeaders,
        labelTranslations,
        defaultLang,
        i18n.language,
        props.entity.id,
        entityTranslationKey,
      ],
    );

    const resolvedDynamicOptions = useGridDynamicDropdownOptions(gridHeaders);

    // Entity label (grid title)
    const label = useEntityLabel(
      props.entity.id,
      props.entity.attributes.label.value || props.entity.attributes.name,
      entityTranslationKey,
    );

    const entityErrorMessage = React.useMemo(() => {
      if (!rawEntityErrorMessage) return rawEntityErrorMessage;

      return gridHeaders.reduce((message, header, index) => {
        const translatedLabel = translatedHeaders[index]?.label;
        if (!translatedLabel || translatedLabel === header.label) {
          return message;
        }

        return message
          .split(`${header.label} is required`)
          .join(`${translatedLabel} is required`);
      }, rawEntityErrorMessage);
    }, [gridHeaders, rawEntityErrorMessage, translatedHeaders]);

    const evaluateExpression = React.useCallback(
      (code: string, row: Record<string, unknown>): unknown => {
        const getRowField = (key: string) => ({ value: row[key] ?? null });
        try {
          const result = executeCodeWithExtra(code, [
            { name: "getRowField", value: getRowField },
          ]);
          return typeof result === "function"
            ? (result as () => unknown)()
            : result;
        } catch (error) {
          console.warn("Failed to evaluate grid expression", error);
          return "";
        }
      },
      [executeCodeWithExtra],
    );

    return (
      <div className="h-fit">
        <Label htmlFor={id}>{label}</Label>
        <DataGrid
          value={props.entity.value}
          onChange={props.setValue}
          headers={translatedHeaders}
          maxRows={props.entity.attributes.rowConfig?.maxRows}
          readonly={
            Boolean(props.entity.attributes.readonly) ||
            Boolean(props.entity.attributes.disabled)
          }
          evaluateExpression={evaluateExpression}
          resolvedDynamicOptions={resolvedDynamicOptions}
        />
        <ValidationError>{entityErrorMessage}</ValidationError>
      </div>
    );
  },
);
