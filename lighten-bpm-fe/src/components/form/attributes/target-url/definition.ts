import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const targetUrlAttribute = createAttribute({
  name: "targetUrl",
  validate(value) {
    return z.string().optional().parse(value);
  },
});
