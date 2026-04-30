import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const containerColumnsAttribute = createAttribute({
  name: "containerColumns",
  validate(value) {
    return z.number().min(2).max(4).parse(value);
  },
});
