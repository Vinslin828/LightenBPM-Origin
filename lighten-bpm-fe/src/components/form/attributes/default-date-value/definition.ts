import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const defaultDateValueAttribute = createAttribute({
  name: "defaultValue",
  validate(value) {
    const preprocess = (val: unknown) => {
      if (val && typeof val === "object" && "isReference" in val) {
        return val;
      }
      if (val === undefined || val === null || val === "") {
        return { isReference: false, value: undefined };
      }
      if (val instanceof Date) {
        return { isReference: false, value: val.getTime() };
      }
      if (typeof val === "number") {
        return { isReference: false, value: val };
      }
      if (typeof val === "string") {
        const num = Number(val);
        if (!Number.isNaN(num)) {
          return { isReference: false, value: num };
        }
        const parsed = new Date(val);
        const timestamp = parsed.getTime();
        if (!Number.isNaN(timestamp)) {
          return { isReference: false, value: timestamp };
        }
        return { isReference: true, reference: val };
      }
      return val;
    };
    const referenceSchema = z.object({
      isReference: z.literal(true),
      reference: z.string().optional(),
      value: z.union([z.number(), z.string()]).optional(),
    });
    const valueSchema = z.object({
      isReference: z.literal(false).optional(),
      value: z.number().optional(),
    });
    const schema = z.preprocess(preprocess, z.union([referenceSchema, valueSchema]));
    return schema.parse(value);
  },
});
