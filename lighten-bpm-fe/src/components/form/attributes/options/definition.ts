import { z } from "zod";

import { createAttribute } from "@coltorapps/builder";

export const optionsAttribute = createAttribute({
  name: "options",
  validate(value) {
    const shcmea = z.array(
      z.object({
        label: z.string().min(1),
        value: z.string().min(1),
        key: z.string().min(1),
      }),
    );
    return shcmea.parse(value);
  },
});
