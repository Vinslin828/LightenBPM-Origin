import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const isButtonAttribute = createAttribute({
  name: "isButton",
  validate(value) {
    return z.boolean().optional().parse(value);
  },
});
