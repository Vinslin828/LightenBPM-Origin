import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const apiCodeAttribute = createAttribute({
  name: "apiCode",
  validate(value) {
    return z
      .object({
        returnType: z.enum(["text", "grid", "richText"]),
        code: z.string(),
      })
      .optional()
      .parse(value);
  },
});
