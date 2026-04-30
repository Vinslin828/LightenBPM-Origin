import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const richTextAttribute = createAttribute({
  name: "richText",
  validate(value) {
    return z.string().optional().parse(value);
  },
});
