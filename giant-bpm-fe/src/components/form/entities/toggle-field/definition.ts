import { z } from "zod";
import { createEntity } from "@coltorapps/builder";

import { widthAttribute } from "../../attributes/width/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { defaultBooleanValueAttribute } from "../../attributes/default-boolean-value/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { EntityKey } from "@/types/form-builder";
import { nameAttribute } from "../../attributes/name/definition";
import { flowTypeAttribute } from "../../attributes/flow-type/definition";
import { validatorAttribute } from "../../attributes/validator/definition";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { hideAttribute } from "../../attributes/hide/definition";

export const toggleFieldEntity = createEntity({
  name: EntityKey.toggleField,
  attributes: [
    widthAttribute,
    nameAttribute,
    labelAttribute,
    defaultBooleanValueAttribute,
    requiredAttribute,
    flowTypeAttribute,
    validatorAttribute,
    disabledAttribute,
    readonlyAttribute,
    hideAttribute,
  ],
  validate(value, context) {
    let schema = z.boolean();

    if (context.entity.attributes.required) {
      return z.literal(true).parse(value);
    }

    return schema.parse(value);
  },
  defaultValue(context) {
    const dv = context.entity.attributes.defaultValue;
    if (typeof dv === "boolean") {
      return dv;
    }
    if (dv && typeof dv === "object" && "value" in dv) {
      const val = (dv as { value?: unknown }).value;
      return typeof val === "boolean" ? val : undefined;
    }
    return undefined;
  },
});
