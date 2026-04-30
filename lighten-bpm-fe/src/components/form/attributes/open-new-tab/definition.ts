import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const openNewTabAttribute = createAttribute({
  name: "openNewTab",
  validate(value) {
    return z.boolean().optional().parse(value);
  },
});
