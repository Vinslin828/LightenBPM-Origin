import { z } from "zod";
import { createEntity } from "@coltorapps/builder";

import { widthAttribute } from "../../attributes/width/definition";
import { nameAttribute } from "../../attributes/name/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { decimalDigitsAttribute } from "../../attributes/decimal-digits/definition";
import { defaultNumberValueAttribute } from "../../attributes/default-number-value/definition";
import { currencyListAttribute } from "../../attributes/currency-list/definition";
import { currencyCodeAttribute } from "../../attributes/currency-code/definition";
import { EntityKey } from "@/types/form-builder";
import { flowTypeAttribute } from "../../attributes/flow-type/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { validatorAttribute } from "../../attributes/validator/definition";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { allowCurrencyChangeAttribute } from "../../attributes/allow-currency-change/definition";
import { hideAttribute } from "../../attributes/hide/definition";
import { dynamicStatusAttribute } from "../../attributes/dynamic-status/definition";

export const currencyFieldEntity = createEntity({
  name: EntityKey.currencyField,
  attributes: [
    widthAttribute,
    nameAttribute,
    labelAttribute,
    currencyListAttribute,
    currencyCodeAttribute,
    allowCurrencyChangeAttribute,
    decimalDigitsAttribute,
    defaultNumberValueAttribute,
    requiredAttribute,
    flowTypeAttribute,
    readonlyAttribute,
    validatorAttribute,
    disabledAttribute,
    readonlyAttribute,
    hideAttribute,
    dynamicStatusAttribute,
  ],
  validate(value, context) {
    // Value may be { value, currencyCode } object or plain number
    const isObjectFormat =
      typeof value === "object" && value !== null && "value" in value;
    const numericValue = isObjectFormat
      ? (value as { value?: unknown }).value
      : value;

    // Required check — mirrors the text-field pattern so the builder-level
    // validateEntitiesValues() catches empty required currency fields and
    // triggers the toast / red-border error flow.
    if (numericValue === undefined || numericValue === null) {
      if (context.entity.attributes.required) {
        z.number().parse(numericValue); // throws ZodError
      }
      return value as
        | { value: number | undefined; currencyCode: string }
        | undefined;
    }

    let schema = z.number();
    const decimalDigits = context.entity.attributes.decimalDigits;
    if (typeof decimalDigits === "number" && decimalDigits >= 0) {
      schema = schema.refine(
        (val) => Number.isFinite(val),
        "Value must be a number",
      );
    }
    // Enforce precision based on decimalDigits
    if (typeof decimalDigits === "number" && decimalDigits >= 0) {
      const factor = Math.pow(10, decimalDigits);
      schema = schema.refine(
        (val) =>
          Number.isFinite(val) && Math.round(val * factor) === val * factor,
        `Value must have at most ${decimalDigits} decimal places`,
      );
    }
    schema.parse(numericValue);

    return value as
      | { value: number | undefined; currencyCode: string }
      | undefined;
  },
  defaultValue(context) {
    const rawCurrencyCode = context.entity.attributes.currencyCode;
    let cc = "USD";
    if (typeof rawCurrencyCode === "string") {
      cc = rawCurrencyCode;
    } else if (
      rawCurrencyCode &&
      typeof rawCurrencyCode === "object" &&
      typeof (rawCurrencyCode as any).value === "string"
    ) {
      cc = (rawCurrencyCode as any).value;
    }

    const dv = context.entity.attributes.defaultValue;
    if (typeof dv === "number") {
      return { value: dv, currencyCode: cc };
    }
    if (dv && typeof dv === "object" && "value" in dv) {
      const val = (dv as { value?: unknown }).value;
      return typeof val === "number"
        ? { value: val, currencyCode: cc }
        : { value: undefined, currencyCode: cc };
    }
    return { value: undefined, currencyCode: cc };
  },
  childrenAllowed: true,
  attributesExtensions: {
    defaultValue: {
      validate(value, context) {
        const schema = z.preprocess(
          (val) => {
            if (val && typeof val === "object" && "value" in val) {
              return val;
            }
            if (typeof val === "number") {
              return { isReference: false, value: val };
            }
            if (typeof val === "string") {
              return { isReference: true, reference: val };
            }
            if (val === undefined || val === null) {
              return { isReference: false, value: undefined };
            }
            return val;
          },
          z.union([
            z.object({
              isReference: z.literal(true),
              reference: z.string().optional(),
              value: z.union([z.number(), z.string()]).optional(),
            }),
            z
              .object({
                isReference: z.literal(false).optional(),
                value: z.number().optional(),
              })
              .superRefine((val, ctx) => {
                let numberSchema = z.number();
                const decimalDigits = context.entity.attributes.decimalDigits;
                if (typeof decimalDigits === "number" && decimalDigits >= 0) {
                  const factor = Math.pow(10, decimalDigits);
                  numberSchema = numberSchema.refine(
                    (val) =>
                      Number.isFinite(val) &&
                      Math.round(val * factor) === val * factor,
                    `Value must have at most ${decimalDigits} decimal places`,
                  );
                }
                if (val.value !== undefined) {
                  numberSchema.parse(val.value);
                }
              }),
          ]),
        );
        return schema.parse(value);
      },
    },
  },
});
