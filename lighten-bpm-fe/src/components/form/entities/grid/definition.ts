import { z } from "zod";

import { createEntity } from "@coltorapps/builder";

import { labelAttribute } from "../../attributes/label/definition";
import { widthAttribute } from "../../attributes/width/definition";
import { EntityKey } from "@/types/form-builder";
import { nameAttribute } from "../../attributes/name/definition";
import { rowConfigAttribute } from "../../attributes/row-config/definition";
import { gridHeaderAttribute } from "../../attributes/grid-header/definition";
import {
  getFirstGridRequiredErrorMessage,
  parseGridRows,
  type GridValidationHeaderItem,
} from "./grid-value-validation";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { hideAttribute } from "../../attributes/hide/definition";

export const gridEntity = createEntity({
  name: EntityKey.grid,
  attributes: [
    widthAttribute,
    nameAttribute,
    labelAttribute,
    rowConfigAttribute,
    gridHeaderAttribute,
    requiredAttribute,
    readonlyAttribute,
    disabledAttribute,
    hideAttribute,
  ],
  validate(value, context) {
    const rawValue = z.string().optional().parse(value);
    const rows = parseGridRows(rawValue);
    const { minRows, maxRows } = context.entity.attributes.rowConfig ?? {};

    if (minRows !== undefined && rows.length < minRows) {
      throw new Error(
        `Need to have at least ${minRows} row${minRows > 1 ? "s" : ""}.`,
      );
    }

    if (maxRows !== undefined && rows.length > maxRows) {
      throw new Error(
        `Can't exceed maximum ${maxRows} row${maxRows > 1 ? "s" : ""}.`,
      );
    }

    const headers = Array.isArray(context.entity.attributes.gridHeaders)
      ? (context.entity.attributes.gridHeaders as GridValidationHeaderItem[])
      : [];

    const seenKeyValues = new Set<string>();
    for (const header of headers) {
      const normalizedKeyValue = header.keyValue?.trim();
      if (!normalizedKeyValue) {
        continue;
      }
      if (seenKeyValues.has(normalizedKeyValue)) {
        throw new Error(`Duplicate column keyValue: "${normalizedKeyValue}"`);
      }
      seenKeyValues.add(normalizedKeyValue);
    }

    const firstRequiredError = getFirstGridRequiredErrorMessage(rows, headers);
    if (firstRequiredError) {
      throw new Error(firstRequiredError);
    }

    return rawValue;
  },
});
