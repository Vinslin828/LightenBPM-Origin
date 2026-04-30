import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const validatorAttribute = createAttribute({
  name: "validator",
  validate(value) {
    const schema = z
      .object({
        required: z.boolean().optional(),
        validatorId: z.string().optional(),
        code: z.string().optional(),
        isApi: z.boolean().optional(),
      })
      .default({ required: false });
    return schema.parse(value);
  },
});
