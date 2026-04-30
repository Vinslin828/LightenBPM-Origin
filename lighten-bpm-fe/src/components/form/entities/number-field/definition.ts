import { z } from "zod";

import { createEntity } from "@coltorapps/builder";

import { widthAttribute } from "../../attributes/width/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { placeholderAttribute } from "../../attributes/placeholder/definition";
import { defaultNumberValueAttribute } from "../../attributes/default-number-value/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { minAttribute } from "../../attributes/min/definition";
import { maxAttribute } from "../../attributes/max/definition";
import { stepAttribute } from "../../attributes/step/definition";
import { nameAttribute } from "../../attributes/name/definition";

import { expressionAttribute } from "../../attributes/expression/definition";
import { decimalDigitsAttribute } from "../../attributes/decimal-digits/definition";
import { EntityKey } from "@/types/form-builder";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { validatorAttribute } from "../../attributes/validator/definition";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { hideAttribute } from "../../attributes/hide/definition";

export const numberFieldEntity = createEntity({
  name: EntityKey.numberField,
  attributes: [
    /** general */
    widthAttribute,
    nameAttribute,
    labelAttribute,
    defaultNumberValueAttribute,
    // placeholderAttribute,
    decimalDigitsAttribute,
    requiredAttribute,

    /** validation */
    minAttribute,
    maxAttribute,

    /** condition */
    // expressionAttribute,

    stepAttribute,
    readonlyAttribute,

    validatorAttribute,

    disabledAttribute,
    hideAttribute,
  ],
  validate(value, context) {
    let schema = z.number();

    // Apply min/max constraints if provided
    if (context.entity.attributes.min !== undefined) {
      schema = schema.min(context.entity.attributes.min);
    }
    if (context.entity.attributes.max !== undefined) {
      schema = schema.max(context.entity.attributes.max);
    }
    if (
      context.entity.attributes.decimalDigits !== undefined &&
      value?.toString()?.includes(".")
    ) {
      schema = schema.refine((val) => {
        const parts = val.toString().split(".");
        // If there's no decimal part, it's valid
        if (!parts[1]) {
          return true;
        }

        return parts[1].length <= context.entity.attributes.decimalDigits!;
      }, `Maximum ${context.entity.attributes.decimalDigits} decimal places allowed.`);
    }

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
