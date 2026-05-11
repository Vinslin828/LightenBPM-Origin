import { z } from "zod";
import { createEntity } from "@coltorapps/builder";

import { widthAttribute } from "../../attributes/width/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { defaultStringValueAttribute } from "../../attributes/default-string-value/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { optionsAttribute } from "../../attributes/options/definition";
import { groupDirectionAttribute } from "../../attributes/group-direction/definition";
import { flowTypeAttribute } from "../../attributes/flow-type/definition";
import { EntityKey } from "@/types/form-builder";
import { nameAttribute } from "../../attributes/name/definition";
import { defaultOptionValueAttribute } from "../../attributes/default-option-value/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { validatorAttribute } from "../../attributes/validator/definition";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { hideAttribute } from "../../attributes/hide/definition";
import { dynamicStatusAttribute } from "../../attributes/dynamic-status/definition";

export const radioButtonEntity = createEntity({
  name: EntityKey.radioButton,
  attributes: [
    widthAttribute,
    nameAttribute,
    labelAttribute,
    defaultOptionValueAttribute,
    readonlyAttribute,
    requiredAttribute,
    optionsAttribute,
    groupDirectionAttribute,
    flowTypeAttribute,
    validatorAttribute,
    disabledAttribute,
    hideAttribute,
    dynamicStatusAttribute,
  ],
  validate(value, context) {
    const optionValues =
      context.entity.attributes.options?.map((option) => option.value) ?? [];

    if (optionValues.length > 0) {
      const enumSchema = z.enum(optionValues as [string, ...string[]]);

      if (context.entity.attributes.required) {
        return enumSchema.parse(value);
      }

      return enumSchema.optional().parse(value);
    }

    const schema = z.string().max(255);
    return context.entity.attributes.required
      ? schema.parse(value)
      : schema.optional().parse(value);
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
