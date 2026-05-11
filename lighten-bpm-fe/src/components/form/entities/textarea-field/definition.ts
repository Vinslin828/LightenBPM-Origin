import { z } from "zod";

import { createEntity } from "@coltorapps/builder";

import { defaultStringValueAttribute } from "../../attributes/default-string-value/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { placeholderAttribute } from "../../attributes/placeholder/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { widthAttribute } from "../../attributes/width/definition";
import { nameAttribute } from "../../attributes/name/definition";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { flowTypeAttribute } from "../../attributes/flow-type/definition";
import { EntityKey } from "@/types/form-builder";
import { validatorAttribute } from "../../attributes/validator/definition";
import { hideAttribute } from "../../attributes/hide/definition";
import { dynamicStatusAttribute } from "../../attributes/dynamic-status/definition";

export const textareaFieldEntity = createEntity({
  name: EntityKey.textareaField,
  attributes: [
    nameAttribute,
    widthAttribute,
    labelAttribute,
    placeholderAttribute,
    defaultStringValueAttribute,
    requiredAttribute,
    disabledAttribute,
    readonlyAttribute,
    flowTypeAttribute,
    validatorAttribute,
    hideAttribute,
    dynamicStatusAttribute,
  ],
  validate(value, context) {
    console.debug("textarea validation");
    const schema = z.string().max(1000);

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
      const val = (dv as { value?: unknown }).value;
      return typeof val === "string" ? val || undefined : undefined;
    }
    return undefined;
  },
});
