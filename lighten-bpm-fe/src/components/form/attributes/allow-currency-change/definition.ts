import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const allowCurrencyChangeAttribute = createAttribute({
  name: "allowCurrencyChange",
  validate(value) {
    return z.boolean().optional().parse(value);
  },
});
