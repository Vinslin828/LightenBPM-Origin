import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const flowTypeAttribute = createAttribute({
  name: "flowType",
  validate(value) {
    return z
      .array(z.enum(["split", "recursive", "others"]))
      .optional()
      .catch(["split"])
      .parse(value);
  },
});
