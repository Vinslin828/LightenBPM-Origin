import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const defaultOptionValueAttribute = createAttribute({
  name: "defaultValue",
  validate(value) {
    const schema = z.preprocess(
      (val) => {
        if (val && typeof val === "object" && "isReference" in val) {
          return val;
        }
        if (typeof val === "string") {
          return { isReference: false, value: val };
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
          value: z.string().optional(),
        }),
        z.object({
          isReference: z.literal(false).optional(),
          value: z.string().max(255).optional(),
        }),
      ]),
    );
    return schema.parse(value);
  },
});
