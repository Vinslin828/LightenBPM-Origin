import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const dynamicStatusAttribute = createAttribute({
  name: "dynamicStatus",
  validate(value) {
    return z
      .object({
        enabled: z.boolean().optional(),
        expression: z.string().optional(),
      })
      .optional()
      .parse(value);
  },
});
