import { z } from "zod";
import { createAttribute } from "@coltorapps/builder";

export const currencyListAttribute = createAttribute({
  name: "currencyList",
  validate(value) {
    return z.string().min(1, "Currency list is required").parse(value);
  },
});
