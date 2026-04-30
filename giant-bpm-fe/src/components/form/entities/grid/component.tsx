import * as React from "react";
import { createEntityComponent } from "@coltorapps/builder-react";
import { Label } from "@/components/ui/label";
import { formatError, ValidationError } from "@/components/ui/validation-error";

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
          headers={props.entity.attributes.gridHeaders as GridHeaderItem[]}
          maxRows={props.entity.attributes.rowConfig?.maxRows}
          readonly={
            Boolean(props.entity.attributes.readonly) ||
            Boolean(props.entity.attributes.disabled)
          }
        />
        <ValidationError>{entityErrorMessage}</ValidationError>
      </div>
    );
  },
);
