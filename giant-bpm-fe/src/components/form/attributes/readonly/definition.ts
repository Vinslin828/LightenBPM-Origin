import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const readonlyAttribute = createAttribute({
  name: "readonly",
  validate(value) {
    return z.boolean().default(false).parse(value);
  },
});
