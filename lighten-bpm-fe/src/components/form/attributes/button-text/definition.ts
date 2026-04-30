import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const buttonTextAttribute = createAttribute({
  name: "buttonText",
  validate(value) {
    return z.string().max(255).optional().parse(value);
  },
});
