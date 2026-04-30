import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const labelAttribute = createAttribute({
  name: "label",
  validate(value) {
    const referenceSchema = z.object({
      isReference: z.literal(true),
      reference: z.string().optional(),
      value: z.string().optional(),
    });
    const valueSchema = z.object({
      isReference: z.literal(false).optional(),
      value: z.string().min(1).max(255),
    });
    const schema = z.union([referenceSchema, valueSchema]);
    return schema.parse(value);
  },
});
