import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const multipleSelectionAttribute = createAttribute({
  name: "multipleSelection",
  validate(value) {
    return z.boolean().optional().parse(value);
  },
});
