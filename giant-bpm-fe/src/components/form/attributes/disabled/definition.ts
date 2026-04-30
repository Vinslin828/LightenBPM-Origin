import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const disabledAttribute = createAttribute({
  name: "disabled",
  validate(value) {
    return z.boolean().default(false).parse(value);
  },
});
