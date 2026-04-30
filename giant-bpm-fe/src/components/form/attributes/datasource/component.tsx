import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { createAttributeComponent } from "@coltorapps/builder-react";
import { datasourceTypeAttribute } from "./definition";
import { RadioGroup, type RadioOption } from "@/components/ui/radio-group";

import {
  getSelectAdvancedSettingEventName,
  type SelectAdvancedSettingDetail,
} from "../select-advanced-setting/definition";
import StaticSetting, { StaticValue } from "./static-setting";
import DynamicSetting, { DynamicValue } from "./dynamic-setting";

type dataSourceTypeValue = "static" | "dynamic";
const datasourceTypes: RadioOption[] = [
  { value: "static", label: "Static" },
  { value: "dynamic", label: "Table/View" },
];

export type DatasourceValue = StaticValue | DynamicValue;
export const DATASOURCE_UPDATED_EVENT = "datasource-updated";
export const getDatasourceUpdatedEventName = (entityId?: string) =>
  `${DATASOURCE_UPDATED_EVENT}-${entityId ?? "unknown"}`;
export type DatasourceUpdatedDetail = {
  entityId?: string;
  datasource: DatasourceValue;
};

export const DatasourceTypeAttribute = createAttributeComponent(
  datasourceTypeAttribute,
  function DatasourceTypeAttribute(props) {
    const currentValue = useMemo(
      () => props.attribute.value as DatasourceValue,
      [props.attribute.value],
    );

    const [multipleSelection, setMultipleSelection] = useState(
      (
        props.entity.attributes.selectAdvancedSetting as
          | { multipleSelection: boolean }
          | undefined
      )?.multipleSelection ?? false,
    );

    useEffect(() => {
      setMultipleSelection(
        (
          props.entity.attributes.selectAdvancedSetting as
            | { multipleSelection: boolean }
            | undefined
        )?.multipleSelection ?? false,
      );
    }, [
      (
        props.entity.attributes.selectAdvancedSetting as
          | { multipleSelection: boolean }
          | undefined
      )?.multipleSelection,
    ]);

    useEffect(() => {
      const handler = (event: Event) => {
        const detail = (event as CustomEvent<SelectAdvancedSettingDetail>)
          .detail;
        if (detail?.entityId && detail.entityId !== props.entity?.id) return;
        if (typeof detail?.multipleSelection === "boolean") {
          setMultipleSelection(detail.multipleSelection);
        }
      };
      const eventName = getSelectAdvancedSettingEventName(props.entity?.id);
      window.addEventListener(eventName, handler);
      return () => window.removeEventListener(eventName, handler);
    }, [props.entity?.id]);

    const emitDatasourceUpdate = (value: DatasourceValue) => {
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent<DatasourceUpdatedDetail>(
            getDatasourceUpdatedEventName(props.entity?.id),
            {
              detail: { entityId: props.entity?.id, datasource: value },
            },
          ),
        );
      }
    };

    const handleTypeChange = (type: dataSourceTypeValue) => {
      if (type === "static") {
        const next = {
          type: "static" as const,
          options: [{ label: "Option 1", value: "option_1", key: "option_1" }],
          defaultValue: { isReference: false, value: undefined },
        };
        props.setValue(next);
        emitDatasourceUpdate(next);
      } else {
        const next = {
          type: "dynamic" as const,
        };
        props.setValue(next);
        emitDatasourceUpdate(next);
      }
    };

    const errorMessage = formatError(
      props.attribute.value,
      props.attribute.error,
    )?._errors?.[0];

    return (
      <div className="space-y-4">
        <div className="px-5 pt-5">
          <Label className="text-sm font-medium block">Data Source Type</Label>
          <RadioGroup
            name={props.attribute.name}
            value={currentValue.type}
            onChange={(val) => handleTypeChange(val as "static" | "dynamic")}
            options={datasourceTypes}
            className="flex gap-4"
          />
        </div>

        {currentValue.type === "static" && (
          <StaticSetting
            key={props.entity.id}
            attributeName={props.attribute.name}
            value={currentValue}
            multipleSelection={multipleSelection}
            onChange={(value) => {
              props.setValue(value);
              emitDatasourceUpdate(value);
            }}
          />
        )}

        {currentValue.type === "dynamic" && (
          <DynamicSetting
            value={currentValue}
            multipleSelection={multipleSelection}
            onChange={(value) => {
              props.setValue(value);
              emitDatasourceUpdate(value);
            }}
          />
        )}

        {errorMessage && <ValidationError>{errorMessage}</ValidationError>}
      </div>
    );
  },
);
