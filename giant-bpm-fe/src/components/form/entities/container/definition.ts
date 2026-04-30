import { z } from "zod";
import { createAttribute, createEntity } from "@coltorapps/builder";

import { widthAttribute } from "../../attributes/width/definition";
import { containerColumnsAttribute } from "../../attributes/container-columns/definition";
import { EntityKey } from "@/types/form-builder";
import { nameAttribute } from "../../attributes/name/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { hideAttribute } from "../../attributes/hide/definition";

// 無右側UI
export const columnWidthsAttribute = createAttribute({
  name: "columnWidths",
  validate(value) {
    return z.array(z.number()).optional().parse(value);
  },
});

// 儲存子元件對應的格子索引 { [childEntityId]: slotIndex }
export const slotMappingAttribute = createAttribute({
  name: "slotMapping",
  validate(value) {
    return z.record(z.string(), z.number()).optional().parse(value);
  },
});

export const containerEntity = createEntity({
  name: EntityKey.container,
  attributes: [
    widthAttribute,
    containerColumnsAttribute,
    columnWidthsAttribute,
    slotMappingAttribute,
    nameAttribute,
    labelAttribute,
    requiredAttribute,
    disabledAttribute,
    readonlyAttribute,
    hideAttribute,
  ],
  childrenAllowed: true,
  validate(value) {
    return z.string().optional().parse(value);
  },
});
