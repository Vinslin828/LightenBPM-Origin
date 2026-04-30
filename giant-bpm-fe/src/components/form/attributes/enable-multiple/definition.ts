import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const enableMultipleAttribute = createAttribute({
  name: "enableMultiple",
  validate(value) {
    return z.boolean().optional().parse(value);
  },
});
