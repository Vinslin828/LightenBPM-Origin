import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const fileSizeAttribute = createAttribute({
  name: "fileSize",
  validate(value) {
    return z.number().optional().parse(value);
  },
});
