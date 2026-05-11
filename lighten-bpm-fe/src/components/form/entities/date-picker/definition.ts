import { z } from "zod";

import { createEntity } from "@coltorapps/builder";

import { defaultDateValueAttribute } from "../../attributes/default-date-value/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { widthAttribute } from "../../attributes/width/definition";
import { nameAttribute } from "../../attributes/name/definition";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { flowTypeAttribute } from "../../attributes/flow-type/definition";
import { EntityKey } from "@/types/form-builder";
import { dateSubtypeAttribute } from "../../attributes/date-subtype/definition";
import { validatorAttribute } from "../../attributes/validator/definition";
import { hideAttribute } from "../../attributes/hide/definition";
import { dynamicStatusAttribute } from "../../attributes/dynamic-status/definition";

export const datePickerFieldEntity = createEntity({
  name: EntityKey.datePickerField,
  attributes: [
    widthAttribute,
    nameAttribute,
    labelAttribute,
    dateSubtypeAttribute,
    requiredAttribute,
    disabledAttribute,
    readonlyAttribute,
    flowTypeAttribute,
    defaultDateValueAttribute,
    validatorAttribute,
    hideAttribute,
    dynamicStatusAttribute,
  ],
  validate(value, context) {
    const schema = z.number().int();

    if (context.entity.attributes.required) {
      return schema.parse(value);
    }

    return schema.optional().parse(value);
  },
  defaultValue(context) {
    const dv = context.entity.attributes.defaultValue;
    if (typeof dv === "number") {
      return dv;
    }
    if (dv && typeof dv === "object" && "value" in dv) {
      const val = (dv as { value?: unknown }).value;
      return typeof val === "number" ? val : undefined;
    }
    return undefined;
  },
});
