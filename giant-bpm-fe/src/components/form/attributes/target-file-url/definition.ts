import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const targetFileUrlAttribute = createAttribute({
  name: "targetFileUrl",
  validate(value) {
    return z.string().max(2048).optional().parse(value);
  },
});
