import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const defaultMultiOptionValueAttribute = createAttribute({
  name: "defaultValue",
  validate(value) {
    const optionSchema = z.object({
      label: z.string().max(255),
      value: z.string().max(255),
      key: z.string().min(1).max(255),
    });
    const schema = z.preprocess(
      (val) => {
        if (val && typeof val === "object" && "isReference" in val) {
          const record = val as { isReference?: boolean; value?: unknown };
          if (record.isReference === false && record.value === null) {
            return { ...record, value: undefined };
          }
          return val;
        }
        if (Array.isArray(val)) {
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
          value: z.union([z.array(optionSchema), z.string()]).optional(),
        }),
        z.object({
          isReference: z.literal(false).optional(),
          value: z.array(optionSchema).optional(),
        }),
      ]),
    );
    return schema.parse(value);
  },
});
