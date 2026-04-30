import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const defaultArrayValueAttribute = createAttribute({
  name: "defaultValue",
  validate(value) {
    return z
      .array(
        z.union([
          z.string(),
          z.object({ value: z.string() }).passthrough(),
        ]),
      )
      .optional()
      .parse(value);
  },
});
