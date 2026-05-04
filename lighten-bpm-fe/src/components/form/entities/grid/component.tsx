import * as React from "react";
import { createEntityComponent } from "@coltorapps/builder-react";
import { useAtomValue } from "jotai";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";
import { interpreterStoreAtom, runtimeApplicationAtom } from "@/store";
import { useCodeHelper } from "@/hooks/useCode/useCodeHelper";
import { useGridDynamicDropdownOptions } from "@/hooks/useMasterData";

import { DataGrid, type GridHeaderItem } from "@ui/DataGrid";
import { gridEntity } from "./definition";

export const GridEntity = createEntityComponent(
  gridEntity,
  function GridEntity(props) {
    const id = React.useId();
    const entityErrorMessage =
      props.entity.error instanceof Error
        ? props.entity.error.message
        : formatError(props.entity.value, props.entity.error)?._errors?.[0];

    const iStore = useAtomValue(interpreterStoreAtom);
    const runtimeApplication = useAtomValue(runtimeApplicationAtom);

    const { executeCodeWithExtra } = useCodeHelper({
      formSchema: iStore?.schema ?? { root: [], entities: {} },
      formData: (iStore?.getEntitiesValues?.() ?? {}) as Record<string, unknown>,
      application: runtimeApplication,
    });

    const gridHeaders = props.entity.attributes.gridHeaders as GridHeaderItem[];

    const resolvedDynamicOptions = useGridDynamicDropdownOptions(gridHeaders);

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
        <Label htmlFor={id}>
          {!!props.entity.attributes.label.value
            ? props.entity.attributes.label.value
            : props.entity.attributes.name}
        </Label>
        <DataGrid
          value={props.entity.value}
          onChange={props.setValue}
          headers={gridHeaders}
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
