import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const defaultStringValueAttribute = createAttribute({
  name: "defaultValue",
  validate(value) {
    const preprocess = (val: unknown) => {
      if (typeof val === "string") {
        return { isReference: false, value: val };
      }
      if (typeof val === "number") {
        return { isReference: false, value: String(val) };
      }
      if (val === undefined || val === null) {
        return { isReference: false, value: undefined };
      }
      return val;
    };
    const referenceSchema = z.object({
      isReference: z.literal(true),
      reference: z.string().optional(),
      value: z.string().optional(),
    });
    const valueSchema = z.object({
      isReference: z.literal(false).optional(),
      value: z.string().max(255).optional(),
    });
    const schema = z.preprocess(
      preprocess,
      z.union([referenceSchema, valueSchema]),
    );
    return schema.parse(value);
  },
});
