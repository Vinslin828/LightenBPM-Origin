import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const defaultBooleanValueAttribute = createAttribute({
  name: "defaultValue",
  validate(value) {
    const preprocess = (val: unknown) => {
      if (val && typeof val === "object" && "isReference" in val) {
        return val;
      }
      if (typeof val === "boolean") {
        return { isReference: false, value: val };
      }
      if (typeof val === "string") {
        return { isReference: true, reference: val };
      }
      if (val === undefined || val === null) {
        return { isReference: false, value: undefined };
      }
      return val;
    };
    const schema = z.preprocess(
      preprocess,
      z.union([
        z.object({
          isReference: z.literal(true),
          reference: z.string().optional(),
          value: z.union([z.boolean(), z.string()]).optional(),
        }),
        z.object({
          isReference: z.literal(false).optional(),
          value: z.boolean().optional(),
        }),
      ]),
    );
    return schema.parse(value);
  },
});
