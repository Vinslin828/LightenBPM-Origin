import { z } from "zod";

import { createEntity } from "@coltorapps/builder";

import { defaultStringValueAttribute } from "../../attributes/default-string-value/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { placeholderAttribute } from "../../attributes/placeholder/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { widthAttribute } from "../../attributes/width/definition";
import { nameAttribute } from "../../attributes/name/definition";
import { inputTypeAttribute } from "../../attributes/input-type/definition";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { EntityKey } from "@/types/form-builder";
import { flowTypeAttribute } from "../../attributes/flow-type/definition";
import { validatorAttribute } from "../../attributes/validator/definition";
import { hideAttribute } from "../../attributes/hide/definition";
import { dynamicStatusAttribute } from "../../attributes/dynamic-status/definition";

export const textFieldEntity = createEntity({
  name: EntityKey.textField,
  attributes: [
    widthAttribute,
    nameAttribute,
    labelAttribute,
    inputTypeAttribute,
    placeholderAttribute,
    disabledAttribute,
    readonlyAttribute,
    defaultStringValueAttribute,
    requiredAttribute,
    flowTypeAttribute,
    validatorAttribute,
    hideAttribute,
    dynamicStatusAttribute,
  ],
  validate(value, context) {
    const schema = z.string().max(255);

    if (context.entity.attributes.required) {
      return schema.min(1).parse(value);
    }

    return schema.optional().parse(value);
  },
  defaultValue(context) {
    const dv = context.entity.attributes.defaultValue;
    if (typeof dv === "string") {
      return dv || undefined;
    }
    if (dv && typeof dv === "object" && "value" in dv) {
      const defaultValue = dv as { isReference?: boolean; value?: unknown };
      if (defaultValue.isReference) {
        return undefined;
      }
      const val = defaultValue.value;
      if (typeof val === "string") {
        return val || undefined;
      }
      if (typeof val === "number") {
        return String(val);
      }
      return undefined;
    }
    return undefined;
  },
  shouldBeProcessed: () => true,
});
