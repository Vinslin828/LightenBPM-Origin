import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const supportedFormatsAttribute = createAttribute({
  name: "supportedFormats",
  validate(value) {
    return z.array(z.string()).optional().parse(value);
  },
});
