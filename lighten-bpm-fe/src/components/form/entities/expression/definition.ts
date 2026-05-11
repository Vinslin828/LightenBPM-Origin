import { z } from "zod";
import { createEntity } from "@coltorapps/builder";

import { EntityKey } from "@/types/form-builder";
import { widthAttribute } from "../../attributes/width/definition";
import { nameAttribute } from "../../attributes/name/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { expressionAttribute } from "../../attributes/expression/definition";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { hideAttribute } from "../../attributes/hide/definition";
import { dynamicStatusAttribute } from "../../attributes/dynamic-status/definition";

export const expressionFieldEntity = createEntity({
  name: EntityKey.expressionField,
  attributes: [
    widthAttribute,
    nameAttribute,
    labelAttribute,
    expressionAttribute,
    requiredAttribute,
    disabledAttribute,
    readonlyAttribute,
    hideAttribute,
    dynamicStatusAttribute,
  ],
  validate(value) {
    return z.any().optional().parse(value);
  },
  defaultValue() {
    return undefined;
  },
});
