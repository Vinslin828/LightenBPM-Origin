import { z } from "zod";

import { createEntity } from "@coltorapps/builder";

import { widthAttribute } from "../../attributes/width/definition";
import { nameAttribute } from "../../attributes/name/definition";
import { labelAttribute } from "../../attributes/label/definition";
import { optionsAttribute } from "../../attributes/options/definition";
import { flowTypeAttribute } from "../../attributes/flow-type/definition";
import { requiredAttribute } from "../../attributes/required/definition";
import { EntityKey } from "@/types/form-builder";
import { validatorAttribute } from "../../attributes/validator/definition";
import { defaultMultiOptionValueAttribute } from "../../attributes/default-multi-option-value/definition";
import { disabledAttribute } from "../../attributes/disabled/definition";
import { readonlyAttribute } from "../../attributes/readonly/definition";
import { hideAttribute } from "../../attributes/hide/definition";

export const checkboxFieldEntity = createEntity({
  name: EntityKey.checkboxField,
  attributes: [
    widthAttribute,
    nameAttribute,
    labelAttribute,
    defaultMultiOptionValueAttribute,
    optionsAttribute,
    flowTypeAttribute,
    requiredAttribute,
    validatorAttribute,
    disabledAttribute,
    readonlyAttribute,
    hideAttribute,
  ],
  validate(value, context) {
    const optionValues =
      context.entity.attributes.options?.map((option) => option.value) ?? [];

    const schema =
      optionValues.length > 0
        ? z.array(z.enum(optionValues as [string, ...string[]]))
        : z.array(z.string());
    const optionalSchema = schema.optional();

    if (context.entity.attributes.required) {
      return schema.min(1, "At least one option must be selected").parse(value);
    }

    return optionalSchema.parse(value);
  },
  defaultValue(context) {
    const dv = context.entity.attributes.defaultValue;
    const parseStringArray = (raw: unknown): string[] | null => {
      if (typeof raw !== "string") return null;
      try {
        const parsed = JSON.parse(raw);
        if (
          Array.isArray(parsed) &&
          parsed.every((item) => typeof item === "string")
        ) {
          return parsed;
        }
      } catch {
        return null;
      }
      return null;
    };

    if (dv && typeof dv === "object" && "isReference" in dv) {
      const record = dv as {
        isReference?: boolean;
        reference?: unknown;
        value?: unknown;
      };
      if (record.value !== undefined) {
        if (Array.isArray(record.value)) {
          const normalized = record.value
            .map((item) => {
              if (typeof item === "string") return item;
              if (item && typeof item === "object" && "value" in item) {
                const val = (item as { value?: unknown }).value;
                return typeof val === "string" ? val : undefined;
              }
              return undefined;
            })
            .filter((val): val is string => typeof val === "string");
          return normalized;
        }
        if (typeof record.value === "string") {
          return parseStringArray(record.value) ?? [record.value];
        }
        return undefined;
      }
      if (record.isReference) {
        const parsed = parseStringArray(record.reference);
        return parsed ?? undefined;
      }
    }
    if (Array.isArray(dv)) {
      return dv.filter((item): item is string => typeof item === "string");
    }

    if (typeof dv?.value === "string") {
      return parseStringArray(dv.value) ?? [dv.value];
    }
    if (!Array.isArray(dv?.value)) return undefined;

    const normalized = dv.value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "value" in item) {
          const val = (item as { value?: unknown }).value;
          return typeof val === "string" ? val : undefined;
        }
        return undefined;
      })
      .filter((val): val is string => typeof val === "string");

    return normalized.length > 0 ? normalized : undefined;
  },
});
