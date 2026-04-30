import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const hideAttribute = createAttribute({
  name: "hide",
  validate(value) {
    return z.boolean().default(false).parse(value);
  },
});
